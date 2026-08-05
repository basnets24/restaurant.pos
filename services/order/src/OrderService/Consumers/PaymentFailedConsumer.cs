using Common.Library;
using MassTransit;
using Messaging.Contracts.Events.Payment;
using OrderService.Entities;
using OrderService.Interfaces;

namespace OrderService.Consumers;

// A declined card is retryable, not an order rejection - the order stays
// active/unpaid and the guest (or staff) can request payment again.
public class PaymentFailedConsumer : IConsumer<PaymentFailed>
{
    private readonly IRepository<Order> _orders;
    private readonly ICustomerNotifier _customerNotifications;
    private readonly ILogger<PaymentFailedConsumer> _logger;

    public PaymentFailedConsumer(
        IRepository<Order> orders,
        ICustomerNotifier customerNotifications,
        ILogger<PaymentFailedConsumer> logger)
    {
        _orders = orders;
        _customerNotifications = customerNotifications;
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

        // Worth telling the diner about precisely because the order survives: they can close the
        // tab believing they paid, and the sweep will cancel it out from under them within the
        // TTL if nobody says otherwise.
        await _customerNotifications.NotifyAsync(order,
            CustomerNotificationType.PaymentFailed,
            "Payment didn't go through",
            "Your card was declined. The order is still held - open it to try paying again.",
            context.CancellationToken);

        _logger.LogWarning("Payment failed for OrderId {OrderId}: {Reason}", msg.OrderId, msg.Reason);
    }
}
