using Common.Library.Tenancy;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using OrderService.Data;
using OrderService.Entities;
using OrderService.Interfaces;
using OrderService.Settings;
using OrderService.StateMachines;

namespace OrderService.Services;

/// <summary>
/// Cancels pickup orders that were fired to the kitchen but never paid for, releasing the stock
/// they were holding.
///
/// Why this has to exist: firing commits the order and reserves inventory, and payment is a
/// separate later step, so a diner who closes the tab at the card form leaves stock reserved
/// against an order nobody will ever pay for. <c>POST /orders/{id}/cancel</c> is the only other
/// thing that releases inventory and it is a manual operator action - nobody is watching for
/// abandoned diner carts, so without this they accumulate silently.
///
/// Dine-in is deliberately exempt: a table order legitimately sits unpaid for the length of a
/// meal, and the POS already has an operator standing over it.
/// </summary>
public sealed class AbandonedOrderSweeper : BackgroundService
{
    /// <summary>MassTransit persists the state machine's position as the state's name. Reaching
    /// this one is what proves catalog actually decremented stock for the order.</summary>
    private const string InventoryReservedState = nameof(OrderStateMachine.Confirmed);

    /// <summary>
    /// Stands in for the ambient tenant while the cross-tenant candidate query runs.
    /// <see cref="OrderDbContext"/> needs an <see cref="ITenantContext"/> to build its query
    /// filter, and that query deliberately ignores the filter, so this value is never used to
    /// scope anything. It costs one extra entry in EF's per-tenant model cache, and it is a
    /// recognisable string rather than an empty one so that if it ever does surface in a query
    /// or a log line it is obvious where it came from.
    /// </summary>
    private static readonly ITenantContext SweepTenant =
        new TenantContext { RestaurantId = "__sweep__", LocationId = "__sweep__" };

    private readonly IServiceProvider _services;
    private readonly TenantMiddleware.TenantContextHolder _holder;
    private readonly AbandonedOrderSettings _settings;
    private readonly ILogger<AbandonedOrderSweeper> _logger;

    public AbandonedOrderSweeper(
        IServiceProvider services,
        TenantMiddleware.TenantContextHolder holder,
        IOptions<AbandonedOrderSettings> settings,
        ILogger<AbandonedOrderSweeper> logger)
    {
        _services = services;
        _holder = holder;
        _settings = settings.Value;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken ct)
    {
        if (!_settings.Enabled)
        {
            _logger.LogWarning("Abandoned-order sweep is disabled; unpaid pickup orders will hold stock indefinitely");
            return;
        }

        _logger.LogInformation("Abandoned-order sweep running every {Interval} against a {Ttl} TTL",
            _settings.Interval, _settings.Ttl);

        using var timer = new PeriodicTimer(_settings.Interval);
        try
        {
            do
            {
                // One bad tick must not take the sweep down for the life of the process - the
                // next one will pick up the same orders, since nothing was mutated.
                try { await SweepAsync(ct); }
                catch (OperationCanceledException) when (ct.IsCancellationRequested) { throw; }
                catch (Exception ex) { _logger.LogError(ex, "Abandoned-order sweep failed; retrying next tick"); }
            } while (await timer.WaitForNextTickAsync(ct));
        }
        catch (OperationCanceledException) when (ct.IsCancellationRequested)
        {
            // Shutdown.
        }
    }

    private async Task SweepAsync(CancellationToken ct)
    {
        var expired = await FindExpiredAsync(DateTimeOffset.UtcNow - _settings.Ttl, ct);
        if (expired.Count == 0) return;

        foreach (var tenant in expired.GroupBy(o => (o.RestaurantId, o.LocationId)))
        {
            // Everything downstream reads the ambient tenant: the repository's filter, EF's
            // per-tenant model cache, and the headers MassTransit stamps on ReleaseInventory.
            // This has to be set before the scope is created, because that is when
            // ITenantContext is resolved out of the holder.
            _holder.Set(new TenantContext
            {
                RestaurantId = tenant.Key.RestaurantId,
                LocationId = tenant.Key.LocationId
            });

            await using var scope = _services.CreateAsyncScope();
            var orders = scope.ServiceProvider.GetRequiredService<IOrderService>();

            foreach (var order in tenant)
            {
                try
                {
                    // The one cancel path in the service, so there stays exactly one publisher
                    // of ReleaseInventory. It also raises the OrderCancelled notification, which
                    // is how staff find out this happened.
                    await orders.CancelAsync(order.Id, ct);
                    _logger.LogInformation(
                        "Cancelled abandoned pickup order {OrderId} for {RestaurantId}/{LocationId}, unpaid since {CreatedAt}",
                        order.Id, order.RestaurantId, order.LocationId, order.CreatedAt);
                }
                catch (Exception ex)
                {
                    // Most likely a race with someone paying or cancelling between the query
                    // and here. Skip it; the order is settled either way.
                    _logger.LogWarning(ex, "Could not cancel abandoned order {OrderId}", order.Id);
                }
            }
        }
    }

    /// <summary>
    /// Pickup orders past their TTL whose stock is genuinely held.
    ///
    /// The saga check is the point of this method. An order sits at <c>Pending</c> both before
    /// and after inventory is reserved - the entity has no Confirmed status, only the saga does -
    /// so age alone cannot tell "the diner walked away" from "OrderSubmitted never made it onto
    /// the broker". Cancelling the second kind would publish a ReleaseInventory for stock that
    /// was never taken, quietly inflating the count. Those are left alone and logged instead:
    /// an order stranded by a broker outage is a fault to look at, not something a timer should
    /// paper over.
    /// </summary>
    private async Task<List<ExpiredOrder>> FindExpiredAsync(DateTimeOffset cutoff, CancellationToken ct)
    {
        await using var scope = _services.CreateAsyncScope();

        // Asked deliberately outside the tenant machinery: the sweep runs on a timer, so there
        // is no request and no ambient tenant to scope it to. IgnoreQueryFilters is what makes
        // it cross-tenant; the context is built by hand because resolving one from DI would
        // want a tenant that does not exist here.
        await using var db = new OrderDbContext(
            scope.ServiceProvider.GetRequiredService<DbContextOptions<OrderDbContext>>(), SweepTenant);

        var stale = await db.Orders
            .IgnoreQueryFilters()
            .Where(o => o.Status == OrderStatus.Pending
                        && o.PaidAt == null
                        && o.OrderType == OrderTypes.Pickup
                        && o.CreatedAt < cutoff)
            .Select(o => new ExpiredOrder(o.Id, o.RestaurantId, o.LocationId, o.CreatedAt))
            .ToListAsync(ct);

        if (stale.Count == 0) return stale;

        // Not tenant-scoped at all (see OrderStateDbContext), so this one resolves normally.
        var sagas = scope.ServiceProvider.GetRequiredService<OrderStateDbContext>();
        var ids = stale.Select(o => o.Id).ToList();
        var reserved = (await sagas.Set<OrderState>()
                .Where(s => ids.Contains(s.OrderId) && s.CurrentState == InventoryReservedState)
                .Select(s => s.OrderId)
                .ToListAsync(ct))
            .ToHashSet();

        foreach (var stranded in stale.Where(o => !reserved.Contains(o.Id)))
            _logger.LogWarning(
                "Order {OrderId} has been unpaid since {CreatedAt} but never reserved inventory; "
                + "leaving it for an operator rather than releasing stock it may not hold",
                stranded.Id, stranded.CreatedAt);

        return stale.Where(o => reserved.Contains(o.Id)).ToList();
    }

    private sealed record ExpiredOrder(Guid Id, string RestaurantId, string LocationId, DateTimeOffset CreatedAt);
}
