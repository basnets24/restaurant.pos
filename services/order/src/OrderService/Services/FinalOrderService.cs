using Common.Library;
using Common.Library.Tenancy;
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
    private readonly IRepository<DiningTable> _tables;
    private readonly IPricingService _pricingService;
    private readonly ITenantContext _tenant;
    
    public FinalOrderService(IRepository<Order> orders, 
        ILogger<FinalOrderService> logger, 
        IPublishEndpoint publishEndpoint, 
        IPricingService pricingService, 
        IRepository<DiningTable> tables, 
        ITenantContext tenant)
    {
        _orders = orders;
        _logger = logger;
        _publishEndpoint = publishEndpoint;
        _pricingService = pricingService;
        _tables = tables;
        _tenant = tenant;
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
        var p = _pricingService.Calculate(subtotal, tip, 
            new PricingContext(dto.GuestCount, DineIn: dto.TableId != null));
        
        var order = new Order
        {
            CreatedAt = DateTimeOffset.UtcNow,
            Id = orderId,
            Items = dto.Items,
            Status = "Pending",
            
            // Context
            TableId = dto.TableId,
            ServerId = dto.ServerId,
            ServerName = dto.ServerName,
            GuestCount = dto.GuestCount,
            
            // order-level itemized lines (all are Scope="Order")
            AppliedDiscounts = p.AppliedDiscounts.ToList(),
            ServiceCharges   = p.ServiceCharges.ToList(),
            AppliedTaxes     = p.AppliedTaxes.ToList(),
            
            // Totals
            Subtotal = subtotal,
            DiscountTotal = p.DiscountTotal,
            ServiceChargeTotal = p.ServiceChargeTotal,
            TaxTotal = p.TaxTotal,
            TipAmount = p.Tip,
            GrandTotal = p.GrandTotal,
            
        };
        
        await _orders.CreateAsync(order);
        _logger.LogInformation("Order {OrderId} created", orderId);
        _logger.LogInformation( "Subtotal is {subtotal}, tax is {tax}, service charge is {serviceCharge}, tip is {tip}, " +
                                "grand total is {grandTotal}", subtotal, p.TaxTotal, p.ServiceChargeTotal, p.Tip, p.GrandTotal);;

        // when pos only, table id is present
        await _publishEndpoint.Publish(new OrderSubmitted(
            correlationId,
            orderId,
            TableId: dto.TableId ?? Guid.Empty,
            dto.Items.Select(i => new OrderItemMessage(i.MenuItemId, i.Quantity)).ToList(),
            p.GrandTotal, 
            _tenant.RestaurantId, _tenant.LocationId
        ), cancellationToken); 
        
        return order;
    }
    
    public async Task MarkPaidAsync(Guid orderId, CancellationToken ct = default)
    {
        var order = await _orders.GetAsync(orderId) ?? throw new KeyNotFoundException("Order not found");
        if (order.Status == "Paid") return;

        order.Status = "Paid";
        await _orders.UpdateAsync(order);

        if (order.TableId is Guid tableId)
        {
            var table = await _tables.GetAsync(tableId);
            if (table != null)
            {
                table.Status = "Available";
                table.ActiveCartId = null;
                await _tables.UpdateAsync(table);
            }
        }
    }

}