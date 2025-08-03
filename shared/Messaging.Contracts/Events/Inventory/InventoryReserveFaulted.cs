namespace Messaging.Contracts.Events.Inventory;

public record InventoryReserveFaulted(Guid OrderId, string Reason);