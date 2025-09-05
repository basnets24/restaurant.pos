// src/auth/oidc.ts
import { UserManager, WebStorageStateStore } from 'oidc-client-ts';
import { ApplicationName, AuthorizationPaths } from './ApiAuthorizationConstants';

const origin = window.location.origin;
const authority =
    import.meta.env.VITE_IDENTITY_URL ||
    (window as any).IDENTITY_SERVICE_URL;

if (!authority) {
    // Throw early so you see the real cause, not "No authority configured"
    throw new Error(
        'IDENTITY_SERVICE_URL (or VITE_IDENTITY_URL) is missing. ' +
        'Import ./bootstrapIdentity BEFORE any auth imports and set VITE_IDENTITY_URL in .env.local'
    );
}

export const userManager = new UserManager({
    authority: (window as any).IDENTITY_SERVICE_URL, // same as your JS version
    client_id: 'frontend',
    redirect_uri: `${origin}${AuthorizationPaths.LoginCallback}`,
    response_type: 'code',
    scope:
        'openid profile menu.read menu.write inventory.read inventory.write order.read order.write payment.read payment.charge ' +
        'payment.refund IdentityServerApi roles',
    post_logout_redirect_uri: `${origin}${AuthorizationPaths.LogOutCallback}`,
    automaticSilentRenew: true,
    includeIdTokenInSilentRenew: true,
    userStore: new WebStorageStateStore({ prefix: ApplicationName }),
});

// Optional: handle global signout
userManager.events.addUserSignedOut(async () => {
    await userManager.removeUser();
});
