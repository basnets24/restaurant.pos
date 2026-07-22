using MassTransit;
using Messaging.Contracts.Events.Payment;
using OrderService.Interfaces;

namespace OrderService.Consumers;

public class PaymentSucceededConsumer : IConsumer<PaymentSucceeded>
{
    private readonly IOrderService _orders;
    private readonly ILogger<PaymentSucceededConsumer> _logger;

    public PaymentSucceededConsumer(IOrderService orders, ILogger<PaymentSucceededConsumer> logger)
    {
        _orders = orders;
        _logger = logger;
    }

    public async Task Consume(ConsumeContext<PaymentSucceeded> context)
    {
        try
        {
            await _orders.MarkPaidAsync(context.Message.OrderId, context.CancellationToken);
            _logger.LogInformation("Order {OrderId} marked Paid", context.Message.OrderId);
        }
        catch (KeyNotFoundException)
        {
            _logger.LogWarning("PaymentSucceeded for unknown OrderId {OrderId}", context.Message.OrderId);
        }
    }
}
