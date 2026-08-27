using CatalogService.Data;
using CatalogService.Entities;
using Microsoft.EntityFrameworkCore;

namespace CatalogService.Features.PublicMenu;

public interface IPublicMenuService
{
    Task<PublicMenuDto> GetMenuAsync(string restaurantId, string locationId, CancellationToken ct = default);
}

/// <summary>
/// Anonymous menu reads for the diner surface.
///
/// <para><b>Why this ignores query filters.</b> <see cref="CatalogDbContext"/> scopes every
/// <c>ITenantEntity</c> to the ambient tenant, which <c>TenantMiddleware</c> resolves from
/// <c>X-Restaurant-Id</c>/<c>X-Location-Id</c> - and which falls back to a hardcoded default
/// when those headers are absent. An anonymous caller has no token to derive them from, so
/// relying on the ambient tenant here would mean an unauthenticated request with no headers
/// silently returns some other restaurant's menu. Instead the tenant comes from explicit,
/// required route arguments and is applied as an ordinary predicate.</para>
///
/// <para><b>Consequence:</b> every query in this class MUST carry its own RestaurantId and
/// LocationId predicate. There is no safety net behind it. Do not add a method here that
/// reads a tenant-scoped table without one.</para>
/// </summary>
public class PublicMenuService : IPublicMenuService
{
    private readonly CatalogDbContext _db;

    public PublicMenuService(CatalogDbContext db) => _db = db;

    public async Task<PublicMenuDto> GetMenuAsync(
        string restaurantId,
        string locationId,
        CancellationToken ct = default)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(restaurantId);
        ArgumentException.ThrowIfNullOrWhiteSpace(locationId);

        // Sellable only. IsAvailable is the staff-facing switch; Quantity > 0 is the stock
        // reality. MenuStockService keeps them in step, but a diner should never be offered
        // something the kitchen can't make, so require both rather than trusting the fold.
        var items = await _db.MenuItems
            .IgnoreQueryFilters()
            .AsNoTracking()
            .Where(m => m.RestaurantId == restaurantId
                     && m.LocationId == locationId
                     && m.IsAvailable
                     && m.Quantity > 0)
            .OrderBy(m => m.Category)
            .ThenBy(m => m.Name)
            .Select(m => new { m.Id, m.Name, m.Description, m.Price, m.Category })
            .ToListAsync(ct);

        if (items.Count == 0)
            return new PublicMenuDto(restaurantId, locationId, []);

        var itemIds = items.Select(i => i.Id).ToList();

        var groups = await _db.ModifierGroups
            .IgnoreQueryFilters()
            .AsNoTracking()
            .Where(g => g.RestaurantId == restaurantId
                     && g.LocationId == locationId
                     && itemIds.Contains(g.MenuItemId))
            .OrderBy(g => g.DisplayOrder)
            .ThenBy(g => g.Name)
            .Select(g => new
            {
                g.Id,
                g.MenuItemId,
                g.Name,
                g.SelectionType,
                g.Required,
                Options = g.Options
                    .OrderBy(o => o.DisplayOrder)
                    .ThenBy(o => o.Name)
                    .Select(o => new PublicModifierOptionDto(o.Id, o.Name, o.PriceDelta, o.IsDefault))
                    .ToList()
            })
            .ToListAsync(ct);

        var groupsByItem = groups
            .GroupBy(g => g.MenuItemId)
            .ToDictionary(
                g => g.Key,
                g => (IReadOnlyList<PublicModifierGroupDto>)g
                    .Select(x => new PublicModifierGroupDto(
                        x.Id, x.Name, x.SelectionType.ToString(), x.Required, x.Options))
                    .ToList());

        // MenuCategories.All is the canonical order the POS uses; anything not in it (legacy
        // or hand-entered) sorts after, alphabetically, rather than being dropped.
        var categories = items
            .GroupBy(i => i.Category)
            .OrderBy(g => CategoryRank(g.Key))
            .ThenBy(g => g.Key)
            .Select(g => new PublicMenuCategoryDto(
                g.Key,
                g.Select(i => new PublicMenuItemDto(
                        i.Id,
                        i.Name,
                        i.Description,
                        i.Price,
                        groupsByItem.TryGetValue(i.Id, out var mg) ? mg : []))
                    .ToList()))
            .ToList();

        return new PublicMenuDto(restaurantId, locationId, categories);
    }

    private static int CategoryRank(string category)
    {
        for (var i = 0; i < MenuCategories.All.Count; i++)
        {
            if (string.Equals(MenuCategories.All[i], category, StringComparison.OrdinalIgnoreCase))
                return i;
        }

        return int.MaxValue;
    }
}
