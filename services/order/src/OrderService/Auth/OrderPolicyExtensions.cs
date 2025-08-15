using Common.Library.Identity;
using Microsoft.AspNetCore.Authorization;

namespace OrderService.Auth;

public static class OrderPolicyExtensions
{
    public const string Read  = "OrderRead";
    public const string Write = "OrderWrite";

    public static IServiceCollection AddOrderPolicies(this IServiceCollection services)
    {
        services.AddSingleton<IAuthorizationHandler, ScopeHandler>();
        services.AddAuthorization(o =>
        {
            o.AddPolicy(Read,  p => p.Requirements.Add(new ScopeRequirement("order.read")));
            o.AddPolicy(Write, p =>
            {
                p.Requirements.Add(new ScopeRequirement("order.write"));
                p.RequireRole("Admin", "Manager", "Server"); 
            });
        });
        return services;
    }
}