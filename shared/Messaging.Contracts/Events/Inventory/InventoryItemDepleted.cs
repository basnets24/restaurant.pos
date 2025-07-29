namespace Messaging.Contracts.Events.Inventory;

public record InventoryItemDepleted(Guid MenuItemId, int newQuantity, bool isAvailable);