using Common.Library;
using Common.Library.Tenancy;
using MassTransit;
using Messaging.Contracts.Events.Payment;
using PaymentService.Entities;

namespace PaymentService.Consumers;

public class PaymentRequestedConsumer : IConsumer<PaymentRequested>
{
    private readonly IRepository<Payment> _paymentsRepo;
    private readonly ILogger<PaymentRequestedConsumer> _logger;
    private readonly ITenantContext _tenant;

    public PaymentRequestedConsumer(
        ILogger<PaymentRequestedConsumer> logger,
        IRepository<Payment> repository, 
        ITenantContext tenant)
    {
        _logger = logger;
        _paymentsRepo = repository;
        _tenant = tenant;
    }

    public async Task Consume(ConsumeContext<PaymentRequested> context)
    {
        var msg = context.Message;
        // need to maintain idempotency, one payment for one orderID 
        var existing = await _paymentsRepo.GetAsync(p => p.OrderId == msg.OrderId);
        if (existing != null && existing.Status == "Succeeded")
        {
            _logger.LogWarning("Payment has already succeeded for Order {OrderId}. Ignoring. ", msg.OrderId);
            return;
        }
        
        var payment = existing ?? new Payment
        {
            Id = Guid.NewGuid(),
            OrderId = msg.OrderId,
            CorrelationId = msg.CorrelationId,
            Amount = msg.AmountCents
        };
        payment.UpdatedAt = DateTimeOffset.UtcNow;
        _logger.LogInformation("Received payment request for Order {OrderId} (Amount: {Amount})", msg.OrderId, msg.AmountCents);;

        
        // DEMO: auto-approve after a tiny delay
        await Task.Delay(300); // simulate gateway latency
        payment.Status = "Succeeded";
        payment.ProviderRef = $"demo_{payment.Id:N}";
        payment.UpdatedAt = DateTimeOffset.UtcNow;

        if (existing is null) await _paymentsRepo.CreateAsync(payment);
        else await _paymentsRepo.UpdateAsync(payment);

        _logger.LogInformation("Payment Succeeded for Order {OrderId}", msg.OrderId);
        await context.Publish(new PaymentSucceeded(msg.CorrelationId, msg.OrderId,  
            _tenant.RestaurantId, _tenant.LocationId));
    }
}