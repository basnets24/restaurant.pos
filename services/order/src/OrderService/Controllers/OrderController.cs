using Common.Library;
using MassTransit;
using Messaging.Contracts.Events.Order;
using Microsoft.AspNetCore.Mvc;
using OrderService.Dtos;
using OrderService.Entities;

namespace OrderService.Controllers;

[ApiController]
[Route("orders")]
public class OrderController : ControllerBase
{
    private readonly ILogger<OrderController> _logger;
    private readonly IRepository<Order> _orderRepo;
    private readonly IPublishEndpoint _publishEndpoint;

    public OrderController(
        ILogger<OrderController> logger,
        IRepository<Order> orderRepo,
        IPublishEndpoint publishEndpoint)
    {
        _logger = logger;
        _orderRepo = orderRepo;
        _publishEndpoint = publishEndpoint;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<OrderDto>>> GetAsync()
    {
        var orders = await _orderRepo.GetAllAsync();
        return Ok(orders.Select(o => o.ToDto()));
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<OrderDto>> GetByIdAsync(Guid id)
    {
        var order = await _orderRepo.GetAsync(id);
        return order is null ? NotFound() : Ok(order.ToDto());
    }

    [HttpPost]
    public async Task<ActionResult<OrderDto>> PostAsync([FromBody] FinalizeOrderDto dto)
    {
        var orderId = Guid.NewGuid();
        var correlationId = Guid.NewGuid();

        var order = new Order
        {
            Id = orderId,
            Items = dto.Items,
            TotalAmount = dto.TotalAmount,
            Status = "Pending",
            CreatedAt = DateTimeOffset.UtcNow
        };

        await _orderRepo.CreateAsync(order);
        _logger.LogInformation("Order {OrderId} created", orderId);

        await _publishEndpoint.Publish(new OrderSubmitted(
            CorrelationId: correlationId,
            OrderId: order.Id,
            Items: order.Items.Select(i => new OrderItemMessage(i.MenuItemId, i.Quantity)).ToList(),
            TotalAmount: order.TotalAmount
        ));

        return CreatedAtAction(nameof(GetByIdAsync), new { id = order.Id }, order.ToDto());
    }
}