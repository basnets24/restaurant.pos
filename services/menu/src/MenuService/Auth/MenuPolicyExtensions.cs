using Common.Library.Identity;
using Microsoft.AspNetCore.Authorization;
namespace MenuService.Auth;

public static class MenuPolicyExtensions
{
    public const string ReadPolicy = "MenuRead";
    public const string WritePolicy = "MenuWrite";

    public static IServiceCollection AddMenuPolicies(this IServiceCollection services)
    {
        services.AddSingleton<IAuthorizationHandler, ScopeHandler>();
        services.AddAuthorization(o =>
        {
            o.AddPolicy(ReadPolicy, p => p.Requirements.Add(new ScopeRequirement("menu.read")));
            
            o.AddPolicy(WritePolicy, p => { p.Requirements.Add(new ScopeRequirement("menu.write"));
                                            p.RequireRole("Admin", "Manager", "Chef"); 
            });

        });
        return services;
    }
}