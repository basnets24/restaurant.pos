using System.Net.Http.Json;
using Microsoft.Extensions.Caching.Memory;
using OrderService.Interfaces;

namespace OrderService.Services.Tenancy;

/// <summary>
/// Reads restaurant and location names off identity's public discovery endpoint.
///
/// Why a call at all: a diner's order history spans restaurants, and "SJC-01" is not a thing to
/// show someone who is trying to find last Tuesday's lunch. Identity owns those names and the
/// order service has no projection of them.
///
/// Two deliberate differences from <c>CatalogMenuClient</c>, which calls out for modifier
/// prices. That call is load-bearing - get it wrong and the order is mispriced - so it fails
/// checkout when catalog is down. This one only decorates a history row, so a failure is
/// swallowed and logged: an order must never be lost because a display name could not be
/// fetched. And because names change roughly never while an order is placed per second, the
/// answer is cached rather than fetched per order.
/// </summary>
public class TenantDirectoryClient : ITenantDirectoryClient
{
    /// <summary>Long enough that a busy location resolves once, short enough that a rename
    /// shows up the same day. Only ever affects rows written after it expires - already-written
    /// summaries keep the name they were given.</summary>
    private static readonly TimeSpan CacheFor = TimeSpan.FromHours(1);

    private readonly HttpClient _http;
    private readonly IMemoryCache _cache;
    private readonly ILogger<TenantDirectoryClient> _logger;

    public TenantDirectoryClient(HttpClient http, IMemoryCache cache, ILogger<TenantDirectoryClient> logger)
    {
        _http = http;
        _cache = cache;
        _logger = logger;
    }

    public async Task<TenantNames?> GetNamesAsync(
        string restaurantId, string locationId, CancellationToken ct = default)
    {
        var key = $"tenant-names:{restaurantId}:{locationId}";
        if (_cache.TryGetValue<TenantNames>(key, out var cached)) return cached;

        try
        {
            var listing = await _http.GetFromJsonAsync<PublicListing>(
                $"public/restaurants/{Uri.EscapeDataString(restaurantId)}" +
                $"/locations/{Uri.EscapeDataString(locationId)}", ct);

            if (listing is null) return null;

            var names = new TenantNames(listing.RestaurantName, listing.LocationName);
            _cache.Set(key, names, CacheFor);
            return names;
        }
        catch (Exception ex) when (ex is HttpRequestException or TaskCanceledException)
        {
            // Includes the 404 identity returns for a location that is no longer discoverable.
            // Nothing to do about it here: the summary is written without names.
            _logger.LogWarning(ex, "Could not resolve display names for {RestaurantId}/{LocationId}",
                restaurantId, locationId);
            return null;
        }
    }

    // The half of identity's DiscoveryListingDto this service cares about. Re-declared rather
    // than shared, for the same reason CatalogMenuClient re-declares catalog's menu DTOs.
    private record PublicListing(string RestaurantName, string LocationName);
}
