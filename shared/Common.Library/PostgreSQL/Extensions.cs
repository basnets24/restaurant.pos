using Common.Library.Tenancy;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace Common.Library.PostgreSQL;

/// <summary>
/// Dependency injection extensions for PostgreSQL Entity Framework repositories.
/// Mirrors MongoDB extension pattern for consistency.
/// </summary>
public static class Extensions
{
    /// <summary>Register a generic EF repository for the specified entity type.</summary>
    /// <typeparam name="T">Entity type</typeparam>
    /// <param name="services">Service collection</param>
    /// <param name="contextFactory">Factory to resolve the DbContext instance</param>
    /// <returns>Service collection for chaining</returns>
    public static IServiceCollection AddEfRepository<T>(
        this IServiceCollection services,
        Func<IServiceProvider, DbContext>? contextFactory = null)
        where T : class
    {
        services.AddScoped<IEfRepository<T>>(serviceProvider =>
        {
            var context = contextFactory != null
                ? contextFactory(serviceProvider)
                : serviceProvider.GetRequiredService<DbContext>();
            return new EfRepository<T>(context);
        });

        return services;
    }

    /// <summary>
    /// Register a generic EF repository for the specified entity type with a specific DbContext.
    /// Use this when you have a specific DbContext type (e.g., ApplicationDbContext, TenantDbContext).
    /// </summary>
    /// <typeparam name="T">Entity type</typeparam>
    /// <typeparam name="TContext">DbContext type</typeparam>
    /// <param name="services">Service collection</param>
    /// <returns>Service collection for chaining</returns>
    public static IServiceCollection AddEfRepository<T, TContext>(this IServiceCollection services)
        where T : class
        where TContext : DbContext
    {
        services.AddScoped<IEfRepository<T>>(serviceProvider =>
        {
            var context = serviceProvider.GetRequiredService<TContext>();
            return new EfRepository<T>(context);
        });

        return services;
    }

    /// <summary>
    /// Register a tenant-scoped EF repository for the specified entity type, as
    /// IRepository{T} - the Postgres equivalent of AddTenantMongoRepository{T}.
    /// Registered scoped, since it depends on the request-scoped ITenantContext.
    /// </summary>
    /// <typeparam name="T">Entity type - must implement IEntity and ITenantEntity</typeparam>
    /// <typeparam name="TContext">The service's own DbContext type</typeparam>
    public static IServiceCollection AddTenantEfRepository<T, TContext>(this IServiceCollection services)
        where T : class, IEntity, ITenantEntity
        where TContext : DbContext
    {
        services.AddScoped<IRepository<T>>(serviceProvider =>
        {
            var context = serviceProvider.GetRequiredService<TContext>();
            var tenant = serviceProvider.GetRequiredService<ITenantContext>();
            return new TenantEfRepository<T>(context, tenant);
        });

        return services;
    }
}
