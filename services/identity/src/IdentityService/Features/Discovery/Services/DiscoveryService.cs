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
        var listings = BaseQuery();

        if (!string.IsNullOrWhiteSpace(query.Cuisine))
        {
            var cuisine = query.Cuisine.Trim();
            listings = listings.Where(x => x.Cuisine != null && x.Cuisine.ToLower() == cuisine.ToLower());
        }

        if (!string.IsNullOrWhiteSpace(query.Q))
        {
            var q = query.Q.Trim().ToLower();
            listings = listings.Where(x =>
                x.RestaurantName.ToLower().Contains(q) ||
                (x.Cuisine != null && x.Cuisine.ToLower().Contains(q)));
        }

        // Nulls sort last on every ordered field: a listing with no distance or pickup
        // estimate is unranked, not nearest/fastest.
        listings = query.Sort switch
        {
            DiscoverySort.Distance => listings
                .OrderBy(x => x.DistanceMiles == null)
                .ThenBy(x => x.DistanceMiles)
                .ThenBy(x => x.RestaurantName),
            DiscoverySort.Pickup => listings
                .OrderBy(x => x.EstimatedPickupMinutes == null)
                .ThenBy(x => x.EstimatedPickupMinutes)
                .ThenBy(x => x.RestaurantName),
            _ => listings
                .OrderBy(x => x.RestaurantName)
                .ThenBy(x => x.LocationName)
        };

        return await listings.ToListAsync(ct);
    }

    public async Task<DiscoveryListingDto?> GetAsync(
        string restaurantId,
        string locationId,
        CancellationToken ct = default)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(restaurantId);
        ArgumentException.ThrowIfNullOrWhiteSpace(locationId);

        return await BaseQuery()
            .FirstOrDefaultAsync(x => x.RestaurantId == restaurantId && x.LocationId == locationId, ct);
    }

    public async Task<IReadOnlyList<string>> GetCuisinesAsync(CancellationToken ct = default)
        => await BaseQuery()
            .Where(x => x.Cuisine != null)
            .Select(x => x.Cuisine!)
            .Distinct()
            .OrderBy(c => c)
            .ToListAsync(ct);

    /// <summary>Every discoverable location joined to its restaurant. The join is explicit
    /// rather than a navigation property because <c>Location</c> has no <c>Restaurant</c>
    /// navigation - the FK is configured without one.</summary>
    private IQueryable<DiscoveryListingDto> BaseQuery() =>
        from location in _db.Locations.AsNoTracking()
        join restaurant in _db.Restaurants.AsNoTracking()
            on location.RestaurantId equals restaurant.Id
        where location.IsDiscoverable && location.IsActive && restaurant.IsActive
        select new DiscoveryListingDto(
            restaurant.Id,
            restaurant.Name,
            restaurant.Cuisine,
            location.Id,
            location.Name,
            location.Address,
            location.DisplayDistanceMiles,
            location.EstimatedPickupMinutes);
}
