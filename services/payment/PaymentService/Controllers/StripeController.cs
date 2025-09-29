using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;
using Common.Library;
using Common.Library.Tenancy;
using PaymentService.Entities;
using PaymentService.Settings;
using Stripe;
using Stripe.Checkout;
using Microsoft.AspNetCore.Authorization;
using PaymentService.Auth;

namespace PaymentService.Controllers;


[ApiController]
[Route("api/payments/stripe")]
[Authorize]
public class StripeController : ControllerBase
{
    private readonly IRepository<Payment> _payments;
    private readonly StripeSettings _stripe;
    private readonly FrontendSettings _frontend;
    private readonly ILogger<StripeController> _logger;
    private readonly ITenantContext _tenant;
    private readonly IStripeClient _stripeClient;

    public StripeController(
        IRepository<Payment> payments,
        IOptions<StripeSettings> stripeOptions,
        IOptions<FrontendSettings> frontendOptions,
        ILogger<StripeController> logger,
        ITenantContext tenant,
        IStripeClient stripeClient)
    {
        _payments = payments;
        _stripe = stripeOptions.Value;
        _frontend = frontendOptions.Value;
        _logger = logger;
        _tenant = tenant;
        _stripeClient = stripeClient;
        if (string.IsNullOrWhiteSpace(_stripe.SecretKey))
        {
            throw new InvalidOperationException("Stripe:SecretKey is not configured.");
        }
    }

    // POST /api/payments/stripe/checkout/session
    [Authorize(Policy = PaymentPolicyExtensions.Charge)]
    [HttpPost("checkout/session")]
    public async Task<IActionResult> CreateCheckoutSession([FromBody] CreateCheckoutRequest? req)
    {
        try
        {
            var amount = req?.Amount ?? 2599L; // cents
            var currency = string.IsNullOrWhiteSpace(req?.Currency) ? "usd" : req!.Currency.ToLowerInvariant();
            var orderIdStr = req?.OrderId ?? Guid.NewGuid().ToString();
            if (!Guid.TryParse(orderIdStr, out var orderIdGuid)) orderIdGuid = Guid.NewGuid();

            _logger.LogInformation(
                "Creating Stripe checkout session for order {OrderId} amount {Amount} {Currency} tenant {RestaurantId}/{LocationId} trace {TraceId}",
                orderIdGuid,
                amount,
                currency.ToUpperInvariant(),
                _tenant.RestaurantId ?? string.Empty,
                _tenant.LocationId ?? string.Empty,
                HttpContext.TraceIdentifier);

            // Persist payment first to stamp correlation and get a stable paymentId
            var existing = await _payments.GetAsync(p => p.OrderId == orderIdGuid);
            var payment = existing ?? new PaymentService.Entities.Payment
            {
                Id = Guid.NewGuid(),
                OrderId = orderIdGuid,
                CorrelationId = Guid.NewGuid(),
                Amount = amount,
                Currency = currency.ToUpperInvariant(),
                Provider = "Stripe",
                Status = "Pending",
                RestaurantId = _tenant.RestaurantId ?? string.Empty,
                LocationId = _tenant.LocationId ?? string.Empty,
                CreatedAt = DateTimeOffset.UtcNow,
                UpdatedAt = DateTimeOffset.UtcNow
            };
            if (existing is null)
            {
                await _payments.CreateAsync(payment);
                _logger.LogDebug("Created new Payment {PaymentId} for order {OrderId}", payment.Id, orderIdGuid);
            }
            else
            {
                _logger.LogDebug("Using existing Payment {PaymentId} for order {OrderId}", payment.Id, orderIdGuid);
            }

            using var scope = _logger.BeginScope(new Dictionary<string, object>
            {
                ["OrderId"] = orderIdGuid,
                ["PaymentId"] = payment.Id,
                ["RestaurantId"] = _tenant.RestaurantId ?? string.Empty,
                ["LocationId"] = _tenant.LocationId ?? string.Empty,
                ["TraceId"] = HttpContext.TraceIdentifier
            });

            var opts = new SessionCreateOptions
            {
                Mode = "payment",
                SuccessUrl = $"{_frontend.PublicBaseUrl}/checkout/success?session_id={{CHECKOUT_SESSION_ID}}",
                CancelUrl  = $"{_frontend.PublicBaseUrl}/checkout/cancel",
                ClientReferenceId = payment.Id.ToString(),
                // Include tenant metadata so the webhook can rehydrate tenant context
                Metadata   = new()
                {
                    ["orderId"] = orderIdGuid.ToString(),
                    ["paymentId"] = payment.Id.ToString(),
                    ["restaurantId"] = _tenant.RestaurantId ?? string.Empty,
                    ["locationId"] = _tenant.LocationId ?? string.Empty
                },
                PaymentIntentData = new SessionPaymentIntentDataOptions
                {
                    Metadata = new()
                    {
                        ["orderId"] = orderIdGuid.ToString(),
                        ["paymentId"] = payment.Id.ToString(),
                        ["restaurantId"] = _tenant.RestaurantId ?? string.Empty,
                        ["locationId"] = _tenant.LocationId ?? string.Empty
                    }
                },
                LineItems  =
                [
                    new SessionLineItemOptions
                    {
                        Quantity = 1,
                        PriceData = new SessionLineItemPriceDataOptions
                        {
                            Currency = currency,
                            UnitAmount = amount,
                            ProductData = new() { Name = req?.Description ?? $"Order {orderIdGuid}" }
                        }
                    }
                ]
            };

            _logger.LogDebug("Creating Stripe checkout session via API for Payment {PaymentId}", payment.Id);
            var sessionService = new SessionService(_stripeClient);
            var session = await sessionService.CreateAsync(opts);
            _logger.LogInformation("Stripe checkout session created {SessionId}", session.Id);

            payment.ProviderRef = session.Id;
            payment.SessionUrl = session.Url;
            payment.UpdatedAt = DateTimeOffset.UtcNow;
            if (existing is null) await _payments.UpdateAsync(payment); else await _payments.UpdateAsync(payment);
            _logger.LogInformation("Payment {PaymentId} updated with session {SessionId}", payment.Id, session.Id);

            // Return session id for the stripe-js flow
            return Ok(new { sessionId = session.Id });
        }
        catch (Stripe.StripeException sex)
        {
            _logger.LogError(sex, "Stripe error creating checkout session: {StripeMessage} code {StripeCode} trace {TraceId}",
                sex.StripeError?.Message,
                sex.StripeError?.Code,
                HttpContext.TraceIdentifier);
            return Problem(title: "Stripe error creating checkout session", detail: sex.StripeError?.Message ?? sex.Message, statusCode: StatusCodes.Status502BadGateway);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unexpected error creating Stripe checkout session trace {TraceId}", HttpContext.TraceIdentifier);
            return Problem(title: "Error creating checkout session", detail: ex.Message, statusCode: StatusCodes.Status500InternalServerError);
        }
    }
    
    [Authorize(Policy = PaymentPolicyExtensions.Read)]
    [HttpPost("checkout/confirm")]
    public async Task<IActionResult> Confirm([FromQuery] string sessionId)
    {
        if (string.IsNullOrWhiteSpace(sessionId))
        {
            _logger.LogWarning("Confirm called without sessionId trace {TraceId}", HttpContext.TraceIdentifier);
            return BadRequest("Missing sessionId");
        }

        try
        {
            _logger.LogInformation("Confirming Stripe session {SessionId} trace {TraceId}", sessionId, HttpContext.TraceIdentifier);
            var sessionService = new SessionService(_stripeClient);
            var session = await sessionService.GetAsync(sessionId, new SessionGetOptions { Expand = ["payment_intent"] });
            var paid = string.Equals(session.PaymentStatus, "paid", StringComparison.OrdinalIgnoreCase);

            string? currency = null;
            long? amount = null;
            string? receiptUrl = null;

            if (session.PaymentIntent is Stripe.PaymentIntent pi)
            {
                currency = pi.Currency?.ToUpperInvariant();
                amount = pi.AmountReceived;
                try
                {
                    var chargeService = new ChargeService(_stripeClient);
                    var charges = await chargeService.ListAsync(new ChargeListOptions
                    {
                        PaymentIntent = pi.Id,
                        Limit = 1
                    });
                    var charge = charges?.Data?.FirstOrDefault();
                    if (charge is not null && !string.IsNullOrWhiteSpace(charge.ReceiptUrl))
                    {
                        receiptUrl = charge.ReceiptUrl;
                        _logger.LogDebug("Loaded receipt for PaymentIntent {PaymentIntentId}", pi.Id);
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogDebug(ex, "Unable to load receipt for PaymentIntent {PaymentIntentId}", pi.Id);
                }
            }

            _logger.LogInformation("Stripe session {SessionId} confirm result paid={Paid} status={Status} order={OrderId}",
                sessionId,
                paid,
                session.PaymentStatus,
                session.Metadata?["orderId"]);

            return Ok(new
            {
                status = paid ? "Paid" : session.PaymentStatus,
                amount,
                currency,
                receiptUrl,
                orderId = session.Metadata?["orderId"]
            });
        }
        catch (Stripe.StripeException sex)
        {
            _logger.LogError(sex, "Stripe error confirming session {SessionId}: {StripeMessage} code {StripeCode} trace {TraceId}",
                sessionId,
                sex.StripeError?.Message,
                sex.StripeError?.Code,
                HttpContext.TraceIdentifier);
            return Problem(title: "Stripe error confirming session", detail: sex.StripeError?.Message ?? sex.Message, statusCode: StatusCodes.Status502BadGateway);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unexpected error confirming session {SessionId} trace {TraceId}", sessionId, HttpContext.TraceIdentifier);
            return Problem(title: "Error confirming session", detail: ex.Message, statusCode: StatusCodes.Status500InternalServerError);
        }
    }


}
