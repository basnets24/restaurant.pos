using Common.Library;
using MassTransit;
using Messaging.Contracts.Events.Order;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using OrderService.Auth;
using OrderService.Dtos;
using OrderService.Entities;
using OrderService.Interfaces;

namespace OrderService.Controllers;

[ApiController]
[Route("orders")]
public class OrderController : ControllerBase
{
    private readonly IRepository<Order> _orderRepo;
    private readonly IOrderService _orders;

    public OrderController(
        IRepository<Order> orderRepo, 
        IOrderService orders)
    {
        _orderRepo = orderRepo;
        _orders = orders;
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
}