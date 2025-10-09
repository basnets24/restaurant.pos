using IdentityService.Entities;
using IdentityService.Settings;
using Microsoft.AspNetCore.Identity;
using Duende.IdentityServer.Models;
using Common.Library.Settings;
using System.Reflection;
using System.Security.Cryptography.X509Certificates;
using Microsoft.Extensions.Hosting;

namespace IdentityService.Extensions;

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

        // Override tenant client secret from configuration (user-secrets), if provided
        var tenantClientId = configuration["TenantService:ClientId"];
        var tenantClientSecret = configuration["TenantService:ClientSecret"];
        if (!string.IsNullOrWhiteSpace(tenantClientId) && !string.IsNullOrWhiteSpace(tenantClientSecret))
        {
            var tenantClient = idp.Clients.FirstOrDefault(c => string.Equals(c.ClientId, tenantClientId, StringComparison.Ordinal));
            if (tenantClient is not null)
            {
                // IdentityServer expects stored client secrets to be hashed (Sha256 base64).
                tenantClient.ClientSecrets = new List<Secret> { new Secret(HashSharedSecret(tenantClientSecret)) };
            }
        }

        var identityServerBuilder = services.AddIdentityServer(options =>
           {
               options.Events.RaiseErrorEvents = true;
               options.Events.RaiseFailureEvents = true;
               options.Events.RaiseInformationEvents = true;
               options.Events.RaiseSuccessEvents = true;
               // Emit per‑API audiences so access tokens carry aud = ApiResource name (e.g., "Tenant").
               options.EmitStaticAudienceClaim = false;

               // Set explicit issuer URI for consistent token validation across services
               var serviceSettings = configuration.GetSection("ServiceSettings").Get<ServiceSettings>();
               if (serviceSettings?.Authority != null)
               {
                   options.IssuerUri = serviceSettings.Authority;
               }

               // Configure cookies for HTTP development (API Gateway architecture)
               options.Authentication.CookieSameSiteMode = SameSiteMode.Lax;

               // Persist & rotate signing keys here (ensure a writable path in container)
               var keyPath = Path.GetDirectoryName(Assembly.GetExecutingAssembly().Location)
                             ?? throw new InvalidOperationException("Unable to resolve key path for IdentityServer.");
               options.KeyManagement.KeyPath = keyPath;
               // options.KeyManagement.Enabled = true; // default is true in recent Duende
           })
           .AddAspNetIdentity<ApplicationUser>()
           .AddInMemoryIdentityResources(idp.IdentityResources) // OpenId, Profile, Roles, etc.
           .AddInMemoryApiScopes(idp.ApiScopes)
           .AddInMemoryApiResources(idp.ApiResources)
           .AddInMemoryClients(idp.Clients)
           .AddProfileService<Services.TenantProfileService>();

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

    private static string HashSharedSecret(string secret)
    {
        using var sha = System.Security.Cryptography.SHA256.Create();
        var bytes = System.Text.Encoding.UTF8.GetBytes(secret);
        var hash = sha.ComputeHash(bytes);
        return Convert.ToBase64String(hash);
    }

}
