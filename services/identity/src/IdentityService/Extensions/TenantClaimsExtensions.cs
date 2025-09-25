using Microsoft.Extensions.DependencyInjection;
using IdentityService.Services;

namespace IdentityService.Extensions;

public static class TenantClaimsExtensions
{
    public static IServiceCollection AddTenantClaimsProvider(this IServiceCollection services, IConfiguration config)
    {
        var mode = config["TenantService:Mode"] ?? "Http"; // default to Http for phase 2
        if (string.Equals(mode, "Http", StringComparison.OrdinalIgnoreCase))
        {
            var baseUrl = config["TenantService:BaseUrl"];
            services.AddHttpClient<HttpTenantClaimsProvider>(client =>
            {
                if (!string.IsNullOrWhiteSpace(baseUrl))
                    client.BaseAddress = new Uri(baseUrl);
                client.Timeout = TimeSpan.FromSeconds(3);
                // User-Agent must be a valid product token, avoid invalid characters
                client.DefaultRequestHeaders.UserAgent.ParseAdd("IdentityTenantClaims/1.0");
            });
            services.AddScoped<ITenantClaimsProvider>(sp =>
            {
                var http = sp.GetRequiredService<HttpTenantClaimsProvider>();
                return http;
            });
        }
        else
        {
            // Register tenant directory (embedded implementation for DB mode)
            services.AddScoped<ITenantDirectory, EmbeddedTenantDirectory>();
            services.AddScoped<ITenantClaimsProvider, DbTenantClaimsProvider>();
        }

        return services;
    }
}
