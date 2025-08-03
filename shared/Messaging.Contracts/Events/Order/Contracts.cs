namespace Messaging.Contracts.Events.Order;

public record OrderSubmitted(
    Guid CorrelationId,
    Guid OrderId,
    List<OrderItemMessage> Items,
    decimal TotalAmount
);

public record OrderItemMessage(
    Guid MenuItemId,
    int Quantity
);
