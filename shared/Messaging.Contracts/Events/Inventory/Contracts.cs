using Messaging.Contracts.Events.Order;

namespace Messaging.Contracts.Events.Inventory;

public record InventoryItemDepleted(
    Guid MenuItemId, int NewQuantity, bool IsAvailable,
    string RestaurantId, string LocationId);

public record InventoryItemRestocked(
    Guid MenuItemId, int NewQuantity, bool IsAvailable,
    string RestaurantId, string LocationId);

public record InventoryItemUpdated(
    Guid MenuItemId,
    int Quantity,
    bool IsAvailable,
    string RestaurantId,
    string LocationId
);

public record ReserveInventory(
    Guid CorrelationId, 
    Guid OrderId, 
    List<OrderItemMessage> Items,
    string RestaurantId,
    string LocationId);

public record ReleaseInventory(
    Guid CorrelationId, 
    Guid OrderId, 
    IReadOnlyList<OrderItemMessage> Items,
    string RestaurantId,
    string LocationId);

public record InventoryReserved(Guid CorrelationId, 
    Guid OrderId,
    string RestaurantId,
    string LocationId);

public record InventoryReserveFaulted(
    Guid CorrelationId, 
    Guid OrderId, 
    string Reason,
    string RestaurantId,
    string LocationId);