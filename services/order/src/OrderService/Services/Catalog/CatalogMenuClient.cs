using System.Net.Http.Json;
using OrderService.Entities;
using OrderService.Exceptions;
using OrderService.Interfaces;

namespace OrderService.Services.Catalog;

/// <summary>
/// Resolves modifier selections against catalog at checkout time.
///
/// Why an HTTP call, in a platform that is otherwise event-driven: the order service has no
/// modifier data at all. <c>PosCatalogItem</c> projects name, price, stock and availability -
/// nothing about modifier groups - and a diner line's price is base + deltas. The deltas have
/// to come from somewhere authoritative, and it cannot be the request body: a client that
/// prices its own line can send a delta of -100.
///
/// A projection would be the house style, but modifier rows are currently seeded by script
/// straight into catalog's tables, so no events ever fire for them and a projection would
/// start life empty with no way to backfill. Revisit when modifiers get a real authoring UI
/// that publishes events - see task in DINER_ORDERING_PLAN.md.
///
/// Failure is not silently tolerated. If catalog is unreachable we cannot price the order, so
/// checkout fails rather than falling back to whatever the client claimed.
/// </summary>
public class CatalogMenuClient : ICatalogMenuClient
{
    private readonly HttpClient _http;
    private readonly ILogger<CatalogMenuClient> _logger;

    public CatalogMenuClient(HttpClient http, ILogger<CatalogMenuClient> logger)
    {
        _http = http;
        _logger = logger;
    }

    public async Task<IReadOnlyDictionary<Guid, MenuItemModifiers>> GetModifiersAsync(
        string restaurantId, string locationId, CancellationToken ct = default)
    {
        PublicMenuResponse? menu;
        try
        {
            menu = await _http.GetFromJsonAsync<PublicMenuResponse>(
                $"public/menu?restaurantId={Uri.EscapeDataString(restaurantId)}" +
                $"&locationId={Uri.EscapeDataString(locationId)}", ct);
        }
        catch (Exception ex) when (ex is HttpRequestException or TaskCanceledException)
        {
            _logger.LogError(ex, "Could not reach catalog to price modifiers for {RestaurantId}/{LocationId}",
                restaurantId, locationId);
            throw new BusinessRuleException("The menu is temporarily unavailable. Please try again.");
        }

        if (menu is null) return new Dictionary<Guid, MenuItemModifiers>();

        return menu.Categories
            .SelectMany(c => c.Items)
            .ToDictionary(
                i => i.Id,
                i => new MenuItemModifiers(
                    i.Name,
                    i.ModifierGroups.Select(g => new ModifierGroupInfo(
                        g.Id, g.Name, g.SelectionType, g.Required,
                        g.Options.ToDictionary(
                            o => o.Id,
                            o => new SelectedModifier(g.Id, g.Name, o.Id, o.Name, o.PriceDelta))))
                        .ToList()));
    }

    // Mirrors CatalogService.Features.PublicMenu's DTOs. Deliberately re-declared rather than
    // shared: this is a wire contract between two services, and the day catalog reshapes its
    // internal DTO we want a deserialisation change here to be a decision, not a silent break.
    private record PublicMenuResponse(List<PublicMenuCategory> Categories);
    private record PublicMenuCategory(List<PublicMenuItem> Items);
    private record PublicMenuItem(Guid Id, string Name, decimal Price, List<PublicModifierGroup> ModifierGroups);
    private record PublicModifierGroup(
        Guid Id, string Name, string SelectionType, bool Required, List<PublicModifierOption> Options);
    private record PublicModifierOption(Guid Id, string Name, decimal PriceDelta, bool IsDefault);
}
