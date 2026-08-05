namespace IdentityService.Features.Shared.Constants;

/// <summary>Client IDs registered in <c>IdentityServerSettings:Clients</c>. Referenced where
/// behaviour legitimately differs per client, not for authorization decisions.</summary>
public static class OidcClients
{
    /// <summary>Staff SPA - authorization code + PKCE.</summary>
    public const string Staff = "frontend";

    /// <summary>Customer-facing diner ordering. Password grant, deliberately scoped to this
    /// one first-party client so the inline sign-in modal works; staff keep the real redirect
    /// flow. Diners have no <c>RestaurantMembership</c>, so they carry no tenant claims.
    /// Deliberately excludes the <c>roles</c> scope: since diners and staff share the same
    /// <see cref="IdentityService.Entities.ApplicationUser"/> store, a staff member's real
    /// credentials also work through this client, and nothing here uses role claims - only
    /// <c>sub</c>/<c>email</c> - so there's no reason to let their real staff role claims
    /// (Admin/Owner/...) ride along.</summary>
    public const string Diner = "spoontab-diner";

    /// <summary>Recruiter-facing "Admin Demo" button. Unlike <see cref="Diner"/>, this does NOT
    /// use the password grant - a password grant validates whatever credentials are submitted
    /// against the entire user store, and this client's "credentials" are already public
    /// (demoCredentials.ts), so anyone could submit a real staff member's password through it and
    /// get a full-scope token. Instead it uses a custom <c>demo_admin</c> grant
    /// (see <see cref="IdentityService.Features.Shared.Auth.DemoAdminGrantValidator"/>) that takes
    /// no credentials at all and always issues a token for the one fixed seeded demo admin. Not a
    /// general-purpose staff login path.</summary>
    public const string DemoAdmin = "spoontab-demo-admin";
}
