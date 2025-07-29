namespace Messaging.Contracts.Events.Inventory;

public record InventoryItemRestocked(Guid MenuItemId, int newQuantity, bool isAvailable);