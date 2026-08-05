using Common.Library;
using OrderService.Entities;
using OrderService.Interfaces;
using OrderService.Projections;

namespace OrderService.Services.Catalog;

/// <summary>
/// Resolves modifier selections against the POS read-model projection at checkout time.
///
/// Used to be a synchronous HTTP call to catalog's /public/menu - the order service had no
/// modifier data of its own, because modifier rows were seeded by script and fired no events.
/// Now that catalog publishes <c>MenuItemModifiersChanged</c> and <c>PosReadModelProjector</c>
/// folds it into <c>PosCatalogItem.Modifiers</c>, this reads that projection instead: no
/// cross-service call at checkout, and no more "menu is temporarily unavailable" failure mode
/// when catalog itself is down.
///
/// Still not silently tolerant of a missing item, though for a different reason now - an id
/// with no matching row just isn't in the returned dictionary, and <c>DinerOrderService.Resolve</c>
/// treats that the same way it always has: reject the line, don't guess.
/// </summary>
public class CatalogMenuClient : ICatalogMenuClient
{
    private readonly IRepository<PosCatalogItem> _posCatalog;

    public CatalogMenuClient(IRepository<PosCatalogItem> posCatalog)
    {
        _posCatalog = posCatalog;
    }

    public async Task<IReadOnlyDictionary<Guid, MenuItemModifiers>> GetModifiersAsync(
        IEnumerable<Guid> menuItemIds, CancellationToken ct = default)
    {
        var ids = menuItemIds.ToHashSet();
        if (ids.Count == 0) return new Dictionary<Guid, MenuItemModifiers>();

        // Tenant scoping comes for free from PosCatalogItem's EF query filter - no explicit
        // restaurantId/locationId predicate needed, unlike the old HTTP call.
        var items = await _posCatalog.GetAllAsync(i => ids.Contains(i.Id));

        return items.ToDictionary(
            i => i.Id,
            i => new MenuItemModifiers(
                i.Name,
                i.Modifiers.Select(g => new ModifierGroupInfo(
                    g.Id, g.Name, g.SelectionType, g.Required,
                    g.Options.ToDictionary(
                        o => o.Id,
                        o => new SelectedModifier(g.Id, g.Name, o.Id, o.Name, o.PriceDelta))))
                    .ToList()));
    }
}
