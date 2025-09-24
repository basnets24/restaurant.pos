// src/auth/oidc.ts
import { UserManager, WebStorageStateStore } from 'oidc-client-ts';
import { ApplicationName, AuthorizationPaths } from './ApiAuthorizationConstants';
import { ENV } from '@/config/env';

const origin = window.location.origin;
const authority = ENV.IDENTITY_URL;

const scope = import.meta.env.VITE_OIDC_SCOPE ?? 'openid profile roles tenancy tenant.claims.read';

export const userManager = new UserManager({
    authority,
    client_id: 'frontend',
    redirect_uri: `${origin}${AuthorizationPaths.LoginCallback}`,
    response_type: 'code',
    scope,
    post_logout_redirect_uri: `${origin}${AuthorizationPaths.LogOutCallback}`,
    automaticSilentRenew: true,
    includeIdTokenInSilentRenew: true,
    userStore: new WebStorageStateStore({ prefix: ApplicationName }),
});

// Optional: handle global signout
userManager.events.addUserSignedOut(async () => {
    await userManager.removeUser();
});
