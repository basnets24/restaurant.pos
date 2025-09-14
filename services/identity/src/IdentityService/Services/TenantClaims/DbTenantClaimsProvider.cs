using Microsoft.EntityFrameworkCore;
using Tenant.Domain.Data;

namespace IdentityService.Services;

public class DbTenantClaimsProvider : ITenantClaimsProvider
{
    private readonly TenantDbContext _tenantDb;
    public DbTenantClaimsProvider(TenantDbContext tenantDb) => _tenantDb = tenantDb;

    public async Task<TenantClaimResult?> GetAsync(Guid userId, CancellationToken ct)
    {
        var membership = await _tenantDb.RestaurantMemberships
            .AsNoTracking()
            .Where(m => m.UserId == userId)
            .OrderByDescending(m => m.CreatedUtc)
            .FirstOrDefaultAsync(ct);

        if (membership is null)
            return null;

        var rid = membership.RestaurantId;
        var locId = membership.DefaultLocationId;
        if (string.IsNullOrEmpty(locId))
        {
            locId = await _tenantDb.Locations
                .AsNoTracking()
                .Where(l => l.RestaurantId == rid && l.IsActive)
                .OrderBy(l => l.CreatedUtc)
                .Select(l => l.Id)
                .FirstOrDefaultAsync(ct);
        }

        var roles = await _tenantDb.RestaurantUserRoles
            .AsNoTracking()
            .Where(r => r.UserId == userId && r.RestaurantId == rid)
            .Select(r => r.RoleName)
            .Distinct()
            .ToListAsync(ct);

        return new TenantClaimResult(rid, locId, roles);
    }
}

