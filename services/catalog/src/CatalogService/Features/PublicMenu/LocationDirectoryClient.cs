using Microsoft.Extensions.Caching.Memory;

namespace CatalogService.Features.PublicMenu;

public interface ILocationDirectoryClient
{
    /// <summary>
    /// Whether this location is currently listed for public ordering. Throws
    /// <see cref="DirectoryUnavailableException"/> if identity could not be asked - callers must
    /// not treat that as either answer.
    /// </summary>
    Task<bool> IsDiscoverableAsync(string restaurantId, string locationId, CancellationToken ct = default);
}

/// <summary>Identity could not be reached, so discoverability is unknown. Distinct from "not
/// discoverable" on purpose - see <see cref="LocationDirectoryClient"/>.</summary>
public class DirectoryUnavailableException(string message, Exception inner)
    : Exception(message, inner);

/// <summary>
/// Asks identity whether a location is open to the public, so catalog's anonymous menu endpoint
/// can refuse the ones that aren't.
///
/// Catalog has no copy of that flag: <c>IsDiscoverable</c> lives on identity's <c>Location</c>,
/// which is tenant *identity* rather than tenant *data*, and projecting it here would mean a
/// second source of truth for who is visible - the one thing about a public surface that must
/// have exactly one. So it is a call, gated on identity's own discovery endpoint, which already
/// 404s for a location that is unlisted, inactive, or belongs to an inactive restaurant.
///
/// <para><b>This fails closed, unlike order's <c>TenantDirectoryClient</c>.</b> That one swallows
/// errors because it is only decorating a history row with a display name. This is an
/// authorization gate: if identity is unreachable the honest answer is "don't know", and serving
/// the menu anyway would mean an outage silently unlists nothing and publishes everything. The
/// diner sees a 503 instead - which is what they would get from the discovery page in the same
/// outage anyway, since that data is identity's too.</para>
/// </summary>
public class LocationDirectoryClient : ILocationDirectoryClient
{
    /// <summary>
    /// Far shorter than the hour <c>TenantDirectoryClient</c> caches names for, because the
    /// staleness here is the security-relevant direction: a cached <c>true</c> keeps serving a
    /// menu the restaurant has just taken down. A minute bounds that without making every menu
    /// load a second HTTP hop.
    /// </summary>
    private static readonly TimeSpan CacheFor = TimeSpan.FromMinutes(1);

    private readonly HttpClient _http;
    private readonly IMemoryCache _cache;
    private readonly ILogger<LocationDirectoryClient> _logger;

    public LocationDirectoryClient(HttpClient http, IMemoryCache cache, ILogger<LocationDirectoryClient> logger)
    {
        _http = http;
        _cache = cache;
        _logger = logger;
    }

    public async Task<bool> IsDiscoverableAsync(
        string restaurantId, string locationId, CancellationToken ct = default)
    {
        var key = $"discoverable:{restaurantId}:{locationId}";
        if (_cache.TryGetValue<bool>(key, out var cached)) return cached;

        HttpResponseMessage response;
        try
        {
            response = await _http.GetAsync(
                $"public/restaurants/{Uri.EscapeDataString(restaurantId)}" +
                $"/locations/{Uri.EscapeDataString(locationId)}", ct);
        }
        catch (Exception ex) when (ex is HttpRequestException or TaskCanceledException)
        {
            // Not cached: a blip must not pin this location shut for the next minute.
            _logger.LogWarning(ex, "Could not check discoverability for {RestaurantId}/{LocationId}",
                restaurantId, locationId);
            throw new DirectoryUnavailableException("The restaurant directory is unavailable.", ex);
        }

        // 404 is identity's single answer for unlisted, inactive, and nonexistent alike - it
        // deliberately does not distinguish them, and neither does this.
        var discoverable = response.IsSuccessStatusCode;

        if (!discoverable && response.StatusCode != System.Net.HttpStatusCode.NotFound)
        {
            _logger.LogWarning("Directory returned {Status} for {RestaurantId}/{LocationId}",
                (int)response.StatusCode, restaurantId, locationId);
            throw new DirectoryUnavailableException(
                $"The restaurant directory returned {(int)response.StatusCode}.",
                new HttpRequestException($"Unexpected status {(int)response.StatusCode}."));
        }

        // Both answers are cached, and for the same span. A location that has just been listed
        // waiting up to a minute to appear is the mirror of one just unlisted taking up to a
        // minute to vanish; neither is worth a second cache policy.
        _cache.Set(key, discoverable, CacheFor);
        return discoverable;
    }
}
