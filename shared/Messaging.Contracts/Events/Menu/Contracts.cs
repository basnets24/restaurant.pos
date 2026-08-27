namespace Messaging.Contracts.Events.Menu;

public record MenuItemCreated(
    Guid Id,
    string Name,
    string Description,
    decimal Price,
    string Category,
    bool IsAvailable,
    string RestaurantId,
    string LocationId
);

public record MenuItemDeleted( 
    Guid Id,
    string RestaurantId,
    string LocationId); 

public record MenuItemUpdated
(
    Guid Id,
    string Name,
    string Description,
    decimal Price,
    string Category,
    bool IsAvailable,
    string RestaurantId,
    string LocationId
);

/// <summary>
/// The full current modifier-group set for one menu item. Published whenever staff create,
/// update, or delete a group (or its options) under that item - always the complete snapshot,
/// never a delta, so a consumer never has to diff or worry about arrival order. An empty
/// Groups list means the item's last group was just deleted.
/// </summary>
public record MenuItemModifiersChanged(
    Guid MenuItemId,
    string RestaurantId,
    string LocationId,
    IReadOnlyList<ModifierGroupSnapshot> Groups
);

public record ModifierGroupSnapshot(
    Guid Id,
    string Name,
    string SelectionType,
    bool Required,
    IReadOnlyList<ModifierOptionSnapshot> Options
);

public record ModifierOptionSnapshot(
    Guid Id,
    string Name,
    decimal PriceDelta,
    bool IsDefault
);