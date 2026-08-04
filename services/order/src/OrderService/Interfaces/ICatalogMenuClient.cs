using OrderService.Entities;

namespace OrderService.Interfaces;

/// <summary>Reads catalog's public menu so the order service can price modifier selections
/// itself instead of trusting the request body.</summary>
public interface ICatalogMenuClient
{
    /// <summary>Every orderable item at this location, keyed by menu item id, with its
    /// modifier groups and each option already shaped as a snapshottable selection.</summary>
    Task<IReadOnlyDictionary<Guid, MenuItemModifiers>> GetModifiersAsync(
        string restaurantId, string locationId, CancellationToken ct = default);
}

public record MenuItemModifiers(string Name, IReadOnlyList<ModifierGroupInfo> Groups);

public record ModifierGroupInfo(
    Guid Id,
    string Name,
    string SelectionType,
    bool Required,
    IReadOnlyDictionary<Guid, SelectedModifier> Options);
