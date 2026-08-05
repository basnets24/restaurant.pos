using Microsoft.EntityFrameworkCore;
using OrderService.Data;
using OrderService.Entities;
using OrderService.Interfaces;

namespace OrderService.Services;

/// <summary>
/// The diner's side of notifications.
///
/// Like <see cref="CustomerOrderHistoryService"/>, this goes through <see cref="OrderDbContext"/>
/// rather than an <c>IRepository&lt;T&gt;</c>: the repository is <c>TenantEfRepository</c>, which
/// would stamp the ambient tenant on write and filter by it on read, and both would undo the
/// point of the table. Omitting the tenant stamp is deliberate - see the entity.
/// </summary>
public class CustomerNotificationService : ICustomerNotifier
{
    private readonly OrderDbContext _db;
    private readonly ILogger<CustomerNotificationService> _logger;

    public CustomerNotificationService(OrderDbContext db, ILogger<CustomerNotificationService> logger)
    {
        _db = db;
        _logger = logger;
    }

    public async Task NotifyAsync(
        Order order, string type, string title, string? message, CancellationToken ct = default)
    {
        // Staff orders have no customer, and the lifecycle paths these are raised from are shared
        // with the POS. Returning here rather than making each caller check keeps the condition
        // in one place.
        if (order.CustomerId is not Guid customerId) return;

        // The history row is written first at every one of these points, so this is a
        // primary-key read of a row that is usually still in the change tracker. Falling back to
        // null rather than calling the directory again: a missing display name is worth a
        // slightly plainer sentence, never a second HTTP call on the order path.
        var summary = await _db.Set<CustomerOrderSummary>()
            .FirstOrDefaultAsync(s => s.Id == order.Id, ct);

        _db.Add(new CustomerNotification
        {
            Id = Guid.NewGuid(),
            CustomerId = customerId,
            OrderId = order.Id,
            RestaurantId = order.RestaurantId,
            LocationId = order.LocationId,
            RestaurantName = summary?.RestaurantName,
            Type = type,
            Title = title,
            Message = message,
            CreatedAt = DateTimeOffset.UtcNow,
        });

        await _db.SaveChangesAsync(ct);
        _logger.LogInformation("Notified {CustomerId} of {Type} on order {OrderId}",
            customerId, type, order.Id);
    }

    public async Task<IReadOnlyList<CustomerNotification>> GetForCustomerAsync(
        Guid customerId, int take, CancellationToken ct = default)
        // No tenant predicate, on purpose: this is the cross-restaurant read the table exists
        // for. The entity carries no query filter, so none is being bypassed.
        => await _db.Set<CustomerNotification>()
            .Where(n => n.CustomerId == customerId)
            .OrderByDescending(n => n.CreatedAt)
            .Take(take)
            .ToListAsync(ct);

    public async Task MarkReadAsync(Guid customerId, Guid notificationId, CancellationToken ct = default)
    {
        // CustomerId is part of the predicate, not checked afterwards - the id comes off a URL,
        // and without it anyone could mark anyone's notifications read.
        var notification = await _db.Set<CustomerNotification>()
            .FirstOrDefaultAsync(n => n.Id == notificationId && n.CustomerId == customerId, ct);

        if (notification is null || notification.ReadAt is not null) return;

        notification.ReadAt = DateTimeOffset.UtcNow;
        await _db.SaveChangesAsync(ct);
    }

    public async Task MarkAllReadAsync(Guid customerId, CancellationToken ct = default)
    {
        var now = DateTimeOffset.UtcNow;
        await _db.Set<CustomerNotification>()
            .Where(n => n.CustomerId == customerId && n.ReadAt == null)
            .ExecuteUpdateAsync(s => s.SetProperty(n => n.ReadAt, now), ct);
    }
}
