using System.Security.Claims;
using Common.Library.Identity;
using Microsoft.AspNetCore.Authorization;

namespace IdentityService.Auth;

// Require one of the space-delimited values in "scope" or array "scp"

public static class ScopePolicyExtensions
{
    public const string ReadPolicy = "ReadPolicy";
    public const string WritePolicy = "WritePolicy";
    public const string AdminPolicy = "AdminPolicy";

    public static IServiceCollection AddScopePolicies(this IServiceCollection services)
    {
        services.AddSingleton<IAuthorizationHandler, ScopeHandler>();
        services.AddAuthorization(o =>
        {
            o.AddPolicy(ReadPolicy, p => p.Requirements.Add(new ScopeRequirement("identity.read")));
            o.AddPolicy(WritePolicy, p => p.Requirements.Add(new ScopeRequirement("identity.write")));
            o.AddPolicy(AdminPolicy, p => p.Requirements.Add(new ScopeRequirement("identity.admin")));
        });

        return services;
    }
}
