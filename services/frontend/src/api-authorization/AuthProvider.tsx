// src/auth/AuthProvider.tsx
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { User } from 'oidc-client-ts';
import { userManager } from './oidc';
import { AuthorizationPaths } from './ApiAuthorizationConstants';

declare global {
    interface Window {
        POS_SHELL_AUTH?: { getToken?: () => string | undefined };
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

    // small helper to sync local state from a User
    const setFromUser = (u: User | null | undefined) => {
        setAuth(!!u);
        setProfile(u?.profile as unknown as Record<string, unknown> | undefined);
        setAccessToken(u?.access_token);
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
        const onUnloaded = () => setFromUser(undefined);
        const onExpired = async () => {
            // token expired — try silent renew path to refresh UI state if possible
            try {
                const u = await userManager.signinSilent();
                setFromUser(u);
            } catch {
                setFromUser(undefined);
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
            // Try silent first (if already logged in at the IdP)
            const u = await userManager.signinSilent();
            setFromUser(u);
            if (returnUrl) window.location.replace(returnUrl);
        } catch {
            // Fall back to redirect; carry returnUrl in `state`
            await userManager.signinRedirect({
                state: { returnUrl },
                redirect_uri: `${window.location.origin}${AuthorizationPaths.LoginCallback}`,
            });
        }
    };

    const completeSignIn = async () => {
        const u = await userManager.signinCallback(window.location.href);
        setFromUser(u);
        const returnUrl =
            (u?.state as any)?.returnUrl ??
            `${window.location.origin}${AuthorizationPaths.DefaultLoginRedirectPath}`;
        window.location.replace(returnUrl);
    };

    const signOut = async (returnUrl?: string) => {
        await userManager.signoutRedirect({
            state: { returnUrl },
            post_logout_redirect_uri: `${window.location.origin}${AuthorizationPaths.LogOutCallback}`,
        });
    };

    const completeSignOut = async () => {
        const res = await userManager.signoutCallback(window.location.href);
        // clear local session
        setFromUser(undefined);

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
        window.POS_SHELL_AUTH = { getToken: () => accessToken };
    }, [accessToken]);
    

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

export const useAuth = () => {
    const ctx = useContext(AuthCtx);
    if (!ctx) throw new Error('useAuth must be used within AuthProvider');
    return ctx;
};
