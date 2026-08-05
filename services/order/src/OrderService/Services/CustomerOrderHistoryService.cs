using Microsoft.EntityFrameworkCore;
using OrderService.Data;
using OrderService.Entities;
using OrderService.Interfaces;

namespace OrderService.Services;

/// <summary>
/// Maintains <see cref="CustomerOrderSummary"/> alongside the order lifecycle.
///
/// Note the <see cref="OrderDbContext"/> here rather than an <c>IRepository&lt;T&gt;</c>: the
/// repository is <c>TenantEfRepository</c>, which stamps the ambient tenant on write and filters
/// by it on read. Summaries must do neither - see the entity for why - so they go through the
/// context directly. Omitting the tenant stamp is the point, not an oversight.
/// </summary>
public class CustomerOrderHistoryService : ICustomerOrderHistory
{
    /// <summary>Enough lines to recognise the order by; the rest collapse into a count.</summary>
    private const int SummaryLines = 3;

    private readonly OrderDbContext _db;
    private readonly ITenantDirectoryClient _directory;
    private readonly ILogger<CustomerOrderHistoryService> _logger;

    public CustomerOrderHistoryService(
        OrderDbContext db,
        ITenantDirectoryClient directory,
        ILogger<CustomerOrderHistoryService> logger)
    {
        _db = db;
        _directory = directory;
        _logger = logger;
    }

    public async Task RecordAsync(Order order, CancellationToken ct = default)
    {
        if (order.CustomerId is not Guid customerId) return;

        var summary = await _db.Set<CustomerOrderSummary>()
            .FirstOrDefaultAsync(s => s.Id == order.Id, ct);

        if (summary is null)
        {
            // Only resolved once, on the row's first write. A later status change must not pay
            // for an HTTP call, and re-resolving would let a rename rewrite old receipts.
            var names = await _directory.GetNamesAsync(order.RestaurantId, order.LocationId, ct);

            summary = new CustomerOrderSummary
            {
                Id = order.Id,
                CustomerId = customerId,
                RestaurantId = order.RestaurantId,
                LocationId = order.LocationId,
                RestaurantName = names?.RestaurantName,
                LocationName = names?.LocationName,
                OrderType = order.OrderType,
                CreatedAt = order.CreatedAt,
                PickupTime = order.PickupTime,
                ItemCount = order.Items.Sum(i => i.Quantity),
                ItemSummary = Describe(order.Items)
            };
            _db.Add(summary);
        }

        // Refreshed on every call, including the first: these are exactly the fields that move
        // as the order settles.
        summary.Status = order.Status;
        summary.GrandTotal = order.GrandTotal;
        summary.PaidAt = order.PaidAt;
        summary.CancelledAt = order.CancelledAt;

        await _db.SaveChangesAsync(ct);
        _logger.LogInformation("Recorded order {OrderId} as {Status} in {CustomerId}'s history",
            order.Id, order.Status, customerId);
    }

    public async Task<IReadOnlyList<CustomerOrderSummary>> GetForCustomerAsync(
        Guid customerId, CancellationToken ct = default)
        // No tenant predicate, on purpose - this is the one read in the service that is supposed
        // to cross restaurants. The entity carries no query filter, so none is being bypassed.
        => await _db.Set<CustomerOrderSummary>()
            .Where(s => s.CustomerId == customerId)
            .OrderByDescending(s => s.CreatedAt)
            .ToListAsync(ct);

    /// <summary>"2x Fork Burger, 1x House Fries, +2 more".</summary>
    private static string Describe(IReadOnlyList<OrderItem> items)
    {
        var shown = items.Take(SummaryLines).Select(i => $"{i.Quantity}x {i.MenuItemName}");
        var rest = items.Count - SummaryLines;
        return string.Join(", ", rest > 0 ? shown.Append($"+{rest} more") : shown);
    }
}
