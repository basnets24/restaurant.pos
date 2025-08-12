using IdentityService.Settings;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace IdentityService.Extensions;

public static class ServiceCollectionExtensions
{
    public static IServiceCollection AddPostgresWithIdentity(this IServiceCollection services, IConfiguration config)
    {
        // var postgresSettings = config
        //     .GetSection("PostgresSettings")
        //     .Get<PostgresSettings>();
        //
        // services.Configure<PostgresSettings>(config.GetSection("PostgresSettings"));
        //
        // services.AddDbContext<ApplicationDbConatext>(options =>
        //     options.UseNpgsql(postgresSettings!.GetConnectionString()));
        //
        // services.AddIdentity<ApplicationUser, IdentityRole>()
        //     .AddEntityFrameworkStores<ApplicationDbContext>()
        //     .AddDefaultTokenProviders();
        //
        return services;
    }
}