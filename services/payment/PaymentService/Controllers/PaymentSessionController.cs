using Common.Library;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PaymentService.Auth;
using PaymentService.Entities;

namespace PaymentService.Controllers;

[ApiController]
[Route("orders")] 
public class PaymentSessionController : ControllerBase
{
    private readonly IRepository<Payment> _payments;
    private readonly ILogger<PaymentSessionController> _logger;

    public PaymentSessionController(IRepository<Payment> payments, 
        ILogger<PaymentSessionController> logger)
    {
        _payments = payments;
        _logger = logger;
    }

    // GET orders/{orderId}/payment-session
    [Authorize(Policy = PaymentPolicyExtensions.Read)]
    [HttpGet("{orderId:guid}/payment-session")]
    public async Task<IActionResult> GetPaymentSession([FromRoute] Guid orderId)
    {
        var payment = await _payments.GetAsync(p => p.OrderId == orderId);

        if (payment is null)
        {
            // Not materialized yet (pending)
            return StatusCode(404, new { sessionUrl = (string?)null, status = "pending" });
        }

        var status = (payment.Status ?? "").Trim().ToLowerInvariant();
        if (status == "succeeded") return Ok(new { status = "succeeded" });
        if (status == "failed")    return Ok(new { status = "failed" });

        // Pending
        if (string.IsNullOrWhiteSpace(payment.SessionUrl))
            return StatusCode(202, new { sessionUrl = (string?)null, status = "pending" });

        return Ok(new { sessionUrl = payment.SessionUrl });
    }
}

