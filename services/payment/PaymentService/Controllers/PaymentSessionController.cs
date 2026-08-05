using Common.Library;
using MassTransit;
using Messaging.Contracts.Events.Payment;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PaymentService.Auth;
using PaymentService.Entities;
using PaymentService.Metrics;
using Stripe;

namespace PaymentService.Controllers;

[ApiController]
[Route("orders")]
public class PaymentSessionController : ControllerBase
{
    private readonly IRepository<Payment> _payments;
    private readonly IPublishEndpoint _publish;
    private readonly IStripeClient _stripeClient;
    private readonly ILogger<PaymentSessionController> _logger;

    public PaymentSessionController(IRepository<Payment> payments,
        IPublishEndpoint publish,
        IStripeClient stripeClient,
        ILogger<PaymentSessionController> logger)
    {
        _payments = payments;
        _publish = publish;
        _stripeClient = stripeClient;
        _logger = logger;
    }

    // GET orders/{orderId}/payment-session
    [Authorize(Policy = PaymentPolicyExtensions.Read)]
    [HttpGet("{orderId:guid}/payment-session")]
    public async Task<IActionResult> GetPaymentSession([FromRoute] Guid orderId)
    {
        var payment = await LoadForCallerAsync(orderId);

        if (payment is null)
        {
            // Not materialized yet (pending)
            return StatusCode(404, new { clientSecret = (string?)null, status = "pending" });
        }

        var status = (payment.Status ?? "").Trim().ToLowerInvariant();
        if (status == "succeeded") return Ok(new { status = "succeeded" });
        if (status == "failed")    return Ok(new { status = "failed" });

        // Pending
        if (string.IsNullOrWhiteSpace(payment.ClientSecret))
            return StatusCode(202, new { clientSecret = (string?)null, status = "pending" });

        return Ok(new { clientSecret = payment.ClientSecret });
    }

    // POST orders/{orderId}/payment-confirm
    // Called by the frontend right after stripe.confirmCardPayment() resolves - verifies
    // the result with Stripe server-side (never trusts the browser's word alone) and
    // publishes PaymentSucceeded/PaymentFailed immediately, instead of waiting on a webhook.
    [Authorize(Policy = PaymentPolicyExtensions.Read)]
    [HttpPost("{orderId:guid}/payment-confirm")]
    public async Task<IActionResult> ConfirmPayment([FromRoute] Guid orderId)
    {
        var payment = await LoadForCallerAsync(orderId);
        if (payment is null) return NotFound(new { status = "pending" });

        if (string.Equals(payment.Status, "Succeeded", StringComparison.OrdinalIgnoreCase))
            return Ok(new { status = "succeeded", receiptUrl = payment.ReceiptUrl });
        if (string.Equals(payment.Status, "Failed", StringComparison.OrdinalIgnoreCase))
            return Ok(new { status = "failed", error = payment.ErrorMessage });

        if (string.IsNullOrWhiteSpace(payment.PaymentIntentId))
            return Ok(new { status = "pending" });

        var intent = await new PaymentIntentService(_stripeClient).GetAsync(payment.PaymentIntentId);

        switch (intent.Status)
        {
            case "succeeded":
                payment.Status = "Succeeded";
                payment.ReceiptUrl = await TryGetReceiptUrlAsync(intent.Id);
                payment.UpdatedAt = DateTimeOffset.UtcNow;
                await _payments.UpdateAsync(payment);

                await _publish.Publish(new PaymentSucceeded(
                    payment.CorrelationId, payment.OrderId, payment.RestaurantId, payment.LocationId));

                PaymentMetrics.PaymentsSucceeded.Add(1);
                _logger.LogInformation("Payment confirmed succeeded for order {OrderId}", orderId);
                return Ok(new { status = "succeeded", receiptUrl = payment.ReceiptUrl });

            case "canceled":
            case "requires_payment_method":
                payment.Status = "Failed";
                payment.ErrorMessage = intent.LastPaymentError?.Message ?? "Payment failed";
                payment.UpdatedAt = DateTimeOffset.UtcNow;
                await _payments.UpdateAsync(payment);

                await _publish.Publish(new PaymentFailed(
                    payment.CorrelationId, payment.OrderId, payment.ErrorMessage, payment.RestaurantId, payment.LocationId));

                PaymentMetrics.PaymentsFailed.Add(1);
                _logger.LogInformation("Payment confirmed failed for order {OrderId}: {Status}", orderId, intent.Status);
                return Ok(new { status = "failed", error = payment.ErrorMessage });

            default:
                // requires_action, processing, requires_confirmation, etc. - not resolved yet
                return Ok(new { status = "pending", intentStatus = intent.Status });
        }
    }

    /// <summary>
    /// The payment for this order, but only if the caller is allowed to see it. Returns null
    /// otherwise, so both endpoints answer exactly as they do for an order that has no payment
    /// yet - an order id is a bare GUID in a URL, and a distinct 403 would confirm which GUIDs
    /// are real and whose they are.
    ///
    /// The payment.read scope is not the boundary: every diner holds it, so without the check
    /// below anyone who learned an order id could pull its Stripe client secret and confirm a
    /// stranger's payment. Staff are unaffected - the check keys off the `diner` scope, which
    /// only the spoontab-diner client is allowed to request.
    /// </summary>
    private async Task<Payment?> LoadForCallerAsync(Guid orderId)
    {
        var payment = await _payments.GetAsync(p => p.OrderId == orderId);
        if (payment is null) return null;

        var scopes = User.FindAll("scope")
            .SelectMany(c => c.Value.Split(' ', StringSplitOptions.RemoveEmptyEntries));
        if (!scopes.Contains("diner", StringComparer.Ordinal)) return payment;

        // A diner may only reach a payment that was raised for them. Note this rejects
        // staff-taken payments (CustomerId null) outright rather than falling through.
        return Guid.TryParse(User.FindFirst("sub")?.Value, out var customerId)
               && payment.CustomerId == customerId
            ? payment
            : null;
    }

    private async Task<string?> TryGetReceiptUrlAsync(string paymentIntentId)
    {
        try
        {
            var charges = await new ChargeService(_stripeClient).ListAsync(new ChargeListOptions
            {
                PaymentIntent = paymentIntentId,
                Limit = 1
            });
            return charges?.Data?.FirstOrDefault()?.ReceiptUrl;
        }
        catch (Exception ex)
        {
            _logger.LogDebug(ex, "Unable to load receipt for PaymentIntent {PaymentIntentId}", paymentIntentId);
            return null;
        }
    }
}
