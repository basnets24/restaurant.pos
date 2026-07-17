using Common.Library;
using Common.Library.Tenancy;
using MassTransit;
using Messaging.Contracts.Events.Payment;
using PaymentService.Entities;
using Stripe;

namespace PaymentService.Consumers;

public class PaymentRequestedConsumer : IConsumer<PaymentRequested>
{
    private readonly IRepository<Payment> _paymentsRepo;
    private readonly ILogger<PaymentRequestedConsumer> _logger;
    private readonly ITenantContext _tenant;
    private readonly IStripeClient _stripeClient;

    public PaymentRequestedConsumer(
        ILogger<PaymentRequestedConsumer> logger,
        IRepository<Payment> repository,
        ITenantContext tenant,
        IStripeClient stripeClient)
    {
        _logger = logger;
        _paymentsRepo = repository;
        _tenant = tenant;
        _stripeClient = stripeClient;
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
        // Persist first if new, to have a stable paymentId
        if (existing is null)
        {
            await _paymentsRepo.CreateAsync(payment);
        }

        // Create a PaymentIntent - the frontend confirms it directly with Stripe.js
        // via an embedded card form (Stripe Elements), no redirect involved.
        var create = new PaymentIntentCreateOptions
        {
            Amount = msg.AmountCents,
            Currency = "usd",
            AutomaticPaymentMethods = new PaymentIntentAutomaticPaymentMethodsOptions { Enabled = true },
            Metadata = new()
            {
                ["orderId"]      = msg.OrderId.ToString(),
                ["paymentId"]    = payment.Id.ToString(),
                ["restaurantId"] = _tenant.RestaurantId,
                ["locationId"]   = _tenant.LocationId
            }
        };

        var intent = await new PaymentIntentService(_stripeClient).CreateAsync(create);
        payment.PaymentIntentId = intent.Id;
        payment.ClientSecret    = intent.ClientSecret;

        payment.UpdatedAt = DateTimeOffset.UtcNow;

        await _paymentsRepo.UpdateAsync(payment);

        await context.Publish(new PaymentSessionCreated(
            msg.CorrelationId, msg.OrderId, intent.ClientSecret!, _tenant.RestaurantId, _tenant.LocationId));
    }
}
