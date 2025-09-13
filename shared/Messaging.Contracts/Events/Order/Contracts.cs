namespace Messaging.Contracts.Events.Order;

public record OrderSubmitted(
    Guid CorrelationId,
    Guid OrderId,
    Guid TableId, 
    List<OrderItemMessage> Items,
    decimal TotalAmount,
    string RestaurantId,
    string LocationId
);

public record OrderItemMessage(
    Guid MenuItemId,
    int Quantity
);
