using Common.Library.Identity;
using Microsoft.AspNetCore.Authorization;

namespace InventoryService.Auth;

public static class InventoryPolicyExtensions
{
    public const string Read = "InventoryRead";
    public const string Write = "InventoryWrite";

    public static IServiceCollection AddInventoryPolicies(this IServiceCollection services)
    {
        services.AddSingleton<IAuthorizationHandler, ScopeHandler>();
        services.AddAuthorization(o =>
        {
            o.AddPolicy(Read,  p => p.Requirements.Add(new ScopeRequirement("inventory.read")));
            
            o.AddPolicy(Write, p => { p.Requirements.Add(new ScopeRequirement("inventory.write"));
                p.RequireRole("Admin", "Manager");
            });
        });
        return services;
    }
}
