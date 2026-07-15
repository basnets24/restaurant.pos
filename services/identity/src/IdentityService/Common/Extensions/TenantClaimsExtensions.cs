using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.DependencyInjection;
using IdentityService.Features.Tenancy.Services;
using IdentityService.Features.Tenancy.Services.Claims;
using IdentityService.Features.Tenancy.Services.TenantDirectory;

namespace IdentityService.Common.Extensions;

public static class TenantClaimsExtensions
{
    public static IServiceCollection AddTenantClaimsProvider(this IServiceCollection services)
    {
        services.AddScoped<EmbeddedTenantDirectory>();

        services.AddScoped<ITenantDirectory>(sp => new CachedTenantDirectory(
            sp.GetRequiredService<EmbeddedTenantDirectory>(),
            sp.GetRequiredService<IMemoryCache>(),
            sp.GetRequiredService<ILogger<CachedTenantDirectory>>()));

        services.AddScoped<ITenantClaimsProvider, DbTenantClaimsProvider>();

        return services;
    }
}
