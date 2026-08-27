using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;

namespace Common.Library.PostgreSQL;

/// <summary>
/// Includes the current tenant in EF Core's model cache key for any DbContext
/// implementing <see cref="ITenantScopedDbContext"/>, so a distinct compiled
/// model (and therefore a correctly-scoped tenant query filter) exists per
/// distinct tenant, instead of one model shared - and frozen to the first
/// tenant seen - for the whole process lifetime. Register via
/// DbContextOptionsBuilder.ReplaceService&lt;IModelCacheKeyFactory, TenantModelCacheKeyFactory&gt;().
/// </summary>
public class TenantModelCacheKeyFactory : IModelCacheKeyFactory
{
    public object Create(DbContext context, bool designTime)
        => context is ITenantScopedDbContext scoped
            ? (context.GetType(), scoped.Tenant.RestaurantId, scoped.Tenant.LocationId, designTime)
            : (context.GetType(), designTime);
}
