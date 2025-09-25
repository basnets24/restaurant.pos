using Microsoft.Extensions.Logging;

namespace IdentityService.Services;

public class DbTenantClaimsProvider : ITenantClaimsProvider
{
    private readonly ITenantDirectory _directory;
    private readonly ILogger<DbTenantClaimsProvider> _logger;
    
    public DbTenantClaimsProvider(ITenantDirectory directory, ILogger<DbTenantClaimsProvider> logger)
    { _directory = directory; _logger = logger; }

    public async Task<TenantClaimResult?> GetAsync(Guid userId, CancellationToken ct)
    {
        var membership = await _directory.GetPrimaryMembershipAsync(userId, ct);
        if (membership is null)
        {
            _logger.LogWarning("No tenant membership found for user {UserId}", userId);
            return null;
        }

        var rid = membership.RestaurantId;
        var locId = await _directory.GetDefaultLocationAsync(rid, membership.DefaultLocationId, ct);
        var roles = await _directory.GetUserRolesAsync(userId, rid, ct);

        _logger.LogDebug("Resolved tenant claims from directory for user {UserId}: RestaurantId={RestaurantId} LocationId={LocationId} RolesCount={RolesCount}", userId, rid, locId, roles.Count);
        return new TenantClaimResult(rid, locId, roles);
    }
}

