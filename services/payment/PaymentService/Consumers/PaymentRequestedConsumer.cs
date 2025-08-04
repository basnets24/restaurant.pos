using MassTransit;
using Messaging.Contracts.Events.Payment;

namespace PaymentService.Consumers;

public class PaymentRequestedConsumer : IConsumer<PaymentRequested>
{
    private readonly ILogger<PaymentRequestedConsumer> _logger;
    private readonly IConfiguration _config;

    public PaymentRequestedConsumer(ILogger<PaymentRequestedConsumer> logger,
        IConfiguration config)
    {
        _logger = logger;
        _config = config;
    }

    public async Task Consume(ConsumeContext<PaymentRequested> context)
    {
        var msg = context.Message;
        _logger.LogInformation("Received payment request for Order {OrderId} (Amount: {Amount})", msg.OrderId, msg.Amount);;

        var threshold = _config.GetValue<decimal>("PaymentSettings:MaxSuccessAmount", 100m);
        var success = msg.Amount <= threshold;

        if (success)
        {
            await context.Publish(new PaymentSucceeded(msg.CorrelationId, msg.OrderId));
            _logger.LogInformation("✅ Payment Succeeded for Order {OrderId}", msg.OrderId);
        }
        else
        {
            await context.Publish(new PaymentFailed(msg.CorrelationId, msg.OrderId, "Insufficient funds (dev simulation)"));
            _logger.LogWarning("❌ Payment Failed for Order {OrderId}", msg.OrderId);
        }
    }
}