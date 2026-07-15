using IdentityService.Entities;
using IdentityService.Features.Tenancy.Services;
using IdentityService.Common.Settings;
using Microsoft.AspNetCore.Identity;
using Common.Library.Settings;
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
           .AddProfileService<TenantProfileService>();

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
