using Messaging.Contracts.Events.Order;

namespace Messaging.Contracts.Events.Inventory;

public record InventoryReserved(Guid CorrelationId, Guid OrderId);

public record ReserveInventory(Guid CorrelationId, Guid OrderId, List<OrderItemMessage> Items);