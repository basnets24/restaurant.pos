using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using OrderService.Auth;
using OrderService.Dtos;
using OrderService.Interfaces;
using OrderService.Mappers;

namespace OrderService.Controllers;

/// <summary>
/// Customer-facing ordering. Separate from <see cref="OrderController"/> on purpose: these
/// routes sit behind the <c>diner</c> scope, which no staff token carries, and every one of
/// them is scoped to the caller's own orders in the service layer. Staff routes stay
/// role-gated and unscoped by customer, so neither side can reach the other's endpoints.
/// </summary>
[ApiController]
[Route("diner")]
public class DinerController : ControllerBase
{
    private readonly IDinerOrderService _diner;

    public DinerController(IDinerOrderService diner) => _diner = diner;

    /// <summary>What this cart would cost, without placing it. Lets the checkout screen show a
    /// server-computed total instead of guessing at tax client-side.</summary>
    [HttpPost("quote")]
    [Authorize(Policy = OrderPolicyExtensions.DinerRead)]
    public async Task<ActionResult<CartEstimateDto>> Quote(DinerCheckoutDto dto, CancellationToken ct)
        => Ok(await _diner.QuoteAsync(dto, ct));

    /// <summary>Fires the diner's cart to the kitchen. Payment is requested automatically once
    /// inventory is reserved, so the client's next step is to poll for the payment session.</summary>
    [HttpPost("checkout")]
    [Authorize(Policy = OrderPolicyExtensions.DinerWrite)]
    public async Task<ActionResult<DinerCheckoutResultDto>> Checkout(DinerCheckoutDto dto, CancellationToken ct)
        => Ok(await _diner.CheckoutAsync(dto, ct));

    [HttpGet("orders")]
    [Authorize(Policy = OrderPolicyExtensions.DinerRead)]
    public async Task<ActionResult<IEnumerable<OrderDto>>> MyOrders(CancellationToken ct)
    {
        var orders = await _diner.GetMyOrdersAsync(ct);
        return Ok(orders.Select(o => o.ToDto()));
    }

    /// <summary>Every order this diner has placed, at any restaurant. The tenant headers on the
    /// request are ignored here by design - the whole point is to look past them.</summary>
    [HttpGet("history")]
    [Authorize(Policy = OrderPolicyExtensions.DinerRead)]
    public async Task<ActionResult<IEnumerable<DinerOrderSummaryDto>>> MyHistory(CancellationToken ct)
        => Ok(await _diner.GetMyHistoryAsync(ct));

    [HttpGet("orders/{orderId:guid}")]
    [Authorize(Policy = OrderPolicyExtensions.DinerRead)]
    public async Task<ActionResult<OrderDto>> MyOrder(Guid orderId, CancellationToken ct)
        => Ok((await _diner.GetMyOrderAsync(orderId, ct)).ToDto());

    /// <summary>Calls off the diner's own order while it is still unpaid. Separate from the
    /// staff cancel on <see cref="OrderController"/>, which can reach any order in the tenant;
    /// this one is scoped to the caller's own and delegates to the same cancel path.</summary>
    [HttpPost("orders/{orderId:guid}/cancel")]
    [Authorize(Policy = OrderPolicyExtensions.DinerWrite)]
    public async Task<IActionResult> CancelMyOrder(Guid orderId, CancellationToken ct)
    {
        await _diner.CancelMyOrderAsync(orderId, ct);
        return NoContent();
    }
}
