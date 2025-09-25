using Microsoft.Extensions.Logging;

namespace IdentityService.Services;

/// <summary>
/// Stub HTTP-based tenant directory implementation.
/// Placeholder for future external tenant service integration.
/// </summary>
public class HttpTenantDirectory : ITenantDirectory
{
    private readonly ILogger<HttpTenantDirectory> _logger;

    public HttpTenantDirectory(ILogger<HttpTenantDirectory> logger)
    {
        _logger = logger;
    }

    public Task<TenantMembershipResult?> GetPrimaryMembershipAsync(Guid userId, CancellationToken ct = default)
    {
        _logger.LogWarning("HttpTenantDirectory not yet implemented - returning null membership for user {UserId}", userId);
        return Task.FromResult<TenantMembershipResult?>(null);
    }

    public Task<string?> GetDefaultLocationAsync(string restaurantId, string? preferredLocationId = null, CancellationToken ct = default)
    {
        _logger.LogWarning("HttpTenantDirectory not yet implemented - returning null location for restaurant {RestaurantId}", restaurantId);
        return Task.FromResult<string?>(null);
    }

    public Task<IReadOnlyList<string>> GetUserRolesAsync(Guid userId, string restaurantId, CancellationToken ct = default)
    {
        _logger.LogWarning("HttpTenantDirectory not yet implemented - returning empty roles for user {UserId} in restaurant {RestaurantId}", userId, restaurantId);
        return Task.FromResult<IReadOnlyList<string>>(Array.Empty<string>());
    }
}