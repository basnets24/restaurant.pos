using IdentityService.Entities;
using IdentityService.Settings;
using Microsoft.AspNetCore.Identity;

namespace IdentityService.Extensions;

public static class IdentityServerExtensions
{
    public static IServiceCollection AddRestaurantPosIdentityServer(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        var idp = configuration.GetSection("IdentityServerSettings")
            .Get<IdentityServerSettings>();

         services.AddIdentityServer(options =>
            {
                options.Events.RaiseErrorEvents = true;
                options.Events.RaiseFailureEvents = true;
                options.Events.RaiseInformationEvents = true;
                options.Events.RaiseSuccessEvents = true;
                

                // Persist & rotate signing keys here (ensure a writable path in container)
                // options.KeyManagement.KeyPath = Path.GetDirectoryName(Assembly.GetExecutingAssembly().Location);
                // options.KeyManagement.Enabled = true; // default is true in recent Duende
            })
            .AddAspNetIdentity<ApplicationUser>()
            .AddInMemoryIdentityResources(idp!.IdentityResources) // OpenId, Profile, Roles, etc.
            .AddInMemoryApiScopes(idp.ApiScopes)
            .AddInMemoryApiResources(idp.ApiResources)
            .AddInMemoryClients(idp.Clients)
            .AddDeveloperSigningCredential();

        // if you need custom claims (roles, etc.), add a ProfileService here.
        // builder.AddProfileService<YourProfileService>();
        return services;
    }

}