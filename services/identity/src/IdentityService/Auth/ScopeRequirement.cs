using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;

namespace IdentityService.Auth;

// Require one of the space-delimited values in "scope" or array "scp"
public sealed class ScopeRequirement : IAuthorizationRequirement
{
    public string RequiredScope { get; }
    public ScopeRequirement(string scope) => RequiredScope = scope;
}

public sealed class ScopeHandler : AuthorizationHandler<ScopeRequirement>
{
    protected override Task HandleRequirementAsync(
        AuthorizationHandlerContext context, ScopeRequirement requirement)
    {
        var user = context.User;

        // "scp" claim (array or multiple) – commonly used by IdentityServer/AAD
        var scpClaims = user.FindAll("scp").Select(c => c.Value);
        if (scpClaims.Any(v => v.Split(' ', StringSplitOptions.RemoveEmptyEntries)
                                .Contains(requirement.RequiredScope)))
        {
            context.Succeed(requirement);
            return Task.CompletedTask;
        }

        // "scope" claim (space-delimited)
        var scope = user.FindFirstValue("scope");
        if (!string.IsNullOrWhiteSpace(scope))
        {
            var parts = scope.Split(' ', StringSplitOptions.RemoveEmptyEntries);
            if (parts.Contains(requirement.RequiredScope))
            {
                context.Succeed(requirement);
                return Task.CompletedTask;
            }
        }

        return Task.CompletedTask;
    }
}

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
