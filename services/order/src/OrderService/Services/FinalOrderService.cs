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
    private readonly IPricingService _pricingService;
    
    public FinalOrderService(IRepository<Order> orders, 
        ILogger<FinalOrderService> logger, 
        IPublishEndpoint publishEndpoint, 
        IPricingService pricingService)
    {
        _orders = orders;
        _logger = logger;
        _publishEndpoint = publishEndpoint;
        _pricingService = pricingService;
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
        
        
        var subtotal = dto.Subtotal;
        var tip = dto.TipAmount ?? 0m;
        
        // NEW: config-driven pricing
        // (non-stacking discounts,
        // taxable service charges,
        // multiple taxes)
        var p = _pricingService.Calculate(subtotal, tip);

        var discountTotal = p.DiscountTotal;
        var serviceChargeTotal = p.ServiceChargeTotal;
        var taxTotal = p.TaxTotal;
        var grand = p.GrandTotal;
        
        var order = new Order
        {
            CreatedAt = DateTimeOffset.UtcNow,
            Id = orderId,
            Items = dto.Items,
            TotalAmount = dto.Subtotal,
            Status = "Pending",
            
            // Context
            TableId = dto.TableId,
            ServerId = dto.ServerId,
            GuestCount = dto.GuestCount,
            
            // order-level itemized lines (all are Scope="Order")
            AppliedDiscounts = p.AppliedDiscounts.ToList(),
            ServiceCharges   = p.ServiceCharges.ToList(),
            AppliedTaxes     = p.AppliedTaxes.ToList(),
            
            // Totals
            Subtotal = subtotal,
            DiscountTotal = discountTotal,
            ServiceChargeTotal = serviceChargeTotal,
            TaxTotal = taxTotal,
            TipAmount = tip,
            GrandTotal = grand,
            
        };
        
        await _orders.CreateAsync(order);
        _logger.LogInformation("Order {OrderId} created", orderId);

        await _publishEndpoint.Publish(new OrderSubmitted(
            correlationId,
            orderId,
            dto.Items.Select(i => new OrderItemMessage(i.MenuItemId, i.Quantity)).ToList(),
            dto.Subtotal
        ), cancellationToken); 
        
        return order;
    }
}