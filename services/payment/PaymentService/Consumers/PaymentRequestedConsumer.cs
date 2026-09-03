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

        var attemptId = Guid.NewGuid();
        var payment = existing ?? new Payment
        {
            Id = Guid.NewGuid(),
            OrderId = msg.OrderId,
            CorrelationId = msg.CorrelationId,
            CustomerId = msg.CustomerId,
            Amount = msg.AmountCents,
            Currency = "usd",
            Provider = "Stripe",
            Status = "Pending",
            AttemptId = attemptId,
            RestaurantId = _tenant.RestaurantId,
            LocationId = _tenant.LocationId
        };

        if (existing is null)
        {
            // Persist first, to have a stable paymentId before talking to Stripe.
            await _paymentsRepo.CreateAsync(payment);
        }
        else
        {
            // Starting a new attempt on a previously abandoned/failed payment. Invalidate
            // and commit this BEFORE calling Stripe below: a GetPaymentSession poll that
            // lands during the Stripe round-trip must see a cleared ClientSecret (attempt
            // in progress), never the previous attempt's stale one. CustomerId is
            // deliberately left alone - set once at creation, never reassignable later.
            payment.Status = "Pending";
            payment.ErrorMessage = null;
            payment.PaymentIntentId = null;
            payment.ClientSecret = null;
            payment.AttemptId = attemptId;
            payment.UpdatedAt = DateTimeOffset.UtcNow;
            await _paymentsRepo.UpdateAsync(payment);
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

        // Re-check before writing the intent back: if a newer PaymentRequested for this
        // order was processed while we were waiting on Stripe, our attempt already lost -
        // writing now would clobber the newer attempt's ClientSecret with a dead one.
        var current = await _paymentsRepo.GetAsync(p => p.OrderId == msg.OrderId);
        if (current is null || current.AttemptId != attemptId)
        {
            _logger.LogWarning(
                "Attempt {AttemptId} for Order {OrderId} superseded before its PaymentIntent could be attached; discarding.",
                attemptId, msg.OrderId);
            return;
        }

        current.PaymentIntentId = intent.Id;
        current.ClientSecret = intent.ClientSecret;
        current.UpdatedAt = DateTimeOffset.UtcNow;
        await _paymentsRepo.UpdateAsync(current);

        await context.Publish(new PaymentSessionCreated(
            msg.CorrelationId, msg.OrderId, intent.ClientSecret!, _tenant.RestaurantId, _tenant.LocationId));
    }
}
