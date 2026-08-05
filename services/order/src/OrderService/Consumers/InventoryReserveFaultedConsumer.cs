using Common.Library;
using MassTransit;
using Messaging.Contracts.Events.Inventory;
using OrderService.Entities;
using OrderService.Interfaces;

namespace OrderService.Consumers;

// Keeps Order.Status in sync with the saga's own InventoryReserveFaulted
// handling, so the request-payment endpoint (which only sees the Order
// record, not saga internals) can correctly refuse to charge for an order
// that was never actually fulfilled.
public class InventoryReserveFaultedConsumer : IConsumer<InventoryReserveFaulted>
{
    private readonly IRepository<Order> _orders;
    private readonly ICustomerOrderHistory _history;
    private readonly ILogger<InventoryReserveFaultedConsumer> _logger;

    public InventoryReserveFaultedConsumer(
        IRepository<Order> orders,
        ICustomerOrderHistory history,
        ILogger<InventoryReserveFaultedConsumer> logger)
    {
        _orders = orders;
        _history = history;
        _logger = logger;
    }

    public async Task Consume(ConsumeContext<InventoryReserveFaulted> context)
    {
        var msg = context.Message;
        var order = await _orders.GetAsync(msg.OrderId);
        if (order is null)
        {
            _logger.LogWarning("InventoryReserveFaulted for unknown OrderId {OrderId}", msg.OrderId);
            return;
        }

        if (order.Status == OrderStatus.Paid) return;

        order.Status = OrderStatus.Rejected;
        order.LastPaymentError = msg.Reason;
        await _orders.UpdateAsync(order);

        // The one status this consumer owns outright - it never goes through FinalOrderService,
        // so without this a diner whose order was rejected for stock would see it sitting at
        // Pending in their history for good.
        await _history.RecordAsync(order, context.CancellationToken);
        _logger.LogWarning("Order {OrderId} rejected: {Reason}", msg.OrderId, msg.Reason);
    }
}
