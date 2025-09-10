// PaymentService/Controllers/PaymentSessionController.cs
using Common.Library;
using Microsoft.AspNetCore.Mvc;
using PaymentService.Entities;
using Stripe.Checkout;

namespace PaymentService.Controllers;

[ApiController]
[Route("api/orders/{orderId:guid}/payment-session")]
public sealed class PaymentSessionController : ControllerBase
{
    private readonly IRepository<Payment> _payments;

    public PaymentSessionController(IRepository<Payment> payments)
        => _payments = payments;

    // GET /api/orders/{orderId}/payment-session
    [HttpGet]
    public async Task<IActionResult> Get(Guid orderId)
    {
        // Find latest payment attempt for this order (tenant-scoped via ITenantEntity)
        var payment = await _payments.GetAsync(p => p.OrderId == orderId && p.Provider == "Stripe");
        if (payment is null) return NotFound(); // nothing created yet

        // If webhook already finished, no need to redirect the user anymore
        if (string.Equals(payment.Status, "Succeeded", StringComparison.OrdinalIgnoreCase) ||
            string.Equals(payment.Status, "Failed", StringComparison.OrdinalIgnoreCase))
        {
            return Ok(new { sessionUrl = (string?)null, status = payment.Status, error = payment.ErrorMessage });
        }

        // We stored the Checkout Session id in ProviderRef; fetch the live URL from Stripe
        if (string.IsNullOrWhiteSpace(payment.ProviderRef)) return NotFound();

        var svc = new SessionService();
        var session = await svc.GetAsync(payment.ProviderRef); // needs Stripe secret configured
        // Session.Url is only present for "hosted" Checkout (not embedded)
        return Ok(new { sessionUrl = session.Url });
    }
}