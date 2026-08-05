using Common.Library;

namespace OrderService.Entities;

/// <summary>
/// One row per diner order, across every restaurant that diner has ordered from.
///
/// Deliberately **not** <c>ITenantEntity</c>, and deliberately not registered as a
/// <c>TenantEfRepository</c>. Both would scope it to one restaurant, which is precisely the
/// thing it exists to escape: "my orders" is a question about a person, not about a tenant, and
/// the diner asking it is not inside any tenant of their own. RestaurantId/LocationId are here
/// as plain columns describing where the order was placed - they are not a scoping key, and
/// adding <c>ITenantEntity</c> to "fix" the inconsistency would silently reduce every history
/// query to whichever restaurant's headers the request happened to carry.
///
/// It duplicates fields that already live on <see cref="Order"/> because <see cref="Order"/>
/// is tenant-scoped and cannot be read across restaurants at all. The duplication is the
/// feature; everything here is a snapshot of how the order looked when it was written.
/// </summary>
public class CustomerOrderSummary : IEntity
{
    /// <summary>The order's own id, not a separate key - so a summary is a direct lookup from
    /// an order and the pair can never drift apart or double up.</summary>
    public Guid Id { get; set; }

    public Guid CustomerId { get; set; }

    public string RestaurantId { get; set; } = default!;
    public string LocationId { get; set; } = default!;

    /// <summary>Snapshotted from discovery at order time rather than joined at read time: the
    /// listing is guaranteed to be there when the diner orders from it, and may be gone by the
    /// time they look back at the receipt. Null if identity was unreachable - see
    /// <c>TenantDirectoryClient</c>, which never fails an order over a display name.</summary>
    public string? RestaurantName { get; set; }
    public string? LocationName { get; set; }

    public string OrderType { get; set; } = OrderTypes.Pickup;
    public string Status { get; set; } = OrderStatus.Pending;

    public decimal GrandTotal { get; set; }

    /// <summary>Line count, so the card can say "3 items" without carrying the lines.</summary>
    public int ItemCount { get; set; }

    /// <summary>Human-readable line summary ("2x Fork Burger, 1x House Fries"), rendered as-is.
    /// A history card only needs to be recognisable; the order detail endpoint is still there
    /// for the full breakdown.</summary>
    public string ItemSummary { get; set; } = string.Empty;

    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset? PickupTime { get; set; }
    public DateTimeOffset? PaidAt { get; set; }
    public DateTimeOffset? CancelledAt { get; set; }
}
