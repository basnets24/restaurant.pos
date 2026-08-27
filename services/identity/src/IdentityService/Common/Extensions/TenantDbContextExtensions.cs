using Microsoft.EntityFrameworkCore;
using Tenant.Domain;
using Tenant.Domain.Data;

namespace IdentityService.Common.Extensions;

public static class TenantDbContextExtensions
{
    public static Task<bool> IsTenantAdminAsync(
        this TenantDbContext db,
        Guid userId,
        string restaurantId,
        CancellationToken ct)
        => db.RestaurantUserRoles
            .AsNoTracking()
            .AnyAsync(r => r.UserId == userId && r.RestaurantId == restaurantId && r.RoleName == TenantRoles.TenantAdmin, ct);
}
