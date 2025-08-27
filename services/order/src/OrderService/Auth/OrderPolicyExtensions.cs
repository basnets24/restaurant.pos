using Common.Library.Identity;
using Microsoft.AspNetCore.Authorization;

namespace OrderService.Auth;

public static class OrderPolicyExtensions
{
    public const string Read  = "orders.read";
    public const string Write = "orders.write";
    
    public const string AssignSelf = "orders.assign-self";
    public const string ManageTables = "orders.manage-tables";

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
            
            // Only users in the "Server" role can self-assign/unassign
            o.AddPolicy(AssignSelf, p =>
                p.RequireAuthenticatedUser()
                    .RequireRole("Server"));

            // Admin/Manager can assign/clear any server on any table
            o.AddPolicy(ManageTables, p =>
                p.RequireAuthenticatedUser()
                    .RequireRole("Server", "Admin", "Manager"));
        });
        return services;
    }
}