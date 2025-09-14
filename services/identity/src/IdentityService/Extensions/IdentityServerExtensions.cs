using IdentityService.Entities;
using IdentityService.Settings;
using Microsoft.AspNetCore.Identity;
using Duende.IdentityServer.Models;

namespace IdentityService.Extensions;

public static class IdentityServerExtensions
{
    public static IServiceCollection AddRestaurantPosIdentityServer(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        var idp = configuration.GetSection("IdentityServerSettings").Get<IdentityServerSettings>();

        // Override tenant client secret from configuration (user-secrets), if provided
        var tenantClientId = configuration["TenantService:ClientId"];
        var tenantClientSecret = configuration["TenantService:ClientSecret"];
        if (!string.IsNullOrWhiteSpace(tenantClientId) && !string.IsNullOrWhiteSpace(tenantClientSecret))
        {
            var tenantClient = idp!.Clients.FirstOrDefault(c => string.Equals(c.ClientId, tenantClientId, StringComparison.Ordinal));
            if (tenantClient is not null)
            {
                // IdentityServer expects stored client secrets to be hashed (Sha256 base64).
                tenantClient.ClientSecrets = new List<Secret> { new Secret(HashSharedSecret(tenantClientSecret)) };
            }
        }

         services.AddIdentityServer(options =>
            {
                options.Events.RaiseErrorEvents = true;
                options.Events.RaiseFailureEvents = true;
                options.Events.RaiseInformationEvents = true;
                options.Events.RaiseSuccessEvents = true;
                // Emit per‑API audiences so access tokens carry aud = ApiResource name (e.g., "Tenant").
                options.EmitStaticAudienceClaim = false;
                
                // Persist & rotate signing keys here (ensure a writable path in container)
                // options.KeyManagement.KeyPath = Path.GetDirectoryName(Assembly.GetExecutingAssembly().Location);
                // options.KeyManagement.Enabled = true; // default is true in recent Duende
            })
            .AddAspNetIdentity<ApplicationUser>()
            .AddInMemoryIdentityResources(idp!.IdentityResources) // OpenId, Profile, Roles, etc.
            .AddInMemoryApiScopes(idp.ApiScopes)
            .AddInMemoryApiResources(idp.ApiResources)
            .AddInMemoryClients(idp.Clients)
            .AddDeveloperSigningCredential()
            .AddProfileService<Services.TenantProfileService>();
         
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
