using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging;

namespace IdentityService.Services;

public class CachedTenantDirectory : ITenantDirectory
{
    private readonly ITenantDirectory _innerDirectory;
    private readonly IMemoryCache _cache;
    private readonly ILogger<CachedTenantDirectory> _logger;

    private static readonly MemoryCacheEntryOptions CacheOptions = new()
    {
        AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(5),
        SlidingExpiration = TimeSpan.FromMinutes(2),
        Priority = CacheItemPriority.Normal
    };

    public CachedTenantDirectory(
        ITenantDirectory innerDirectory,
        IMemoryCache cache,
        ILogger<CachedTenantDirectory> logger)
    {
        _innerDirectory = innerDirectory;
        _cache = cache;
        _logger = logger;
    }

    public async Task<TenantMembershipResult?> GetPrimaryMembershipAsync(Guid userId, CancellationToken ct = default)
    {
        var cacheKey = $"membership:{userId}";

        if (_cache.TryGetValue(cacheKey, out TenantMembershipResult? cached))
        {
            _logger.LogDebug("Cache hit for membership lookup: {UserId}", userId);
            return cached;
        }

        _logger.LogDebug("Cache miss for membership lookup: {UserId}", userId);
        var result = await _innerDirectory.GetPrimaryMembershipAsync(userId, ct);

        if (result != null)
        {
            _cache.Set(cacheKey, result, CacheOptions);
            _logger.LogDebug("Cached membership for user {UserId}: Restaurant={RestaurantId}",
                userId, result.RestaurantId);
        }
        else
        {
            // Cache negative results for a shorter time to avoid repeated DB queries
            var negativeOptions = new MemoryCacheEntryOptions
            {
                AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(1),
                Priority = CacheItemPriority.Low
            };
            _cache.Set(cacheKey, (TenantMembershipResult?)null, negativeOptions);
            _logger.LogDebug("Cached null membership result for user {UserId}", userId);
        }

        return result;
    }

    public async Task<string?> GetDefaultLocationAsync(string restaurantId, string? preferredLocationId = null, CancellationToken ct = default)
    {
        var cacheKey = $"location:{restaurantId}:{preferredLocationId ?? "default"}";

        if (_cache.TryGetValue(cacheKey, out string? cached))
        {
            _logger.LogDebug("Cache hit for location lookup: RestaurantId={RestaurantId}, PreferredLocationId={PreferredLocationId}",
                restaurantId, preferredLocationId);
            return cached;
        }

        _logger.LogDebug("Cache miss for location lookup: RestaurantId={RestaurantId}, PreferredLocationId={PreferredLocationId}",
            restaurantId, preferredLocationId);
        var result = await _innerDirectory.GetDefaultLocationAsync(restaurantId, preferredLocationId, ct);

        // Always cache location results (null is a valid result)
        _cache.Set(cacheKey, result, CacheOptions);
        _logger.LogDebug("Cached location for restaurant {RestaurantId}: LocationId={LocationId}",
            restaurantId, result);

        return result;
    }

    public async Task<IReadOnlyList<string>> GetUserRolesAsync(Guid userId, string restaurantId, CancellationToken ct = default)
    {
        var cacheKey = $"roles:{userId}:{restaurantId}";

        if (_cache.TryGetValue(cacheKey, out IReadOnlyList<string>? cached) && cached is not null)
        {
            _logger.LogDebug("Cache hit for roles lookup: UserId={UserId}, RestaurantId={RestaurantId}",
                userId, restaurantId);
            return cached;
        }

        _logger.LogDebug("Cache miss for roles lookup: UserId={UserId}, RestaurantId={RestaurantId}",
            userId, restaurantId);
        var result = await _innerDirectory.GetUserRolesAsync(userId, restaurantId, ct);

        // Always cache role results (empty list is a valid result)
        _cache.Set(cacheKey, result, CacheOptions);
        _logger.LogDebug("Cached {RoleCount} roles for user {UserId} in restaurant {RestaurantId}",
            result.Count, userId, restaurantId);

        return result ?? new List<string>();
    }
}