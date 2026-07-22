using Common.Library.Tenancy;

namespace Common.Library.PostgreSQL;

/// <summary>
/// Implemented by tenant-aware DbContexts so <see cref="TenantModelCacheKeyFactory"/>
/// can incorporate the current tenant into EF Core's model cache key.
///
/// Without this, EF Core caches the compiled model per DbContext *type*
/// (not per instance) by default. ApplyTenantQueryFilters' query filter
/// closes over the ITenantContext instance passed to whichever DbContext
/// instance happens to build the model first - every later instance,
/// regardless of its own constructor argument, reuses that cached model
/// and therefore that first instance's tenant values for the lifetime of
/// the process.
/// </summary>
public interface ITenantScopedDbContext
{
    ITenantContext Tenant { get; }
}
