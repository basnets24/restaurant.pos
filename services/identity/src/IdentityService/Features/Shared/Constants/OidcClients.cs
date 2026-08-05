namespace IdentityService.Features.Shared.Constants;

/// <summary>Client IDs registered in <c>IdentityServerSettings:Clients</c>. Referenced where
/// behaviour legitimately differs per client, not for authorization decisions.</summary>
public static class OidcClients
{
    /// <summary>Staff SPA - authorization code + PKCE.</summary>
    public const string Staff = "frontend";

    /// <summary>Customer-facing diner ordering. Password grant, deliberately scoped to this
    /// one first-party client so the inline sign-in modal works; staff keep the real redirect
    /// flow. Diners have no <c>RestaurantMembership</c>, so they carry no tenant claims.</summary>
    public const string Diner = "spoontab-diner";

    /// <summary>Recruiter-facing "Admin Demo" button. Password grant like <see cref="Diner"/>,
    /// but scoped to the single seeded demo admin account so the landing page can log straight
    /// in without the Duende redirect screen. Not a general-purpose staff login path.</summary>
    public const string DemoAdmin = "spoontab-demo-admin";
}
