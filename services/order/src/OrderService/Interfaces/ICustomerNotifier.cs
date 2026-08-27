using OrderService.Entities;

namespace OrderService.Interfaces;

/// <summary>
/// Writes and reads the diner's own notifications. Distinct from
/// <see cref="INotificationService"/>, which addresses restaurant staff - see
/// <see cref="CustomerNotification"/> for why the two are not one thing.
/// </summary>
public interface ICustomerNotifier
{
    /// <summary>
    /// Records a notification against the order's customer. A no-op for an order with no
    /// customer, so the staff order paths can call it without first asking whether anyone is
    /// listening.
    /// </summary>
    Task NotifyAsync(Order order, string type, string title, string? message, CancellationToken ct = default);

    /// <summary>Newest first, across every restaurant.</summary>
    Task<IReadOnlyList<CustomerNotification>> GetForCustomerAsync(
        Guid customerId, int take, CancellationToken ct = default);

    /// <summary>Marks one of the caller's own notifications read. Silently ignores an id
    /// belonging to someone else, for the same reason the order read path 404s rather than
    /// 403s: a bare GUID must not be able to confirm what exists.</summary>
    Task MarkReadAsync(Guid customerId, Guid notificationId, CancellationToken ct = default);

    /// <summary>Clears the badge in one call, so a diner with a backlog is not made to tap
    /// through it.</summary>
    Task MarkAllReadAsync(Guid customerId, CancellationToken ct = default);
}
