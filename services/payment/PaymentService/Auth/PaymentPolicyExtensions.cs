using Common.Library.Identity;
using Microsoft.AspNetCore.Authorization;

namespace PaymentService.Auth;

public static class PaymentPolicyExtensions
{
    public const string Read   = "PaymentRead";
    public const string Charge = "PaymentCharge";
    public const string Refund = "PaymentRefund";

    public static IServiceCollection AddPaymentPolicies(this IServiceCollection services)
    {
        services.AddSingleton<IAuthorizationHandler, ScopeHandler>();
        services.AddAuthorization(o =>
        {
            o.AddPolicy(Read,   p => p.Requirements.Add(new ScopeRequirement("payment.read")));
            o.AddPolicy(Charge, p =>
            {
                p.Requirements.Add(new ScopeRequirement("payment.charge"));
                p.RequireRole("Admin", "Manager", "Server", "Cashier");
            });
            o.AddPolicy(Refund, p =>
            {
                p.Requirements.Add(new ScopeRequirement("payment.refund"));
                p.RequireRole("Admin", "Manager", "Cashier");
            });
        });
        return services;
    }
}
