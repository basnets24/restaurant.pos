using Common.Library;
using MassTransit;
using Messaging.Contracts.Events.Payment;
using Microsoft.AspNetCore.Mvc;
using PaymentService.Entities;
using Stripe;


namespace PaymentService.Controllers;


[ApiController]
[Route("/webhooks/stripe")]
public class StripeWebhookController : ControllerBase
{
    private readonly IRepository<Payment> _repo;
    private readonly IPublishEndpoint _publish;
    private readonly string _secret;
    private readonly Common.Library.Tenancy.TenantMiddleware.TenantContextHolder _tenantHolder;
    private readonly ILogger<StripeWebhookController> _logger;

    public StripeWebhookController(IRepository<Payment> repo, 
        IPublishEndpoint publish, 
        IConfiguration cfg, 
        ILogger<StripeWebhookController> logger,
        Common.Library.Tenancy.TenantMiddleware.TenantContextHolder tenantHolder)
    {
        _repo = repo;
        _publish = publish;
        _secret = cfg["Stripe:WebhookSecret"] ?? throw new InvalidOperationException("Missing Stripe:WebhookSecret");
        _logger = logger;
        _tenantHolder = tenantHolder;
    }

    [HttpPost]
    public async Task<IActionResult> Handle() {
    // 1) Read body + verify signature
    var json = await new StreamReader(Request.Body).ReadToEndAsync();
    Stripe.Event stripeEvent;
    try
    {
        stripeEvent = EventUtility.ConstructEvent(
            json,
            Request.Headers["Stripe-Signature"],
            _secret,
            throwOnApiVersionMismatch: false // important: avoid bool -> long overload issue
        );
    }
    catch (Exception ex)
    {
        _logger.LogWarning(ex, "Stripe webhook signature verification failed");
        return Unauthorized();
    }

    try
    {
        // Global idempotency guard: skip if we've already processed this event id
        var duplicate = await _repo.GetAsync(p => p.LastStripeEventId == stripeEvent.Id);
        if (duplicate is not null)
        {
            _logger.LogInformation("Skipping duplicate Stripe event {EventId} of type {Type}", stripeEvent.Id, stripeEvent.Type);
            return Ok();
        }

        // 2) Switch by raw event type (compatible with all Stripe.NET versions)
        switch (stripeEvent.Type)
        {
            // Synchronous success (paid immediately)
            case "checkout.session.completed":
            // Async methods (e.g., bank debits) eventually succeed/fail
            case "checkout.session.async_payment_succeeded":
            {
                var s = (Stripe.Checkout.Session)stripeEvent.Data.Object!;
                // Set tenant from session metadata (added during session creation)
                var rid = s.Metadata != null && s.Metadata.TryGetValue("restaurantId", out var srid) ? srid : null;
                var lid = s.Metadata != null && s.Metadata.TryGetValue("locationId", out var slid) ? slid : null;
                if (!string.IsNullOrWhiteSpace(rid) && !string.IsNullOrWhiteSpace(lid))
                    _tenantHolder.Set(new Common.Library.Tenancy.TenantContext { RestaurantId = rid!, LocationId = lid! });
                // We store the Checkout Session id in Payment.ProviderRef
                var payment = await _repo.GetAsync(p => p.Provider == "Stripe" && p.ProviderRef == s.Id);
                if (payment is null)
                {
                    _logger.LogWarning("Payment not found for stripe session {SessionId}", s.Id);
                    break;
                }

                // Idempotency: if already succeeded, do nothing
                if (string.Equals(payment.Status, "Succeeded", StringComparison.OrdinalIgnoreCase))
                {
                    payment.LastStripeEventId = stripeEvent.Id;
                    await _repo.UpdateAsync(payment);
                    break;
                }

                // Stripe indicates "paid"
                var isPaid = string.Equals(s.PaymentStatus, "paid", StringComparison.OrdinalIgnoreCase);
                if (!isPaid)
                {
                    _logger.LogInformation("Checkout session {SessionId} not paid yet (status={Status})", s.Id, s.PaymentStatus);
                    break;
                }

                payment.Status    = "Succeeded";
                payment.PaymentIntentId = s.PaymentIntentId;
                // Try to capture a hosted receipt URL from the latest charge
                try
                {
                    if (!string.IsNullOrWhiteSpace(s.PaymentIntentId))
                    {
                        var chargeList = await new Stripe.ChargeService().ListAsync(new Stripe.ChargeListOptions
                        {
                            PaymentIntent = s.PaymentIntentId,
                            Limit = 1
                        });
                        var charge = chargeList?.Data?.FirstOrDefault();
                        if (charge is not null && !string.IsNullOrWhiteSpace(charge.ReceiptUrl))
                            payment.ReceiptUrl = charge.ReceiptUrl;
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogDebug(ex, "Unable to load receipt for Checkout Session {SessionId}", s.Id);
                }
                payment.UpdatedAt = DateTimeOffset.UtcNow;
                payment.LastStripeEventId = stripeEvent.Id;
                await _repo.UpdateAsync(payment);

                await _publish.Publish(new PaymentSucceeded(
                    payment.CorrelationId,
                    payment.OrderId,
                    payment.RestaurantId,
                    payment.LocationId
                ));

                _logger.LogInformation("Payment succeeded for order {OrderId}, session {SessionId}", payment.OrderId, s.Id);
                break;
            }

            // Explicit failure cases
            case "checkout.session.async_payment_failed":
            case "checkout.session.expired":
            {
                var s = (Stripe.Checkout.Session)stripeEvent.Data.Object!;
                var payment = await _repo.GetAsync(p => p.Provider == "Stripe" && p.ProviderRef == s.Id);
                if (payment is null)
                {
                    _logger.LogWarning("Payment not found for stripe session {SessionId}", s.Id);
                    break;
                }

                // Idempotency: if already failed, do nothing
                if (string.Equals(payment.Status, "Failed", StringComparison.OrdinalIgnoreCase))
                {
                    payment.LastStripeEventId = stripeEvent.Id;
                    await _repo.UpdateAsync(payment);
                    break;
                }

                payment.Status       = "Failed";
                payment.ErrorMessage = stripeEvent.Type; // or a nicer message
                payment.UpdatedAt    = DateTimeOffset.UtcNow;
                payment.LastStripeEventId = stripeEvent.Id;
                await _repo.UpdateAsync(payment);

                await _publish.Publish(new PaymentFailed(
                    payment.CorrelationId,
                    payment.OrderId,
                    payment.ErrorMessage ?? "failed",
                    payment.RestaurantId,
                    payment.LocationId
                ));

                _logger.LogInformation("Payment failed for order {OrderId}, session {SessionId}, type {Type}",
                    payment.OrderId, s.Id, stripeEvent.Type);
                break;
            }

            // Optional: store PaymentIntentId in ProviderRef, you can handle these:
            case "payment_intent.payment_failed":
            {
                var pi = (Stripe.PaymentIntent)stripeEvent.Data.Object!;
                // Set tenant from payment intent metadata when available
                var rid = pi.Metadata != null && pi.Metadata.TryGetValue("restaurantId", out var prid) ? prid : null;
                var lid = pi.Metadata != null && pi.Metadata.TryGetValue("locationId", out var plid) ? plid : null;
                if (!string.IsNullOrWhiteSpace(rid) && !string.IsNullOrWhiteSpace(lid))
                    _tenantHolder.Set(new Common.Library.Tenancy.TenantContext { RestaurantId = rid!, LocationId = lid! });
                var payment = await _repo.GetAsync(p => p.Provider == "Stripe" && p.PaymentIntentId == pi.Id);
                if (payment is null) break;

                if (string.Equals(payment.Status, "Failed", StringComparison.OrdinalIgnoreCase))
                {
                    payment.LastStripeEventId = stripeEvent.Id;
                    await _repo.UpdateAsync(payment);
                    break;
                }

                payment.Status       = "Failed";
                payment.ErrorMessage = pi.LastPaymentError?.Message ?? "Payment failed";
                payment.UpdatedAt    = DateTimeOffset.UtcNow;
                payment.PaymentIntentId = pi.Id;
                payment.LastStripeEventId = stripeEvent.Id;
                await _repo.UpdateAsync(payment);

                await _publish.Publish(new PaymentFailed(
                    payment.CorrelationId,
                    payment.OrderId,
                    payment.ErrorMessage!,
                    payment.RestaurantId,
                    payment.LocationId
                ));
                break;
            }

            case "payment_intent.succeeded":
            {
                var pi = (Stripe.PaymentIntent)stripeEvent.Data.Object!;
                var rid = pi.Metadata != null && pi.Metadata.TryGetValue("restaurantId", out var prid) ? prid : null;
                var lid = pi.Metadata != null && pi.Metadata.TryGetValue("locationId", out var plid) ? plid : null;
                if (!string.IsNullOrWhiteSpace(rid) && !string.IsNullOrWhiteSpace(lid))
                    _tenantHolder.Set(new Common.Library.Tenancy.TenantContext { RestaurantId = rid!, LocationId = lid! });
                var payment = await _repo.GetAsync(p => p.Provider == "Stripe" && p.PaymentIntentId == pi.Id);
                if (payment is null) break;

                if (string.Equals(payment.Status, "Succeeded", StringComparison.OrdinalIgnoreCase))
                {
                    payment.LastStripeEventId = stripeEvent.Id;
                    await _repo.UpdateAsync(payment);
                    break;
                }

                payment.Status    = "Succeeded";
                payment.PaymentIntentId = pi.Id;
                // Derive a receipt URL by querying the latest charge for this payment intent
                try
                {
                    var chargeList = await new Stripe.ChargeService().ListAsync(new Stripe.ChargeListOptions
                    {
                        PaymentIntent = pi.Id,
                        Limit = 1
                    });
                    var charge = chargeList?.Data?.FirstOrDefault();
                    if (charge is not null && !string.IsNullOrWhiteSpace(charge.ReceiptUrl))
                        payment.ReceiptUrl = charge.ReceiptUrl;
                }
                catch (Exception ex)
                {
                    _logger.LogDebug(ex, "Unable to load receipt for PaymentIntent {PaymentIntentId}", pi.Id);
                }
                payment.UpdatedAt = DateTimeOffset.UtcNow;
                payment.LastStripeEventId = stripeEvent.Id;
                await _repo.UpdateAsync(payment);

                await _publish.Publish(new PaymentSucceeded(
                    payment.CorrelationId,
                    payment.OrderId,
                    payment.RestaurantId,
                    payment.LocationId
                ));
                break;
            }

            default:
                // Ignore other events; always return 2xx so Stripe doesn't retry forever.
                _logger.LogDebug("Ignored Stripe event {Type}", stripeEvent.Type);
                break;
        }
    }
    catch (Exception ex)
    {
        // Log but still return 200 to avoid endless Stripe retries if the error is non-retriable on your side.
        _logger.LogError(ex, "Error handling Stripe event {Type}", stripeEvent.Type);
    }

    // Always acknowledge
    return Ok();
}

}
