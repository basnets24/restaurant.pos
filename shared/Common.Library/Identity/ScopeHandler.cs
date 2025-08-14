using Microsoft.AspNetCore.Authorization;

namespace Common.Library.Identity;
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
        // IdentityServer may emit multiple 'scope' claims (one per scope)
        // and/or a single space-delimited 'scope' claim. Handle both.
        var scopes = context.User.FindAll("scope")
            .SelectMany(c => c.Value.Split(' ', StringSplitOptions.RemoveEmptyEntries))
            .ToHashSet(StringComparer.Ordinal); // scopes are case-sensitive

        if (scopes.Contains(requirement.RequiredScope))
            context.Succeed(requirement);

        return Task.CompletedTask;
    }
}