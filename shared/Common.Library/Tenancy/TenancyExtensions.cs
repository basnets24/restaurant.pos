using Microsoft.AspNetCore.Builder;
using Microsoft.Extensions.DependencyInjection;

namespace Common.Library.Tenancy;

public static class TenancyExtensions
{
    public static IServiceCollection AddTenancy(this IServiceCollection services)
    {
        services.AddSingleton<TenantMiddleware.TenantContextHolder>();
        services.AddScoped<ITenantContext>(sp => sp.GetRequiredService<TenantMiddleware.TenantContextHolder>().Current);
        return services;
    }

    public static IApplicationBuilder UseTenancy(this IApplicationBuilder app) =>
        app.UseMiddleware<TenantMiddleware>();
}