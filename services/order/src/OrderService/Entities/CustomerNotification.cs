using Common.Library;

namespace OrderService.Entities;

/// <summary>
/// Something the diner needs to hear about one of their orders.
///
/// A separate table from <see cref="Notification"/> rather than a nullable CustomerId on it,
/// for two reasons. The audiences are disjoint - a cook has no use for "your card was declined"
/// and a diner has none for "table 6 needs cleaning" - and folding them together would mean
/// every existing staff query silently acquiring a "and not addressed to a customer" clause
/// that is invisible to forget. The scoping is disjoint too: <see cref="Notification"/> is
/// <c>ITenantEntity</c> and belongs to one restaurant, while this, like
/// <see cref="CustomerOrderSummary"/>, is deliberately **not** tenant-scoped, because a diner's
/// notifications span every restaurant they have ordered from and the diner belongs to none of
/// them. Restaurant/location are plain columns saying where the order was, not a scoping key.
///
/// Delivery is by polling only. Staff notifications also get a live SignalR push, but that hub
/// broadcasts to a per-tenant group that a diner is not - and should not be - a member of.
/// </summary>
public class CustomerNotification : IEntity
{
    public Guid Id { get; set; }
    public Guid CustomerId { get; set; }

    /// <summary>The order this is about. Every type is order-scoped today, so it is not nullable -
    /// the diner surface has nothing else to notify anyone about.</summary>
    public Guid OrderId { get; set; }

    public string RestaurantId { get; set; } = default!;
    public string LocationId { get; set; } = default!;

    /// <summary>Copied off the order's <see cref="CustomerOrderSummary"/> rather than resolved
    /// again, so this costs a primary-key read and no HTTP call. Null when the name could not be
    /// resolved when the order was placed.</summary>
    public string? RestaurantName { get; set; }

    /// <summary>See <see cref="CustomerNotificationType"/>.</summary>
    public string Type { get; set; } = default!;
    public string Title { get; set; } = default!;
    public string? Message { get; set; }

    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset? ReadAt { get; set; }
}

/// <summary>
/// Customer-addressed types, kept apart from <see cref="NotificationType"/> on purpose: those
/// values name things that happen to a restaurant's floor, these name things that happen to a
/// diner's order. Nothing should ever be valid in both sets.
/// </summary>
public static class CustomerNotificationType
{
    /// <summary>Stock is reserved and the kitchen has the order.</summary>
    public const string OrderConfirmed = "OrderConfirmed";

    /// <summary>Stock ran out between checkout and reservation; nothing was charged.</summary>
    public const string OrderRejected = "OrderRejected";

    public const string OrderPaid = "OrderPaid";

    /// <summary>A declined card. The order stays live and payable, so this is a nudge, not an
    /// ending - see <c>PaymentFailedConsumer</c>.</summary>
    public const string PaymentFailed = "PaymentFailed";

    public const string OrderCancelled = "OrderCancelled";
}
