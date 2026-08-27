// src/auth/AuthProvider.tsx
import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { User } from 'oidc-client-ts';
import { userManager } from './oidc';
import { clearApiTokenCache } from "@/auth/getApiToken";
import { clearTenant } from "@/auth/tenant";
import { clearKitchenState } from "@/features/pos/kitchen/kitchenStore";
import { clearAllTableSessions } from "@/stores";
import { ENV } from "@/config/env";
import { AuthorizationPaths } from './ApiAuthorizationConstants';
import { bindAuthAccessors } from "@/auth/runtime";
import type { AppProfile, SignInState } from "@/auth/types";

// Recruiter-facing "Admin Demo" button. `spoontab-demo-admin` is a custom `demo_admin`-grant
// OIDC client (see OidcClients.DemoAdmin, identity service's DemoAdminGrantValidator) that takes
// no credentials at all and always issues a token for the one fixed seeded demo admin - so this
// can log in with one click instead of bouncing through the Duende-hosted login page like real
// staff do, with nothing to submit that could double as a real staff member's password.
const DEMO_ADMIN_CLIENT_ID = "spoontab-demo-admin";
const DEMO_ADMIN_SCOPE =
    "openid profile roles tenancy IdentityServerApi menu.read menu.write catalog.inventory.read catalog.inventory.write order.read order.write payment.read payment.charge payment.refund";

// The custom grant issues no id_token (that's an OIDC-flow concept the extension grant pipeline
// doesn't produce) - restaurant_id/location_id/role claims ride on the access_token instead, same
// as dinerAuth.ts's decodeClaims does for the diner client.
function decodeAccessTokenProfile(accessToken: string): AppProfile {
    const [, payload] = accessToken.split(".");
    const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64 + "===".slice((base64.length + 3) % 4);
    return JSON.parse(atob(padded)) as AppProfile;
}

// Local caches to wipe whenever a session ends (sign-out or an unexpected
// unload, e.g. silent renew failing) - a shared device switching tenants
// must not carry the previous tenant's id or POS-local state into the next
// login. Centralized here since AuthProvider is the one place that observes
// every way a session can end.
function clearSessionLocalState() {
    clearTenant();
    clearKitchenState();
    clearAllTableSessions();
    try { clearApiTokenCache(); } catch (e) { console.warn("AuthProvider: clearApiTokenCache failed", e); }
}


type AuthState = {
    isReady: boolean;
    isAuthenticated: boolean;
    isSigningOut: boolean;
    accessToken?: string;
    profile?: AppProfile;
    signIn: (returnUrl?: string) => Promise<void>;
    signInDemoAdmin: (returnUrl?: string) => Promise<void>;
    completeSignIn: () => Promise<void>;
    signOut: (returnUrl?: string) => Promise<void>;
    completeSignOut: () => Promise<void>;
    getAccessToken: () => Promise<string | undefined>;
};

const AuthCtx = createContext<AuthState | null>(null);

export const AuthProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
    const [isReady, setReady] = useState(false);
    const [isAuthenticated, setAuth] = useState(false);
    const [profile, setProfile] = useState<AppProfile>();
    const [accessToken, setAccessToken] = useState<string>();
    const lastSubRef = useRef<string | undefined>(undefined);
    // signoutRedirect() clears the local user (firing onUnloaded -> isAuthenticated=false)
    // *before* it navigates the browser away to the IdP. Without this flag, ProtectedRoute
    // reacts to that transient unauthenticated state while still on the page and kicks off
    // its own auto re-login redirect, which races the real sign-out redirect and can pre-empt
    // it - leaving the IdP session alive while the app thinks it's logged out.
    const isSigningOutRef = useRef(false);

    // small helper to sync local state from a User
    const setFromUser = (u: User | null | undefined) => {
        // A cached user object surviving in storage from a previous session
        // isn't necessarily still valid - getUser() returns whatever's on
        // disk without checking expiry, so an expired-but-present object
        // would otherwise read as isAuthenticated=true and let consumers
        // (e.g. TenantInfoProvider) fire authenticated calls that are bound
        // to fail and force a login redirect. Treat expired as logged-out.
        const authed = !!u && !u.expired;
        setAuth(authed);
        setProfile(authed ? (u?.profile as AppProfile | undefined) : undefined);
        setAccessToken(authed ? u?.access_token : undefined);
        const sub = u?.profile?.sub;
        if (sub && lastSubRef.current && lastSubRef.current !== sub) {
            try { clearApiTokenCache(); } catch (e) { console.warn("AuthProvider: clearApiTokenCache failed on user switch", e); }
        }
        lastSubRef.current = sub;
    };

    // Initial load + wire up useful events
    useEffect(() => {
        let mounted = true;

        const load = async () => {
            try {
                const u = await userManager.getUser();
                if (!mounted) return;
                setFromUser(u ?? undefined);
                // getUser() doesn't purge an expired record - left in place, oidc-client-ts's
                // own expiry timer fires shortly after load and drives a doomed signinSilent()
                // (see onExpired below), repeating the same login_required warning on every
                // visit until an actual sign-in overwrites it. Purge it now instead.
                if (u?.expired) {
                    try { await userManager.removeUser(); } catch (e) { console.warn("AuthProvider: failed to remove expired user on load", e); }
                }
            } finally {
                if (mounted) setReady(true);
            }
        };

        // keep state in sync if the user is reloaded/removed elsewhere
        const onLoaded = (u: User) => setFromUser(u);
        const onUnloaded = () => {
            setFromUser(undefined);
            clearSessionLocalState();
        };
        const onExpired = async () => {
            // token expired — try silent renew path to refresh UI state if possible
            try {
                const u = await userManager.signinSilent();
                setFromUser(u);
            } catch (e) {
                console.warn("AuthProvider: silent renew failed after token expiry", e);
                setFromUser(undefined);
                clearSessionLocalState();
                // Purge the dead record so it stops triggering this same doomed
                // renewal attempt (and warning) on every subsequent page load.
                try { await userManager.removeUser(); } catch (e2) { console.warn("AuthProvider: failed to remove user after failed renew", e2); }
            }
        };

        userManager.events.addUserLoaded(onLoaded);
        userManager.events.addUserUnloaded(onUnloaded);
        userManager.events.addAccessTokenExpired(onExpired);

        load();

        return () => {
            mounted = false;
            userManager.events.removeUserLoaded(onLoaded);
            userManager.events.removeUserUnloaded(onUnloaded);
            userManager.events.removeAccessTokenExpired(onExpired);
        };
    }, []);

    // The browser's back-forward cache can restore an entire frozen page
    // snapshot (including in-memory React/JS state) from before a logout,
    // without re-running any app code - so navigating "back" after signing
    // out can show stale isAuthenticated=true state. Force a real reload
    // whenever the page is served from bfcache so auth state gets re-checked.
    useEffect(() => {
        const handlePageShow = (event: PageTransitionEvent) => {
            if (event.persisted) {
                window.location.reload();
            }
        };
        window.addEventListener('pageshow', handlePageShow);
        return () => window.removeEventListener('pageshow', handlePageShow);
    }, []);

    const signIn = async (returnUrl?: string) => {
        try {
            // If we recently signed out, skip silent once to avoid auto SSO login via back button
            const skipSilent = sessionStorage.getItem("auth.skipSilentOnce") === "1";
            if (!skipSilent) {
                // Try silent first (if already logged in at the IdP)
                const u = await userManager.signinSilent();
                setFromUser(u);
                if (returnUrl) window.location.replace(returnUrl);
                return;
            }
            sessionStorage.removeItem("auth.skipSilentOnce");
            // Fall through to interactive login. redirectMethod: "replace" swaps
            // out the internal /authentication/login entry instead of stacking
            // the IdP page on top of it - otherwise browser Back from the IdP
            // page lands back on /authentication/login, which just redirects
            // away again instead of returning to where the user came from.
            await userManager.signinRedirect({
                state: { returnUrl },
                prompt: "login",
                redirect_uri: `${window.location.origin}${AuthorizationPaths.LoginCallback}`,
                redirectMethod: "replace",
            });
        } catch {
            // Fall back to redirect; carry returnUrl in `state`
            await userManager.signinRedirect({
                state: { returnUrl },
                prompt: "login",
                redirect_uri: `${window.location.origin}${AuthorizationPaths.LoginCallback}`,
                redirectMethod: "replace",
            });
        }
    };

    const signInDemoAdmin = async (returnUrl?: string) => {
        const res = await fetch(`${ENV.IDENTITY_URL}/connect/token`, {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
                client_id: DEMO_ADMIN_CLIENT_ID,
                grant_type: "demo_admin",
                scope: DEMO_ADMIN_SCOPE,
            }),
        });
        if (!res.ok) {
            throw new Error("Could not start the admin demo. Please try again.");
        }
        const token = (await res.json()) as {
            access_token: string;
            token_type: string;
            scope?: string;
            expires_in: number;
        };

        const user = new User({
            access_token: token.access_token,
            token_type: token.token_type,
            scope: token.scope,
            profile: decodeAccessTokenProfile(token.access_token),
            expires_at: Math.floor(Date.now() / 1000) + token.expires_in,
        });

        await userManager.storeUser(user);
        setFromUser(user);
        window.location.replace(returnUrl ?? `${window.location.origin}${AuthorizationPaths.DefaultLoginRedirectPath}`);
    };

    const completeSignIn = async () => {
        const u = await userManager.signinCallback(window.location.href);
        setFromUser(u);
        const suggested =
            (u?.state as SignInState | undefined)?.returnUrl ??
            `${window.location.origin}${AuthorizationPaths.DefaultLoginRedirectPath}`;

        // After login, check onboarding status; if not onboarded, go to /join
        try {
            const token = u?.access_token;
            if (token) {
                const r = await fetch(`${ENV.IDENTITY_URL}/api/onboarding/status`, {
                    headers: { Authorization: `Bearer ${token}` },
                    credentials: "include",
                });
                if (r.ok) {
                    const s = await r.json();
                    if (!s?.hasMembership) {
                        window.location.replace(`${window.location.origin}/join`);
                        return;
                    }
                }
            }
        } catch (e) {
            // swallow and fall through to suggested URL
            console.warn("AuthProvider: onboarding status check failed", e);
        }

        window.location.replace(suggested);
    };

    const signOut = async (returnUrl?: string) => {
        // Set before anything else: signoutRedirect() removes the local user (and thus
        // flips isAuthenticated to false) before it navigates away, so this must already
        // be true by the time that happens - see isSigningOutRef's declaration comment.
        isSigningOutRef.current = true;
        // Signal to the next login attempt to skip silent once
        try { sessionStorage.setItem("auth.skipSilentOnce", "1"); } catch (e) { console.warn("AuthProvider: failed to set skipSilentOnce flag", e); }
        await userManager.signoutRedirect({
            state: { returnUrl },
            post_logout_redirect_uri: `${window.location.origin}${AuthorizationPaths.LogOutCallback}`,
        });
    };

    const completeSignOut = async () => {
        const res = await userManager.signoutCallback(window.location.href);
        // clear local session + tenant
        setFromUser(undefined);
        clearSessionLocalState();


        const to =
            (res?.state as SignInState | undefined)?.returnUrl ??
            `${window.location.origin}${AuthorizationPaths.LoggedOut}`;
        window.location.replace(to);
    };

    const getAccessToken = async () => {
        const u = await userManager.getUser();
        return u?.access_token;
    };

    useEffect(() => {
        bindAuthAccessors({ getToken: () => accessToken });
    }, [accessToken]);


    const value = useMemo<AuthState>(
        () => ({
            isReady,
            isAuthenticated,
            // Read fresh on every recompute rather than tracked as a dep: what matters is
            // that it's already true by the time isAuthenticated flips to false on sign-out
            // (see isSigningOutRef's declaration comment), and that recompute is triggered
            // by the isAuthenticated dependency below.
            isSigningOut: isSigningOutRef.current,
            accessToken,
            profile,
            signIn,
            signInDemoAdmin,
            completeSignIn,
            signOut,
            completeSignOut,
            getAccessToken,
        }),
        [isReady, isAuthenticated, accessToken, profile]
    );


    return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
};

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
    const ctx = useContext(AuthCtx);
    if (!ctx) throw new Error('useAuth must be used within AuthProvider');
    return ctx;
}
