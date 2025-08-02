namespace Messaging.Contracts.Events.Inventory;

public record InventoryItemUpdated(
    Guid MenuItemId,
    int Quantity,
    bool IsAvailable
);