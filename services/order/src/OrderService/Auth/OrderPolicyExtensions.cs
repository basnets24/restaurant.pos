using Common.Library.Identity;
using Microsoft.AspNetCore.Authorization;

namespace OrderService.Auth;

public static class OrderPolicyExtensions
{
    public const string Read  = "orders.read";
    public const string Write = "orders.write";
    
    public const string AssignSelf = "orders.assign-self";
    public const string ManageTables = "orders.manage-tables";

    // Diner-facing policies. Deliberately keyed on the `diner` scope rather than on
    // order.read/order.write, so staff and diner tokens cannot reach each other's
    // endpoints: only the spoontab-diner client requests `diner`, and the staff policies
    // below require a role no diner will ever hold.
    //
    // Scope alone is NOT the security boundary here - it only proves "some diner". Every
    // diner-facing handler must additionally check that the order's CustomerId matches the
    // caller's sub, in the service layer, or one diner can read another's orders.
    public const string DinerRead = "orders.diner-read";
    public const string DinerWrite = "orders.diner-write";

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

            o.AddPolicy(DinerRead, p =>
            {
                p.RequireAuthenticatedUser();
                p.Requirements.Add(new ScopeRequirement("diner"));
            });
            o.AddPolicy(DinerWrite, p =>
            {
                p.RequireAuthenticatedUser();
                p.Requirements.Add(new ScopeRequirement("diner"));
            });
        });
        return services;
    }
}