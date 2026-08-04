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

    [HttpGet("orders/{orderId:guid}")]
    [Authorize(Policy = OrderPolicyExtensions.DinerRead)]
    public async Task<ActionResult<OrderDto>> MyOrder(Guid orderId, CancellationToken ct)
        => Ok((await _diner.GetMyOrderAsync(orderId, ct)).ToDto());
}
