using Common.Library;
using MassTransit;
using Messaging.Contracts.Events.Payment;
using OrderService.Entities;

namespace OrderService.Consumers;

// A declined card is retryable, not an order rejection - the order stays
// active/unpaid and the guest (or staff) can request payment again.
public class PaymentFailedConsumer : IConsumer<PaymentFailed>
{
    private readonly IRepository<Order> _orders;
    private readonly ILogger<PaymentFailedConsumer> _logger;

    public PaymentFailedConsumer(IRepository<Order> orders, ILogger<PaymentFailedConsumer> logger)
    {
        _orders = orders;
        _logger = logger;
    }

    public async Task Consume(ConsumeContext<PaymentFailed> context)
    {
        var msg = context.Message;
        var order = await _orders.GetAsync(msg.OrderId);
        if (order is null)
        {
            _logger.LogWarning("PaymentFailed for unknown OrderId {OrderId}", msg.OrderId);
            return;
        }

        if (order.Status == OrderStatus.Paid) return; // stale failure racing a later successful attempt

        order.LastPaymentError = msg.Reason;
        order.LastPaymentFailedAt = DateTimeOffset.UtcNow;
        await _orders.UpdateAsync(order);
        _logger.LogWarning("Payment failed for OrderId {OrderId}: {Reason}", msg.OrderId, msg.Reason);
    }
}
