// src/auth/AuthProvider.tsx
import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { User } from 'oidc-client-ts';
import { userManager } from './oidc';
import { clearApiTokenCache } from "@/auth/getApiToken";
import { ENV } from "@/config/env";
import { AuthorizationPaths } from './ApiAuthorizationConstants';

declare global {
    interface Window {
        POS_SHELL_AUTH?: { getToken?: () => string | undefined; getTenant?: () => { restaurantId?: string; locationId?: string } | undefined };
    }
}

type AuthState = {
    isReady: boolean;
    isAuthenticated: boolean;
    accessToken?: string;
    profile?: Record<string, unknown>;
    signIn: (returnUrl?: string) => Promise<void>;
    completeSignIn: () => Promise<void>;
    signOut: (returnUrl?: string) => Promise<void>;
    completeSignOut: () => Promise<void>;
    getAccessToken: () => Promise<string | undefined>;
};

const AuthCtx = createContext<AuthState | null>(null);

export const AuthProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
    const [isReady, setReady] = useState(false);
    const [isAuthenticated, setAuth] = useState(false);
    const [profile, setProfile] = useState<Record<string, unknown>>();
    const [accessToken, setAccessToken] = useState<string>();
    const lastSubRef = useRef<string | undefined>(undefined);

    // small helper to sync local state from a User
    const setFromUser = (u: User | null | undefined) => {
        setAuth(!!u);
        setProfile(u?.profile as unknown as Record<string, unknown> | undefined);
        setAccessToken(u?.access_token);
        const sub = (u?.profile as any)?.sub as string | undefined;
        if (sub && lastSubRef.current && lastSubRef.current !== sub) {
            try { clearApiTokenCache(); } catch {}
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
            } finally {
                if (mounted) setReady(true);
            }
        };

        // keep state in sync if the user is reloaded/removed elsewhere
        const onLoaded = (u: User) => setFromUser(u);
        const onUnloaded = () => {
            setFromUser(undefined);
            try { localStorage.removeItem('rid'); localStorage.removeItem('lid'); } catch {}
            try { clearApiTokenCache(); } catch {}
        };
        const onExpired = async () => {
            // token expired — try silent renew path to refresh UI state if possible
            try {
                const u = await userManager.signinSilent();
                setFromUser(u);
            } catch {
                setFromUser(undefined);
                try { clearApiTokenCache(); } catch {}
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
            } else {
                sessionStorage.removeItem("auth.skipSilentOnce");
            }
            // Fall through to interactive login
        } catch {
            // Fall back to redirect; carry returnUrl in `state`
            await userManager.signinRedirect({
                state: { returnUrl },
                prompt: "login",
                redirect_uri: `${window.location.origin}${AuthorizationPaths.LoginCallback}`,
            });
        }
    };

    const completeSignIn = async () => {
        const u = await userManager.signinCallback(window.location.href);
        setFromUser(u);
        const suggested =
            (u?.state as any)?.returnUrl ??
            `${window.location.origin}${AuthorizationPaths.DefaultLoginRedirectPath}`;

        // After login, check onboarding status; if not onboarded, go to /join
        try {
            const token = u?.access_token;
            if (token) {
                const r = await fetch(`${ENV.TENANT_URL}/api/onboarding/status`, {
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
        } catch {
            // swallow and fall through to suggested URL
        }

        window.location.replace(suggested);
    };

    const signOut = async (returnUrl?: string) => {
        // Signal to the next login attempt to skip silent once
        try { sessionStorage.setItem("auth.skipSilentOnce", "1"); } catch {}
        await userManager.signoutRedirect({
            state: { returnUrl },
            post_logout_redirect_uri: `${window.location.origin}${AuthorizationPaths.LogOutCallback}`,
        });
    };

    const completeSignOut = async () => {
        const res = await userManager.signoutCallback(window.location.href);
        // clear local session + tenant
        setFromUser(undefined);
        try {
            localStorage.removeItem('token');
            localStorage.removeItem('rid');
            localStorage.removeItem('lid');
        } catch {}
        try { clearApiTokenCache(); } catch {}

        const to =
            (res?.state as any)?.returnUrl ??
            `${window.location.origin}${AuthorizationPaths.LoggedOut}`;
        window.location.replace(to);
    };

    const getAccessToken = async () => {
        const u = await userManager.getUser();
        return u?.access_token;
    };

    useEffect(() => {
        window.POS_SHELL_AUTH = {
            getToken: () => accessToken,
            getTenant: () => {
                const rid = (profile as any)?.restaurant_id ?? (profile as any)?.restaurantId;
                const lid = (profile as any)?.location_id ?? (profile as any)?.locationId;
                return rid ? { restaurantId: rid as string, locationId: (lid as string | undefined) } : undefined;
            }
        };
    }, [accessToken, profile]);
    

    const value = useMemo<AuthState>(
        () => ({
            isReady,
            isAuthenticated,
            accessToken,
            profile,
            signIn,
            completeSignIn,
            signOut,
            completeSignOut,
            getAccessToken,
        }),
        [isReady, isAuthenticated, accessToken, profile]
    );
    

    return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
};

export function useAuth() {
    const ctx = useContext(AuthCtx);
    if (!ctx) throw new Error('useAuth must be used within AuthProvider');
    return ctx;
}
