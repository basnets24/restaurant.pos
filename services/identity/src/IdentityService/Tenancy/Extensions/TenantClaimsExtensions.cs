using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.DependencyInjection;
using IdentityService.Tenancy.Services;
using IdentityService.Tenancy.Services.TenantClaims;
using IdentityService.Tenancy.Services.TenantDirectory;

namespace IdentityService.Tenancy.Extensions;

public static class TenantClaimsExtensions
{
    public static IServiceCollection AddTenantClaimsProvider(this IServiceCollection services)
    {
        services.AddScoped<EmbeddedTenantDirectory>();

        // Cached wrapper around the embedded EF Core directory implementation
        services.AddScoped<ITenantDirectory>(sp => new CachedTenantDirectory(
            sp.GetRequiredService<EmbeddedTenantDirectory>(),
            sp.GetRequiredService<IMemoryCache>(),
            sp.GetRequiredService<ILogger<CachedTenantDirectory>>()));

        services.AddScoped<ITenantClaimsProvider, DbTenantClaimsProvider>();

        return services;
    }
}
