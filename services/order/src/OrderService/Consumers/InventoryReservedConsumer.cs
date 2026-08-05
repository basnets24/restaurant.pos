using Common.Library;
using MassTransit;
using Messaging.Contracts.Events.Inventory;
using Messaging.Contracts.Events.Payment;
using OrderService.Entities;
using OrderService.Interfaces;

namespace OrderService.Consumers;

/// <summary>
/// Routes diner pickup orders to payment as soon as their stock is actually reserved.
///
/// Why not publish PaymentRequested inline at checkout: right after checkout the order is
/// Pending and the saga has not resolved inventory yet, so an inline publish would create a
/// Stripe PaymentIntent for an order that may be Rejected moments later when
/// InventoryReserveFaulted lands. Nothing in the payment service can cancel a PaymentIntent
/// today, so that orphan would simply sit there. Waiting for InventoryReserved means payment
/// is only ever requested for stock we hold, and the rejection path needs no compensation
/// because no PaymentIntent was ever created.
///
/// This is a plain consumer, not a saga step: Consumers/ already applies outcomes independently
/// of saga transitions (InventoryReserveFaultedConsumer is its sibling), which keeps the
/// deliberately small saga - inventory reservation only - exactly as it is.
///
/// Gated on OrderType == Pickup so POS orders are untouched: staff fire and take payment as two
/// separate acts, because a table order legitimately sits unpaid.
/// </summary>
public class InventoryReservedConsumer : IConsumer<InventoryReserved>
{
    private readonly IRepository<Order> _orders;
    private readonly IPublishEndpoint _publish;
    private readonly ICustomerNotifier _customerNotifications;
    private readonly ILogger<InventoryReservedConsumer> _logger;

    public InventoryReservedConsumer(
        IRepository<Order> orders,
        IPublishEndpoint publish,
        ICustomerNotifier customerNotifications,
        ILogger<InventoryReservedConsumer> logger)
    {
        _orders = orders;
        _publish = publish;
        _customerNotifications = customerNotifications;
        _logger = logger;
    }

    public async Task Consume(ConsumeContext<InventoryReserved> context)
    {
        var msg = context.Message;
        var order = await _orders.GetAsync(msg.OrderId);
        if (order is null)
        {
            _logger.LogWarning("InventoryReserved for unknown OrderId {OrderId}", msg.OrderId);
            return;
        }

        if (order.OrderType != OrderTypes.Pickup) return;

        // Retries and redeliveries land here again; a settled or dead order must not be charged.
        if (order.Status is OrderStatus.Paid or OrderStatus.Cancelled or OrderStatus.Rejected)
        {
            _logger.LogInformation("Skipping payment request for order {OrderId} in status {Status}",
                order.Id, order.Status);
            return;
        }

        await _publish.Publish(new PaymentRequested(
            CorrelationId: order.Id,
            OrderId: order.Id,
            TableId: order.TableId ?? Guid.Empty,
            AmountCents: (long)(order.GrandTotal * 100m),
            RestaurantId: order.RestaurantId,
            LocationId: order.LocationId,
            // Carries ownership across to a service that has no order data of its own; it is
            // what stops one diner pulling another's Stripe client secret.
            CustomerId: order.CustomerId
        ), context.CancellationToken);

        // Sent here rather than at checkout because this is the first moment the answer is
        // actually known: at checkout the order is Pending with its stock unresolved, and
        // "confirmed" would be a guess that InventoryReserveFaulted could contradict seconds
        // later. The same guard above that stops a settled order being charged twice stops this
        // being sent twice on a redelivery.
        await _customerNotifications.NotifyAsync(order,
            CustomerNotificationType.OrderConfirmed,
            "Order confirmed",
            "The kitchen has your order. Finish paying to lock in your pickup.",
            context.CancellationToken);

        _logger.LogInformation("Payment requested for pickup order {OrderId} ({AmountCents} cents)",
            order.Id, (long)(order.GrandTotal * 100m));
    }
}
