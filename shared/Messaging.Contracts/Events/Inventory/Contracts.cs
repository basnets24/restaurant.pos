using Messaging.Contracts.Events.Order;

namespace Messaging.Contracts.Events.Inventory;

public record InventoryItemDepleted(Guid MenuItemId, int newQuantity, bool isAvailable);

public record InventoryItemRestocked(Guid MenuItemId, int newQuantity, bool isAvailable);

public record InventoryItemUpdated(
    Guid MenuItemId,
    int Quantity,
    bool IsAvailable
);

public record ReserveInventory(Guid CorrelationId, Guid OrderId, List<OrderItemMessage> Items);

public record ReleaseInventory(Guid CorrelationId, Guid OrderId, List<OrderItemMessage> Items);

public record InventoryReserved(Guid CorrelationId, Guid OrderId);

public record InventoryReserveFaulted(Guid CorrelationId, Guid OrderId, string Reason);