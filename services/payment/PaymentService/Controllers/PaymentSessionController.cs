using System.Text.Json;
using Common.Library;
using MassTransit;
using Messaging.Contracts.Events.Payment;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PaymentService.Auth;
using PaymentService.Entities;
using PaymentService.Metrics;
using PaymentService.Services;
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
    private readonly IPaymentSessionNotifier _notifier;

    public PaymentSessionController(IRepository<Payment> payments,
        IPublishEndpoint publish,
        IStripeClient stripeClient,
        ILogger<PaymentSessionController> logger,
        IPaymentSessionNotifier notifier)
    {
        _payments = payments;
        _publish = publish;
        _stripeClient = stripeClient;
        _logger = logger;
        _notifier = notifier;
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

        // Pending. ClientSecret is null while a retry is invalidating the previous attempt
        // and talking to Stripe (see PaymentRequestedConsumer) - keep the caller polling
        // rather than handing out data left over from an earlier, abandoned attempt.
        if (string.IsNullOrWhiteSpace(payment.ClientSecret))
            return StatusCode(202, new { clientSecret = (string?)null, status = "pending" });

        return Ok(new { clientSecret = payment.ClientSecret, attemptId = payment.AttemptId });
    }

    // GET orders/{orderId}/payment-session/stream — SSE alternative to polling
    // GetPaymentSession above. Holds the connection open until PaymentRequestedConsumer
    // signals a ClientSecret is ready (or the payment resolves as succeeded/failed
    // elsewhere), emits one event, and closes. A single event is all a caller ever needs -
    // this isn't a general status feed, just a wakeup for the one thing pollForClientSecret
    // used to poll for. Frontend closes and reopens per attempt rather than this endpoint
    // tracking retries itself - see PaymentSessionNotifier for why that's the simpler split.
    [Authorize(Policy = PaymentPolicyExtensions.Read)]
    [HttpGet("{orderId:guid}/payment-session/stream")]
    public async Task StreamPaymentSession([FromRoute] Guid orderId, CancellationToken ct)
    {
        Response.Headers.ContentType = "text/event-stream";
        Response.Headers.CacheControl = "no-cache";
        Response.Headers["X-Accel-Buffering"] = "no";

        var deadline = DateTimeOffset.UtcNow.AddSeconds(15);
        while (!ct.IsCancellationRequested)
        {
            var payment = await LoadForCallerAsync(orderId);
            if (payment is not null)
            {
                var status = (payment.Status ?? "").Trim().ToLowerInvariant();
                if (status is "succeeded" or "failed")
                {
                    // Resolved through some other path already - nothing to hand out, mirrors
                    // pollForClientSecret returning null for a terminal status.
                    return;
                }
                if (!string.IsNullOrWhiteSpace(payment.ClientSecret))
                {
                    await WriteEventAsync(new { clientSecret = payment.ClientSecret, attemptId = payment.AttemptId }, ct);
                    return;
                }
            }

            var remaining = deadline - DateTimeOffset.UtcNow;
            if (remaining <= TimeSpan.Zero) return;

            await _notifier.WaitForUpdateAsync(orderId, remaining, ct);
            // Loop regardless of whether that returned true or timed out - either re-check
            // finds the answer, or the deadline check above ends the stream next iteration.
        }
    }

    private async Task WriteEventAsync(object payload, CancellationToken ct)
    {
        var json = JsonSerializer.Serialize(payload);
        await Response.WriteAsync($"data: {json}\n\n", ct);
        await Response.Body.FlushAsync(ct);
    }

    // POST orders/{orderId}/payment-confirm?attemptId=...
    // Called by the frontend right after stripe.confirmCardPayment() resolves - verifies
    // the result with Stripe server-side (never trusts the browser's word alone) and
    // publishes PaymentSucceeded/PaymentFailed immediately, instead of waiting on a webhook.
    // attemptId must be the one handed out with the ClientSecret the caller just confirmed
    // with Stripe - if a retry has since started a newer attempt, payment.PaymentIntentId no
    // longer refers to what the caller actually confirmed, and checking it would report the
    // wrong intent's (unconfirmed) status. See PaymentRequestedConsumer for the write side.
    [Authorize(Policy = PaymentPolicyExtensions.Read)]
    [HttpPost("{orderId:guid}/payment-confirm")]
    public async Task<IActionResult> ConfirmPayment([FromRoute] Guid orderId, [FromQuery] Guid attemptId)
    {
        var payment = await LoadForCallerAsync(orderId);
        if (payment is null) return NotFound(new { status = "pending" });

        if (string.Equals(payment.Status, "Succeeded", StringComparison.OrdinalIgnoreCase))
            return Ok(new { status = "succeeded", receiptUrl = payment.ReceiptUrl });
        if (string.Equals(payment.Status, "Failed", StringComparison.OrdinalIgnoreCase))
            return Ok(new { status = "failed", error = payment.ErrorMessage });

        if (payment.AttemptId != attemptId)
        {
            _logger.LogWarning(
                "ConfirmPayment for Order {OrderId} carried stale AttemptId {Attempt}; current is {Current}",
                orderId, attemptId, payment.AttemptId);
            return Ok(new { status = "stale" });
        }

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
