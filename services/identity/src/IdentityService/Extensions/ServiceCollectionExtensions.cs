using IdentityService.Entities;
using IdentityService.Data;
using Tenant.Domain.Data;
using IdentityService.Settings;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace IdentityService.Extensions;

public static class ServiceCollectionExtensions
{
    public static IServiceCollection AddPostgresWithIdentity(
        this IServiceCollection services,
        IConfiguration config)
    {
        var postgresSettings = config
            .GetSection("PostgresSettings")
            .Get<PostgresSettings>();
        
        services.Configure<PostgresSettings>(config.GetSection("PostgresSettings"));
        
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
}
