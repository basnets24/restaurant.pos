using OrderService.Entities;

namespace OrderService.Interfaces;

/// <summary>Resolves menu items' modifier groups so the order service can price a diner's
/// selections itself instead of trusting the request body. Backed by the POS read-model
/// projection (<c>PosCatalogItem.Modifiers</c>), not a live call to catalog - see
/// <c>CatalogMenuClient</c>.</summary>
public interface ICatalogMenuClient
{
    /// <summary>The requested menu items, keyed by id, with their modifier groups and each
    /// option already shaped as a snapshottable selection. Items with no modifiers configured
    /// are still present, with an empty group list.</summary>
    Task<IReadOnlyDictionary<Guid, MenuItemModifiers>> GetModifiersAsync(
        IEnumerable<Guid> menuItemIds, CancellationToken ct = default);
}

public record MenuItemModifiers(string Name, IReadOnlyList<ModifierGroupInfo> Groups);

public record ModifierGroupInfo(
    Guid Id,
    string Name,
    string SelectionType,
    bool Required,
    IReadOnlyDictionary<Guid, SelectedModifier> Options);
