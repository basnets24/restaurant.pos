using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;
using PaymentService.Settings;
using Stripe.Checkout;

namespace PaymentService.Controllers;


[ApiController]
[Route("api/payments/stripe")]
public class StripeController : ControllerBase
{
    private readonly StripeSettings _stripe;
    private readonly FrontendSettings _frontend;
    private readonly ILogger<StripeController> _logger;

    public StripeController(
        IOptions<StripeSettings> stripeOptions,
        IOptions<FrontendSettings> frontendOptions,
        ILogger<StripeController> logger)
    {
        _stripe = stripeOptions.Value;
        _frontend = frontendOptions.Value;
        _logger = logger;
    }
    
    // POST /api/payments/stripe/checkout/session
    [HttpPost("checkout/session")]
    public async Task<IActionResult> CreateCheckoutSession([FromBody] CreateCheckoutRequest? req)
    {
        var amount = req?.Amount ?? 2599L; // cents (compute server-side in real app!)
        var currency = string.IsNullOrWhiteSpace(req?.Currency) ? "usd" : req!.Currency.ToLowerInvariant();
        var orderId = req?.OrderId ?? Guid.NewGuid().ToString();

        var opts = new SessionCreateOptions
        {
            Mode = "payment",
            SuccessUrl = $"{_frontend.PublicBaseUrl}/checkout/success?session_id={{CHECKOUT_SESSION_ID}}",
            CancelUrl  = $"{_frontend.PublicBaseUrl}/checkout/cancel",
            Metadata   = new() { ["orderId"] = orderId },
            LineItems  =
            [
                new SessionLineItemOptions
                {
                    Quantity = 1,
                    PriceData = new SessionLineItemPriceDataOptions
                    {
                        Currency = currency,
                        UnitAmount = amount,
                        ProductData = new() { Name = req?.Description ?? $"Order {orderId}" }
                    }
                }
            ]
        };

        var session = await new Stripe.Checkout.SessionService().CreateAsync(opts);

        // 👇 return ONLY sessionId for the stripe-js flow
        return Ok(new { sessionId = session.Id });
    }
    
    [HttpPost("checkout/confirm")]
    public async Task<IActionResult> Confirm([FromQuery] string sessionId)
    {
        if (string.IsNullOrWhiteSpace(sessionId)) return BadRequest("Missing sessionId");

        var session = await new Stripe.Checkout.SessionService().GetAsync(sessionId, new Stripe.Checkout.SessionGetOptions { Expand = ["payment_intent"] });
        var paid = string.Equals(session.PaymentStatus, "paid", StringComparison.OrdinalIgnoreCase);

        string? currency = null;
        long? amount = null;
        string? receiptUrl = null;

        if (session.PaymentIntent is Stripe.PaymentIntent pi)
        {
            currency = pi.Currency?.ToUpperInvariant();
            amount = pi.AmountReceived ;
            
        }

        return Ok(new { status = paid ? "Paid" : session.PaymentStatus, amount, currency, receiptUrl,
            orderId = session.Metadata?["orderId"] });
    }


}