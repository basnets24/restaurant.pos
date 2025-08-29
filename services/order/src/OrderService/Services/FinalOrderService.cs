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

        var sub = dto.TotalAmount;
        var discountTotal = (dto.AppliedDiscounts?.Sum(d => d.Amount ?? 0) +
            (dto.AppliedDiscounts?.Sum(d => d.Percent ?? 0) * sub / 100) ?? 0); 
        
        var serviceChargeTotal = (dto.ServiceCharges?.Sum(d => d.Amount ?? 0) +
                                  dto.ServiceCharges?.Sum(d => d.Percent ?? 0) * sub / 100 ?? 0); 
        
        // Tax base: after discounts + any taxable service charges
        var taxableBase = (sub - discountTotal) +
                          (dto.ServiceCharges?.Where(s => s.Taxable).Sum(s =>
                              (s.Amount ?? 0) + ((s.Percent ?? 0) * sub / 100)) ?? 0);
        
        var taxTotal = (
            (dto.AppliedTaxes?.Sum(t => t.Amount ?? 0) ?? 0) +
            (dto.AppliedTaxes?.Sum(t => (t.RatePercent ?? 0) * taxableBase / 100) ?? 0)
        );
        
        var tip = dto.TipAmount ?? 0m;
        var grand = sub - discountTotal + serviceChargeTotal + taxTotal + tip;
        
        
        var order = new Order
        {
            CreatedAt = DateTimeOffset.UtcNow,
            Id = orderId,
            Items = dto.Items,
            TotalAmount = dto.TotalAmount,
            Status = "Pending",
            
            // Context
            TableId = dto.TableId,
            ServerId = dto.ServerId,
            GuestCount = dto.GuestCount,
            
            // Totals
            Subtotal = sub,
            DiscountTotal = discountTotal,
            ServiceChargeTotal = serviceChargeTotal,
            TaxTotal = taxTotal,
            TipAmount = dto.TipAmount,
            GrandTotal = grand,
            
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