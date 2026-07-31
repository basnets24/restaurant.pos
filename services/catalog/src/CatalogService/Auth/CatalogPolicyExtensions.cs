using Common.Library.Identity;
using Microsoft.AspNetCore.Authorization;

namespace CatalogService.Auth;

public static class CatalogPolicyExtensions
{
    public const string MenuReadPolicy = "MenuRead";
    public const string MenuWritePolicy = "MenuWrite";

    public static IServiceCollection AddCatalogPolicies(this IServiceCollection services)
    {
        services.AddSingleton<IAuthorizationHandler, ScopeHandler>();
        services.AddAuthorization(o =>
        {
            o.AddPolicy(MenuReadPolicy, p => p.Requirements.Add(new ScopeRequirement("menu.read")));

            o.AddPolicy(MenuWritePolicy, p =>
            {
                p.Requirements.Add(new ScopeRequirement("menu.write"));
                p.RequireRole("Admin", "Manager", "Chef");
            });
        });
        return services;
    }
}
