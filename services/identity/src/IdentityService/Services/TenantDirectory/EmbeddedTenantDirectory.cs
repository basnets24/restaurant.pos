using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Tenant.Domain.Data;

namespace IdentityService.Services;

/// <summary>
/// Embedded tenant directory implementation using direct EF Core access.
/// Preserves existing query logic and behavior.
/// </summary>
public class EmbeddedTenantDirectory : ITenantDirectory
{
    private readonly TenantDbContext _tenantDb;
    private readonly ILogger<EmbeddedTenantDirectory> _logger;

    public EmbeddedTenantDirectory(TenantDbContext tenantDb, ILogger<EmbeddedTenantDirectory> logger)
    {
        _tenantDb = tenantDb;
        _logger = logger;
    }

    public async Task<TenantMembershipResult?> GetPrimaryMembershipAsync(Guid userId, CancellationToken ct = default)
    {
        var membership = await _tenantDb.RestaurantMemberships
            .AsNoTracking()
            .Where(m => m.UserId == userId)
            .OrderByDescending(m => m.CreatedUtc)
            .Select(m => new TenantMembershipResult(m.RestaurantId, m.DefaultLocationId, m.CreatedUtc))
            .FirstOrDefaultAsync(ct);

        if (membership is null)
        {
            _logger.LogDebug("No tenant membership found for user {UserId}", userId);
        }
        else
        {
            _logger.LogDebug("Primary membership for user {UserId}: RestaurantId={RestaurantId} DefaultLocationId={DefaultLocationId}", 
                userId, membership.RestaurantId, membership.DefaultLocationId);
        }

        return membership;
    }

    public async Task<string?> GetDefaultLocationAsync(string restaurantId, string? preferredLocationId = null, CancellationToken ct = default)
    {
        // If preferred location is provided and non-empty, use it
        if (!string.IsNullOrEmpty(preferredLocationId))
        {
            _logger.LogDebug("Using preferred location {LocationId} for restaurant {RestaurantId}", preferredLocationId, restaurantId);
            return preferredLocationId;
        }

        // Fallback: find first active location for the restaurant (existing logic)
        var locationId = await _tenantDb.Locations
            .AsNoTracking()
            .Where(l => l.RestaurantId == restaurantId && l.IsActive)
            .OrderBy(l => l.CreatedUtc)
            .Select(l => l.Id)
            .FirstOrDefaultAsync(ct);

        _logger.LogDebug("Fallback location for restaurant {RestaurantId}: {LocationId}", restaurantId, locationId);
        return locationId;
    }

    public async Task<IReadOnlyList<string>> GetUserRolesAsync(Guid userId, string restaurantId, CancellationToken ct = default)
    {
        var roles = await _tenantDb.RestaurantUserRoles
            .AsNoTracking()
            .Where(r => r.UserId == userId && r.RestaurantId == restaurantId)
            .Select(r => r.RoleName)
            .Distinct()
            .ToListAsync(ct);

        _logger.LogDebug("User {UserId} has {RoleCount} roles in restaurant {RestaurantId}", userId, roles.Count, restaurantId);
        return roles;
    }
}