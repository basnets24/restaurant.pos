namespace Messaging.Contracts.Events.Order;

public record OrderSubmitted(
    Guid OrderId,
    List<OrderItemMessage> Items,
    decimal Total
);

public record OrderItemMessage(
    Guid MenuItemId,
    int Quantity
);
