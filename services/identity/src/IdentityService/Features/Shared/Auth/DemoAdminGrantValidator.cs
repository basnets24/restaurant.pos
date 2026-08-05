using Duende.IdentityServer.Models;
using Duende.IdentityServer.Validation;
using IdentityService.Entities;
using IdentityService.Features.Shared.Constants;
using IdentityService.HostedServices;
using Microsoft.AspNetCore.Identity;

namespace IdentityService.Features.Shared.Auth;

/// <summary>Backs the <see cref="OidcClients.DemoAdmin"/> client with a custom grant instead of
/// the password grant. A password grant validates whatever credentials are submitted against the
/// entire <see cref="ApplicationUser"/> store - since this client's <c>demoCredentials.ts</c>
/// values are already public and non-secret, that would let anyone submit *any* staff account's
/// real password through this client and get back a full-scope token, bypassing the normal
/// Authorization Code flow. This grant takes no credentials at all and always issues a token for
/// the one fixed seeded demo admin (see <see cref="DemoSeedHostedService"/>), so there is nothing
/// to stuff or steal.</summary>
public class DemoAdminGrantValidator : IExtensionGrantValidator
{
    public string GrantType => "demo_admin";

    private readonly UserManager<ApplicationUser> _userManager;

    public DemoAdminGrantValidator(UserManager<ApplicationUser> userManager)
    {
        _userManager = userManager;
    }

    public async Task ValidateAsync(ExtensionGrantValidationContext context, CancellationToken cancellationToken = default)
    {
        var demoAdmin = await _userManager.FindByEmailAsync(DemoSeedHostedService.AdminEmail);
        if (demoAdmin is null)
        {
            context.Result = new GrantValidationResult(TokenRequestErrors.InvalidGrant, "Demo admin account is not seeded");
            return;
        }

        context.Result = new GrantValidationResult(demoAdmin.Id.ToString(), GrantType);
    }
}
