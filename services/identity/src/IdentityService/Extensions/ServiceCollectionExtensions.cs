using IdentityService.Entities;
using IdentityService.Data;
using IdentityService.Settings;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Diagnostics.HealthChecks;
using Tenant.Domain.Data;
using Tenant.Domain.HealthChecks;
using Tenant.Domain.Settings;

namespace IdentityService.Extensions;

public static class ServiceCollectionExtensions
{
    public static IServiceCollection AddPostgresWithIdentity(
        this IServiceCollection services,
        IConfiguration config)
    {
        services.ConfigureTenantPostgres(config);
        var postgresSettings = config
            .GetSection("PostgresSettings")
            .Get<PostgresSettings>();
        
        services.AddDbContext<ApplicationDbContext>(options =>
            options.UseNpgsql(postgresSettings!.GetConnectionString()));
        
        services.AddDbContext<TenantDbContext>(options =>
            options.UseNpgsql(postgresSettings!.GetConnectionString()));
        
        
        services.AddIdentity<ApplicationUser, ApplicationRole>(options =>
            {
                // If you don’t want email confirmation while developing:
                options.SignIn.RequireConfirmedAccount = false;
                options.User.RequireUniqueEmail = true;
            })
            .AddEntityFrameworkStores<ApplicationDbContext>()
            .AddDefaultTokenProviders()
            .AddDefaultUI();
        
        return services;
    }

    public static IServiceCollection AddIdentityHealthChecks(
        this IServiceCollection services)
    {
        ArgumentNullException.ThrowIfNull(services);

        services.AddHealthChecks()
            .AddCheck("self", () => HealthCheckResult.Healthy(), tags: new[] { "live" })
            .AddPostgresHealthCheck(
                name: "postgres",
                tags: new[] { "ready" });

        return services;
    }
}
