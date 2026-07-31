using Common.Library;
using Common.Library.Tenancy;
using MassTransit;
using Messaging.Contracts.Events.Inventory;
using Messaging.Contracts.Events.Order;
using OrderService.Dtos;
using OrderService.Entities;
using OrderService.Exceptions;
using OrderService.Interfaces;
using OrderService.Mappers;

namespace OrderService.Services;

public class FinalOrderService : IOrderService
{
    private readonly IRepository<Order> _orders;
    private readonly ILogger<FinalOrderService> _logger;
    private readonly IPublishEndpoint _publishEndpoint;
    private readonly IRepository<DiningTable> _tables;
    private readonly IPricingService _pricingService;
    private readonly ITenantContext _tenant;
    private readonly INotificationService _notifications;

    public FinalOrderService(IRepository<Order> orders,
        ILogger<FinalOrderService> logger,
        IPublishEndpoint publishEndpoint,
        IPricingService pricingService,
        IRepository<DiningTable> tables,
        ITenantContext tenant,
        INotificationService notifications)
    {
        _orders = orders;
        _logger = logger;
        _publishEndpoint = publishEndpoint;
        _pricingService = pricingService;
        _tables = tables;
        _tenant = tenant;
        _notifications = notifications;
    }


    public async Task<Order> FinalizeOrderAsync(
        FinalizeOrderDto dto, 
        Guid? idempotencyKey, 
        CancellationToken cancellationToken = default)
    {
        var orderId = idempotencyKey ?? Guid.NewGuid();
        var existingOrder = await _orders.GetAsync(orderId);
        if (existingOrder is not null) return existingOrder;

        // NEW: config-driven pricing
        // (non-stacking discounts,
        // taxable service charges,
        // multiple taxes)
        var pricing = _pricingService.Calculate(dto.Subtotal, dto.TipAmount ?? 0m,
            new PricingContext(dto.GuestCount, DineIn: dto.TableId != null));

        var order = dto.ToOrder(orderId, pricing);

        await _orders.CreateAsync(order);
        _logger.LogInformation("Order {OrderId} created", orderId);
        _logger.LogInformation("Subtotal is {subtotal}, tax is {tax}, service charge is {serviceCharge}, tip is {tip}, " +
                                "grand total is {grandTotal}", dto.Subtotal, pricing.TaxTotal, pricing.ServiceChargeTotal, pricing.Tip, pricing.GrandTotal);

        // when pos only, table id is present
        await _publishEndpoint.Publish(new OrderSubmitted(
            Guid.NewGuid(),
            orderId,
            TableId: dto.TableId ?? Guid.Empty,
            dto.Items.Select(i => new OrderItemMessage(i.MenuItemId, i.Quantity)).ToList(),
            pricing.GrandTotal,
            _tenant.RestaurantId, _tenant.LocationId
        ), cancellationToken);

        return order;
    }
    
    public async Task MarkPaidAsync(Guid orderId, CancellationToken ct = default)
    {
        var order = await _orders.GetAsync(orderId) ?? throw new KeyNotFoundException("Order not found");
        if (order.Status == OrderStatus.Paid) return;

        order.Status = OrderStatus.Paid;
        order.PaidAt = DateTimeOffset.UtcNow;
        await _orders.UpdateAsync(order);

        if (order.TableId is Guid tableId)
        {
            var table = await _tables.GetAsync(tableId);
            if (table != null)
            {
                table.Status = DiningTableStatus.Available;
                table.ActiveCartId = null;
                await _tables.UpdateAsync(table);
            }
        }
    }

    public async Task CancelAsync(Guid orderId, CancellationToken ct = default)
    {
        var order = await _orders.GetAsync(orderId) ?? throw new KeyNotFoundException("Order not found");
        if (order.Status == OrderStatus.Paid)
            throw new ConflictException("Order is already paid and cannot be cancelled.");
        if (order.Status == OrderStatus.Rejected)
            throw new ConflictException("Order was never fulfilled and cannot be cancelled.");
        if (order.Status == OrderStatus.Cancelled)
            return; // idempotent

        order.Status = OrderStatus.Cancelled;
        order.CancelledAt = DateTimeOffset.UtcNow;
        await _orders.UpdateAsync(order);

        await _publishEndpoint.Publish(new ReleaseInventory(
            CorrelationId: order.Id,
            OrderId: order.Id,
            Items: order.Items.Select(i => new OrderItemMessage(i.MenuItemId, i.Quantity)).ToList(),
            RestaurantId: order.RestaurantId,
            LocationId: order.LocationId
        ), ct);

        _logger.LogInformation("Order {OrderId} cancelled", orderId);

        await _notifications.NotifyAsync(
            NotificationType.OrderCancelled,
            "Order cancelled",
            null, "Order", order.Id, ct);
    }

}