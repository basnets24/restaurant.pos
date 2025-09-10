using Common.Library;
using Common.Library.Tenancy;
using MassTransit;
using Messaging.Contracts.Events.Payment;
using Microsoft.Extensions.Options;
using PaymentService.Entities;
using PaymentService.Settings;

namespace PaymentService.Consumers;

public class PaymentRequestedConsumer : IConsumer<PaymentRequested>
{
    private readonly IRepository<Payment> _paymentsRepo;
    private readonly ILogger<PaymentRequestedConsumer> _logger;
    private readonly FrontendSettings _frontend;
    private readonly ITenantContext _tenant;

    public PaymentRequestedConsumer(
        ILogger<PaymentRequestedConsumer> logger,
        IRepository<Payment> repository, 
        ITenantContext tenant, IOptions<FrontendSettings> frontend)
    {
        _logger = logger;
        _paymentsRepo = repository;
        _tenant = tenant;
        _frontend = frontend.Value;
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
            Amount = msg.AmountCents,
            Currency = "usd",
            Provider = "Stripe",
            Status = "Pending",
            RestaurantId = _tenant.RestaurantId,
            LocationId = _tenant.LocationId
        };
        
        // Build a Stripe Checkout Session
        var success = $"{_frontend.PublicBaseUrl}/checkout/success?order={msg.OrderId}&session_id={{CHECKOUT_SESSION_ID}}";
        var cancel  = $"{_frontend.PublicBaseUrl}/checkout/cancel?order={msg.OrderId}";
        
        var create = new Stripe.Checkout.SessionCreateOptions
        {
            Mode = "payment",
            SuccessUrl = success,
            CancelUrl  = cancel,
            Metadata   = new() { ["orderId"] = msg.OrderId.ToString() },
            LineItems  =
            [
                new Stripe.Checkout.SessionLineItemOptions
                {
                    Quantity = 1,
                    PriceData = new Stripe.Checkout.SessionLineItemPriceDataOptions
                    {
                        Currency = "usd",
                        UnitAmount = msg.AmountCents,
                        ProductData = new Stripe.Checkout.SessionLineItemPriceDataProductDataOptions
                        {
                            Name = $"Order {msg.OrderId}"
                        }
                    }
                }
            ]
        };
        
        var session = await new Stripe.Checkout.SessionService().CreateAsync(create);
        payment.ProviderRef = session.Id; // store Checkout Session id for later webhook correlation
        
        payment.UpdatedAt = DateTimeOffset.UtcNow;

        if (await _paymentsRepo.GetAsync(p => p.Id == payment.Id) is null)
            await _paymentsRepo.CreateAsync(payment);
        else
            await _paymentsRepo.UpdateAsync(payment);
        
        await context.Publish(new PaymentSessionCreated(
            msg.CorrelationId, msg.OrderId, session.Url!, _tenant.RestaurantId, _tenant.LocationId));
        
        
        
        
        // payment.UpdatedAt = DateTimeOffset.UtcNow;
        // _logger.LogInformation("Received payment request for Order {OrderId} (Amount: {Amount})", msg.OrderId, msg.AmountCents);;
        // // DEMO: auto-approve after a tiny delay
        // await Task.Delay(300); // simulate gateway latency
        // payment.Status = "Succeeded";
        // payment.ProviderRef = $"demo_{payment.Id:N}";
        // payment.UpdatedAt = DateTimeOffset.UtcNow;
        //
        // if (existing is null) await _paymentsRepo.CreateAsync(payment);
        // else await _paymentsRepo.UpdateAsync(payment);
        //
        // _logger.LogInformation("Payment Succeeded for Order {OrderId}", msg.OrderId);
        // await context.Publish(new PaymentSucceeded(msg.CorrelationId, msg.OrderId,  
        //     _tenant.RestaurantId, _tenant.LocationId));
    }
}