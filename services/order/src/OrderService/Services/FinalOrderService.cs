using Common.Library;
using MassTransit;
using Messaging.Contracts.Events.Order;
using OrderService.Dtos;
using OrderService.Entities;
using OrderService.Interfaces;

namespace OrderService.Services;

public class FinalOrderService : IOrderService
{
    private readonly IRepository<Order> _orders;
    private readonly ILogger<FinalOrderService> _logger;
    private readonly IPublishEndpoint _publishEndpoint;
    
    
    public FinalOrderService(IRepository<Order> orders, 
        ILogger<FinalOrderService> logger, 
        IPublishEndpoint publishEndpoint)
    {
        _orders = orders;
        _logger = logger;
        _publishEndpoint = publishEndpoint;
    }


    public async Task<Order> FinalizeOrderAsync(
        FinalizeOrderDto dto, 
        Guid? idempotencyKey, 
        CancellationToken cancellationToken = default)
    {
        var orderId = idempotencyKey ?? Guid.NewGuid();
        var correlationId = Guid.NewGuid();
        var existingOrder = await _orders.GetAsync(orderId);
        if ( existingOrder is not null ) return existingOrder;

        var order = new Order
        {
            CreatedAt = DateTimeOffset.UtcNow,
            Id = orderId,
            Items = dto.Items,
            TotalAmount = dto.TotalAmount,
            Status = "Pending"
        };
        
        await _orders.CreateAsync(order);
        _logger.LogInformation("Order {OrderId} created", orderId);

        await _publishEndpoint.Publish(new OrderSubmitted(
            correlationId,
            orderId,
            dto.Items.Select(i => new OrderItemMessage(i.MenuItemId, i.Quantity)).ToList(),
            dto.TotalAmount
        ), cancellationToken); 
        
        return order;
    }
}