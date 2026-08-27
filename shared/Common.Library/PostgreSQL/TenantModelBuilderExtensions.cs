using System.Reflection;
using Common.Library.Tenancy;
using Microsoft.EntityFrameworkCore;

namespace Common.Library.PostgreSQL;

/// <summary>
/// Applies automatic tenant scoping to a DbContext's model - the EF Core equivalent
/// of TenantMongoRepository{T}'s automatic Scope() filter, but declared once against
/// the model instead of re-applied on every repository call.
/// </summary>
public static class TenantModelBuilderExtensions
{
    private static readonly MethodInfo SetTenantFilterMethod = typeof(TenantModelBuilderExtensions)
        .GetMethod(nameof(SetTenantFilter), BindingFlags.NonPublic | BindingFlags.Static)!;

    /// <summary>
    /// Adds a global query filter (RestaurantId/LocationId == current tenant) to every
    /// entity type in the model that implements ITenantEntity. Call once from a
    /// DbContext's OnModelCreating override, after base.OnModelCreating(modelBuilder).
    /// </summary>
    public static void ApplyTenantQueryFilters(this ModelBuilder modelBuilder, ITenantContext tenant)
    {
        foreach (var entityType in modelBuilder.Model.GetEntityTypes())
        {
            if (!typeof(ITenantEntity).IsAssignableFrom(entityType.ClrType))
                continue;

            SetTenantFilterMethod
                .MakeGenericMethod(entityType.ClrType)
                .Invoke(null, [modelBuilder, tenant]);
        }
    }

    private static void SetTenantFilter<TEntity>(ModelBuilder modelBuilder, ITenantContext tenant)
        where TEntity : class, ITenantEntity
    {
        modelBuilder.Entity<TEntity>()
            .HasQueryFilter(e => e.RestaurantId == tenant.RestaurantId && e.LocationId == tenant.LocationId);
    }
}
