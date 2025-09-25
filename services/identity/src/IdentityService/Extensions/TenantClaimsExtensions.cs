using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;
using IdentityService.Services;
using IdentityService.Settings;

namespace IdentityService.Extensions;

public static class TenantClaimsExtensions
{
    public static IServiceCollection AddTenantClaimsProvider(this IServiceCollection services, IConfiguration config)
    {
        // Bind tenant service options with legacy string mapping
        services.Configure<TenantServiceOptions>(config.GetSection("TenantService"));
        services.PostConfigure<TenantServiceOptions>(options =>
        {
            // Map legacy string-based mode to enum (backward compatibility)
            var legacyMode = config["TenantService:Mode"] ?? "Http";
            options.Mode = string.Equals(legacyMode, "Http", StringComparison.OrdinalIgnoreCase)
                ? TenantServiceMode.Http
                : TenantServiceMode.Embedded;
        });

        // Register implementations based on mode
        services.AddScoped<ITenantDirectory>(sp =>
        {
            var options = sp.GetRequiredService<IOptions<TenantServiceOptions>>().Value;
            return options.Mode switch
            {
                TenantServiceMode.Http => sp.GetRequiredService<HttpTenantDirectory>(),
                TenantServiceMode.Embedded => sp.GetRequiredService<EmbeddedTenantDirectory>(),
                _ => throw new InvalidOperationException($"Unsupported tenant service mode: {options.Mode}")
            };
        });

        // Register specific implementations
        services.AddScoped<EmbeddedTenantDirectory>();
        services.AddScoped<HttpTenantDirectory>();

        // Register claims provider (uses ITenantDirectory)
        services.AddScoped<ITenantClaimsProvider, DbTenantClaimsProvider>();

        // For HTTP mode, also register the legacy HttpTenantClaimsProvider if needed
        services.AddScoped(sp =>
        {
            var options = sp.GetRequiredService<IOptions<TenantServiceOptions>>().Value;
            if (options.Mode == TenantServiceMode.Http)
            {
                var baseUrl = options.BaseUrl;
                var httpClientFactory = sp.GetRequiredService<IHttpClientFactory>();
                var httpClient = httpClientFactory.CreateClient("TenantService");

                if (!string.IsNullOrWhiteSpace(baseUrl))
                    httpClient.BaseAddress = new Uri(baseUrl);
                httpClient.Timeout = TimeSpan.FromSeconds(3);
                httpClient.DefaultRequestHeaders.UserAgent.ParseAdd("IdentityTenantClaims/1.0");

                return new HttpTenantClaimsProvider(httpClient, config, sp.GetRequiredService<ILogger<HttpTenantClaimsProvider>>());
            }
            return null!; // Not used in embedded mode
        });

        // Register HTTP client for HTTP mode
        services.AddHttpClient("TenantService");

        return services;
    }
}
