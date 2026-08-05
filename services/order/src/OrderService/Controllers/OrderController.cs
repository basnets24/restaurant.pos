using Common.Library;
using MassTransit;
using Messaging.Contracts.Events.Order;
using Messaging.Contracts.Events.Payment;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using OrderService.Auth;
using OrderService.Dtos;
using OrderService.Entities;
using OrderService.Interfaces;
using OrderService.Mappers;

namespace OrderService.Controllers;

[ApiController]
[Route("orders")]
public class OrderController : ControllerBase
{
    private readonly IRepository<Order> _orderRepo;
    private readonly IOrderService _orders;
    private readonly IPublishEndpoint _publish;

    public OrderController(
        IRepository<Order> orderRepo,
        IOrderService orders,
        IPublishEndpoint publish)
    {
        _orderRepo = orderRepo;
        _orders = orders;
        _publish = publish;
    }

    [HttpGet]
    [Authorize(Policy = OrderPolicyExtensions.Read)]
    public async Task<ActionResult<IEnumerable<OrderDto>>> GetAsync()
    {
        var orders = await _orderRepo.GetAllAsync();
        return Ok(orders.Select(o => o.ToDto()));
    }

    [HttpGet("{id}")]
    [Authorize(Policy = OrderPolicyExtensions.Read)]
    public async Task<ActionResult<OrderDto>> GetByIdAsync(Guid id)
    {
        var order = await _orderRepo.GetAsync(id);
        return order is null ? NotFound() : Ok(order.ToDto());
    }

    [HttpPost]
    [Authorize(Policy = OrderPolicyExtensions.Write)]
    public async Task<ActionResult<OrderDto>> PostAsync(
        [FromBody] FinalizeOrderDto dto
        , [FromQuery] Guid? idempotencyKey,
        CancellationToken ct)
    {
        var order = await _orders.FinalizeOrderAsync(dto, idempotencyKey, ct);
        return CreatedAtAction(nameof(GetByIdAsync), new { id = order.Id }, order.ToDto());
    }

    [HttpPost("{orderId:guid}/request-payment")]
    [Authorize(Policy = OrderPolicyExtensions.Write)]
    public async Task<IActionResult> RequestPayment(Guid orderId, CancellationToken ct)
    {
        var order = await _orderRepo.GetAsync(orderId);
        if (order is null) return NotFound();
        if (order.Status == OrderStatus.Paid) return Conflict(new { message = "Order is already paid." });
        if (order.Status == OrderStatus.Rejected) return Conflict(new { message = "Order was never fulfilled and cannot be paid." });

        await _publish.Publish(new PaymentRequested(
            CorrelationId: order.Id,
            OrderId: order.Id,
            TableId: order.TableId ?? Guid.Empty,
            AmountCents: (long)(order.GrandTotal * 100m),
            RestaurantId: order.RestaurantId,
            LocationId: order.LocationId,
            // Null for a walk-in, which is the usual case here. Passed anyway so that a diner's
            // order re-requested from the POS lands on the same owner the diner's own path sets,
            // rather than silently locking them out of their payment session.
            CustomerId: order.CustomerId
        ), ct);

        return Accepted();
    }

    [HttpPost("{orderId:guid}/cancel")]
    [Authorize(Policy = OrderPolicyExtensions.Write)]
    public async Task<IActionResult> Cancel(Guid orderId, CancellationToken ct)
    {
        await _orders.CancelAsync(orderId, ct);
        return NoContent();
    }
}