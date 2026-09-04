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
    private readonly ICustomerOrderHistory _history;
    private readonly ICustomerNotifier _customerNotifications;

    public FinalOrderService(IRepository<Order> orders,
        ILogger<FinalOrderService> logger,
        IPublishEndpoint publishEndpoint,
        IPricingService pricingService,
        IRepository<DiningTable> tables,
        ITenantContext tenant,
        INotificationService notifications,
        ICustomerOrderHistory history,
        ICustomerNotifier customerNotifications)
    {
        _history = history;
        _customerNotifications = customerNotifications;
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

        // Written here rather than projected off OrderSubmitted: this service is both the
        // publisher and the only consumer of that event, so the broker round trip would buy
        // nothing but a window where a diner's own order is missing from their history.
        await _history.RecordAsync(order, cancellationToken);
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
        await _history.RecordAsync(order, ct);

        // No amount in the text, deliberately. Formatting money is the frontend's job - `money()`
        // owns the one currency assumption in the app - and a ":C" here renders in whatever
        // culture the server host happens to run under, which on a dev machine is not the
        // diner's. The notification links to the order, which shows the total properly.
        await _customerNotifications.NotifyAsync(order,
            CustomerNotificationType.OrderPaid,
            "Payment received",
            "Your order is paid. We'll have it ready for pickup.", ct);

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

    public async Task MarkServedAsync(Guid orderId, CancellationToken ct = default)
    {
        var order = await _orders.GetAsync(orderId) ?? throw new KeyNotFoundException("Order not found");
        if (order.Status is OrderStatus.Cancelled or OrderStatus.Rejected)
            throw new ConflictException("Order was cancelled and cannot be marked served.");
        if (order.ServedAt is not null) return; // idempotent

        order.ServedAt = DateTimeOffset.UtcNow;
        await _orders.UpdateAsync(order);
    }

    public async Task CancelAsync(Guid orderId, string? reason = null, CancellationToken ct = default)
    {
        var order = await _orders.GetAsync(orderId) ?? throw new KeyNotFoundException("Order not found");
        if (order.Status == OrderStatus.Paid)
            throw new ConflictException("Order is already paid and cannot be cancelled.");
        if (order.Status == OrderStatus.Rejected)
            throw new ConflictException("Order was never fulfilled and cannot be cancelled.");
        if (order.Status == OrderStatus.Cancelled)
            return; // idempotent
        // Once served, the reserved ingredients were actually used - releasing
        // them back to stock here would phantom-restock inventory that's gone.
        // A served-but-unpaid order needs a write-off/comp path, not this one.
        if (order.ServedAt is not null)
            throw new ConflictException("Order has already been served and cannot be voided.");

        order.Status = OrderStatus.Cancelled;
        order.CancelledAt = DateTimeOffset.UtcNow;
        await _orders.UpdateAsync(order);
        await _history.RecordAsync(order, ct);

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

        // Raised for the diner's own cancel too, not just the sweep's and the staff's. It is the
        // one record of the order ending that outlives the screen they tapped it on.
        await _customerNotifications.NotifyAsync(order,
            CustomerNotificationType.OrderCancelled,
            "Order cancelled",
            reason ?? "Your order was cancelled. You haven't been charged.", ct);
    }

}