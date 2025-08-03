namespace Messaging.Contracts.Events.Inventory;

public record InventoryReserveFaulted(Guid CorrelationId, Guid OrderId, string Reason);