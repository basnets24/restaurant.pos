using IdentityService.Features.Discovery.DTOs;
using Microsoft.EntityFrameworkCore;
using Tenant.Domain.Data;

namespace IdentityService.Features.Discovery.Services;

/// <summary>
/// Anonymous, cross-tenant reads for diner discovery - one of only two places in the platform
/// that deliberately looks across tenants.
///
/// This is safe precisely because <c>Restaurant</c>/<c>Location</c> are not <c>ITenantEntity</c>
/// rows: they *are* the tenant, so there is no tenant query filter being bypassed and no
/// <c>TenantEfRepository</c> involved. Query <see cref="TenantDbContext"/> directly and never
/// widen this to an entity that carries RestaurantId/LocationId as data.
///
/// Everything here is gated on <c>IsDiscoverable &amp;&amp; IsActive</c>, so opting a location
/// into public listing is an explicit act.
/// </summary>
public class DiscoveryService : IDiscoveryService
{
    private readonly TenantDbContext _db;

    public DiscoveryService(TenantDbContext db) => _db = db;

    public async Task<IReadOnlyList<DiscoveryListingDto>> SearchAsync(
        DiscoveryQuery query,
        CancellationToken ct = default)
    {
        var rows = DiscoverableRows();

        if (!string.IsNullOrWhiteSpace(query.Cuisine))
        {
            var cuisine = query.Cuisine.Trim().ToLower();
            rows = rows.Where(x => x.Restaurant.Cuisine != null && x.Restaurant.Cuisine.ToLower() == cuisine);
        }

        if (!string.IsNullOrWhiteSpace(query.Q))
        {
            var q = query.Q.Trim().ToLower();
            rows = rows.Where(x =>
                x.Restaurant.Name.ToLower().Contains(q) ||
                (x.Restaurant.Cuisine != null && x.Restaurant.Cuisine.ToLower().Contains(q)));
        }

        // Nulls sort last on every ordered field: a listing with no distance or pickup
        // estimate is unranked, not nearest/fastest.
        rows = query.Sort switch
        {
            DiscoverySort.Distance => rows
                .OrderBy(x => x.Location.DisplayDistanceMiles == null)
                .ThenBy(x => x.Location.DisplayDistanceMiles)
                .ThenBy(x => x.Restaurant.Name),
            DiscoverySort.Pickup => rows
                .OrderBy(x => x.Location.EstimatedPickupMinutes == null)
                .ThenBy(x => x.Location.EstimatedPickupMinutes)
                .ThenBy(x => x.Restaurant.Name),
            _ => rows
                .OrderBy(x => x.Restaurant.Name)
                .ThenBy(x => x.Location.Name)
        };

        return await Project(rows).ToListAsync(ct);
    }

    public async Task<DiscoveryListingDto?> GetAsync(
        string restaurantId,
        string locationId,
        CancellationToken ct = default)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(restaurantId);
        ArgumentException.ThrowIfNullOrWhiteSpace(locationId);

        var rows = DiscoverableRows()
            .Where(x => x.Restaurant.Id == restaurantId && x.Location.Id == locationId);

        return await Project(rows).FirstOrDefaultAsync(ct);
    }

    public async Task<IReadOnlyList<string>> GetCuisinesAsync(CancellationToken ct = default)
        => await DiscoverableRows()
            .Where(x => x.Restaurant.Cuisine != null)
            .Select(x => x.Restaurant.Cuisine!)
            .Distinct()
            .OrderBy(c => c)
            .ToListAsync(ct);

    /// <summary>
    /// Every discoverable location paired with its restaurant. The join is explicit because
    /// <c>Location</c> has no <c>Restaurant</c> navigation - the FK is configured without one.
    ///
    /// This yields entity pairs rather than DTOs on purpose. EF cannot compose <c>Where</c> or
    /// <c>OrderBy</c> over a projection into a positional record: it inlines the constructor
    /// call and then fails to reduce a member access on it ("could not be translated"). Filter
    /// and sort on the entities here, and project once at the end via <see cref="Project"/>.
    /// </summary>
    private IQueryable<LocationRow> DiscoverableRows() =>
        from location in _db.Locations.AsNoTracking()
        join restaurant in _db.Restaurants.AsNoTracking()
            on location.RestaurantId equals restaurant.Id
        where location.IsDiscoverable && location.IsActive && restaurant.IsActive
        select new LocationRow { Location = location, Restaurant = restaurant };

    private static IQueryable<DiscoveryListingDto> Project(IQueryable<LocationRow> rows) =>
        rows.Select(x => new DiscoveryListingDto(
            x.Restaurant.Id,
            x.Restaurant.Name,
            x.Restaurant.Cuisine,
            x.Location.Id,
            x.Location.Name,
            x.Location.Address,
            x.Location.DisplayDistanceMiles,
            x.Location.EstimatedPickupMinutes));

    /// <summary>Intermediate join shape. A named type rather than an anonymous one only so it
    /// can cross the method boundaries above; EF composes over it either way.</summary>
    private sealed class LocationRow
    {
        public Tenant.Domain.Entities.Location Location { get; set; } = null!;
        public Tenant.Domain.Entities.Restaurant Restaurant { get; set; } = null!;
    }
}
