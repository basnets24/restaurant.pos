using IdentityService.Entities;
using IdentityService.Features.Shared.Auth;
using IdentityService.Features.Tenancy.Services;
using IdentityService.Common.Settings;
using Microsoft.AspNetCore.Identity;
using Common.Library.PostgreSQL;
using Common.Library.Settings;
using Microsoft.EntityFrameworkCore;
using System.Reflection;
using System.Security.Cryptography.X509Certificates;
using Microsoft.Extensions.Hosting;

namespace IdentityService.Common.Extensions;

public static class IdentityServerExtensions
{
    public static IServiceCollection AddRestaurantPosIdentityServer(
        this IServiceCollection services,
        IConfiguration configuration,
        IHostEnvironment environment)
    {
        var idp = configuration
            .GetRequiredSection("IdentityServerSettings")
            .Get<IdentityServerSettings>()
                 ?? throw new InvalidOperationException("IdentityServerSettings configuration is missing.");

        var identityServerBuilder = services.AddIdentityServer(options =>
           {
               options.Events.RaiseErrorEvents = true;
               options.Events.RaiseFailureEvents = true;
               options.Events.RaiseInformationEvents = true;
               options.Events.RaiseSuccessEvents = true;
               options.EmitStaticAudienceClaim = false;

               var serviceSettings = configuration.GetSection("ServiceSettings").Get<ServiceSettings>();
               if (serviceSettings?.Authority != null)
               {
                   options.IssuerUri = serviceSettings.Authority;
               }

               options.Authentication.CookieSameSiteMode = SameSiteMode.Lax;

               var keyPath = Path.GetDirectoryName(Assembly.GetExecutingAssembly().Location)
                             ?? throw new InvalidOperationException("Unable to resolve key path for IdentityServer.");
               options.KeyManagement.KeyPath = keyPath;
           })
           .AddAspNetIdentity<ApplicationUser>()
           .AddInMemoryIdentityResources(idp.IdentityResources)
           .AddInMemoryApiScopes(idp.ApiScopes)
           .AddInMemoryApiResources(idp.ApiResources)
           .AddInMemoryClients(idp.Clients)
           .AddProfileService<TenantProfileService>()
           .AddExtensionGrantValidator<DemoAdminGrantValidator>();

        // Without this, Duende falls back to its default in-memory grant store: every
        // authorization code and refresh token (the diner client's 30-day offline_access
        // grant) lives only in process memory and is silently wiped on every restart/deploy,
        // and there's nowhere durable to revoke into on logout (see Logout.cshtml.cs). Same
        // Postgres database as everything else, same schema-per-service convention.
        var postgresSettings = configuration.GetSection("PostgresSettings").Get<PostgresSettings>()
            ?? throw new InvalidOperationException("PostgresSettings configuration is missing.");
        var migrationsAssembly = typeof(IdentityServerExtensions).Assembly.GetName().Name;

        identityServerBuilder.AddOperationalStore(options =>
        {
            options.ConfigureDbContext = b => b.UseNpgsql(
                postgresSettings.GetConnectionString(),
                sql => sql.MigrationsAssembly(migrationsAssembly));
            // Sweeps expired/consumed grants (auth codes, refresh tokens, device codes) on a
            // timer instead of letting the table grow forever - the in-memory store used to
            // get this for free just by virtue of being memory.
            options.EnableTokenCleanup = true;
        });

        if (environment.IsDevelopment())
        {
            identityServerBuilder.AddDeveloperSigningCredential();
        }
        else
        {
            var identitySettings = configuration
                .GetRequiredSection(nameof(IdentitySettings))
                .Get<IdentitySettings>()
                    ?? throw new InvalidOperationException("IdentitySettings configuration is missing.");

            if (string.IsNullOrWhiteSpace(identitySettings.CertificateCerFilePath) ||
                string.IsNullOrWhiteSpace(identitySettings.CertificateKeyFilePath))
            {
                throw new InvalidOperationException("Certificate paths must be provided in IdentitySettings for non-development environments.");
            }

            if (!File.Exists(identitySettings.CertificateCerFilePath) ||
                !File.Exists(identitySettings.CertificateKeyFilePath))
            {
                throw new FileNotFoundException("Identity signing certificate file not found.");
            }

            var certificate = X509Certificate2.CreateFromPemFile(
                identitySettings.CertificateCerFilePath,
                identitySettings.CertificateKeyFilePath);

            identityServerBuilder.AddSigningCredential(certificate);
        }

        return services;
    }
}
