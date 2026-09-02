// src/api-authorization/oidc.ts
import { UserManager, WebStorageStateStore } from 'oidc-client-ts';
import { ApplicationName, AuthorizationPaths } from './ApiAuthorizationConstants';
import { ENV } from '@/config/env';

const origin = window.location.origin;
const authority = ENV.IDENTITY_URL;

export const BASE_ID_SCOPES = 'openid profile roles tenancy';

const scope = import.meta.env.VITE_OIDC_SCOPE ?? BASE_ID_SCOPES;

export const userManager = new UserManager({
    authority,
    client_id: 'frontend',
    redirect_uri: `${origin}${AuthorizationPaths.LoginCallback}`,
    response_type: 'code',
    scope,
    post_logout_redirect_uri: `${origin}${AuthorizationPaths.LogOutCallback}`,
    automaticSilentRenew: true,
    includeIdTokenInSilentRenew: true,
    // Without this, silent renewal (the automaticSilentRenew timer, plus signinSilent() calls
    // from AuthProvider.signIn() and getApiToken.ts) defaults to reusing redirect_uri, loading
    // the full SPA - React, every provider, the router - inside a hidden iframe just to read a
    // postMessage response. silent-renew.html is a dedicated, near-empty page for that instead.
    silent_redirect_uri: `${origin}/silent-renew.html`,
    userStore: new WebStorageStateStore({ prefix: ApplicationName }),
});

// Optional: handle global signout
userManager.events.addUserSignedOut(async () => {
    await userManager.removeUser();
});
