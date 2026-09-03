// src/auth/ProtectedRoute.tsx
import React, { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { AuthorizationPaths, QueryParameterNames } from './ApiAuthorizationConstants';
import { useAuth } from './AuthProvider';
import { useRestaurantUserProfile } from "@/domain/restaurantUserProfile/Provider";
import { useTenant } from "@/auth/tenant";
import { UnauthorizedError } from "@/domain/restaurantUserProfile/api";
import { errorStatus } from "@/lib/apiErrors";
import { FullScreenLoader } from "@/components/primitives/FullScreenLoader";
import { isDemoProfile } from "@/auth/demoSession";

type Props = React.PropsWithChildren<{
    roles?: string[];
    /** Redirect away instead of rendering, for a route the public demo_admin
     * session shouldn't reach even though it carries the same roles/scopes as
     * a real Admin/Manager login (see auth/demoSession.ts). Redirects to
     * demoRedirectTo (default "/management"). */
    blockDemo?: boolean;
    demoRedirectTo?: string;
}>;

export const ProtectedRoute: React.FC<Props> = ({ roles, blockDemo, demoRedirectTo = "/management", children }) => {
    const { isReady, isAuthenticated, isSigningOut, profile } = useAuth();
    const loc = useLocation();
    const returnUrl = `${window.location.origin}${loc.pathname}${loc.search}${loc.hash}`;
    const loginUrl = `${AuthorizationPaths.Login}?${QueryParameterNames.ReturnUrl}=${encodeURIComponent(returnUrl)}`;
    const hooks = useRestaurantUserProfile();
    const { rid, lid, setRid, setLid } = useTenant();

    // Always call hooks in the same order. Drive behavior via flags.
    const { data: status, error, isLoading } = hooks.useOnboardingStatus(
      { rid: rid ?? undefined, lid: lid ?? undefined },
      { retry: 1, enabled: isReady && isAuthenticated && loc.pathname !== "/join" }
    );

    // Sync TenantContext from onboarding status after render, not during it -
    // calling setRid/setLid in the render body updates the useSyncExternalStore
    // snapshot this same component is subscribed to via useTenant(), which React
    // flags as "setState while rendering a different component".
    useEffect(() => {
        if (loc.pathname === "/join") return;
        if (status?.hasMembership) {
            if (status.restaurantId && status.restaurantId !== rid) setRid(status.restaurantId);
            if (status.locationId && status.locationId !== lid) setLid(status.locationId);
        }
    }, [loc.pathname, status, rid, lid, setRid, setLid]);

    // Now branch based on state
    if (!isReady) return <FullScreenLoader />;
    // signOut() clears the local user (isAuthenticated -> false) before the browser actually
    // navigates away to the IdP's sign-out endpoint. Redirecting to login here would race that
    // real redirect and can pre-empt it, leaving the IdP session alive while the app thinks
    // it's logged out (a later "Log In" click then silently re-authenticates the old user).
    if (isSigningOut) return null;
    if (!isAuthenticated) return <Navigate to={loginUrl} replace />;

    if (loc.pathname !== "/join") {
        if (isLoading) return <FullScreenLoader />;
        if (error) {
            const statusCode = errorStatus(error);
            // If onboarding status call returns 401 while authenticated, treat it as not onboarded
            // and send to onboarding instead of bouncing to login (avoids loops).
            if (statusCode === 401) {
                return <Navigate to="/join" replace />;
            }
            if (error instanceof UnauthorizedError) {
                return <Navigate to={loginUrl} replace />;
            }
        }
        if (!status?.hasMembership) {
            return <Navigate to="/join" replace />;
        }
    }

    // Optional role gating
    if (roles && roles.length > 0) {
        const raw = profile?.role;
        const userRoles = Array.isArray(raw) ? raw : raw ? [raw] : [];
        let ok = roles.some(r => userRoles.includes(r));
        // Fallback: if Admin is required but claim hasn't propagated yet, trust onboarding status
        if (!ok && roles.includes("Admin") && status?.isAdmin) ok = true;
        if (!ok) return <Navigate to={AuthorizationPaths.DefaultLoginRedirectPath} replace />;
    }

    if (blockDemo && isDemoProfile(profile)) {
        return <Navigate to={demoRedirectTo} replace />;
    }

    return <>{children}</>;
};
