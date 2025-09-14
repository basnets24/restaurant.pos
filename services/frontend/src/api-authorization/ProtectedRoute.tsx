// src/auth/ProtectedRoute.tsx
import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { AuthorizationPaths, QueryParameterNames } from './ApiAuthorizationConstants';
import { useAuth } from './AuthProvider';
import { useRestaurantUserProfile } from "@/domain/restaurantUserProfile/Provider";
import { useTenant } from "@/app/TenantContext";
import { UnauthorizedError } from "@/domain/restaurantUserProfile/api";

type Props = React.PropsWithChildren<{ roles?: string[] }>;

export const ProtectedRoute: React.FC<Props> = ({ roles, children }) => {
    const { isReady, isAuthenticated, profile } = useAuth();
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

    // Now branch based on state
    if (!isReady) return null;
    if (!isAuthenticated) return <Navigate to={loginUrl} replace />;

    if (loc.pathname !== "/join") {
        if (isLoading) return null;
        if (error) {
            const statusCode = (error as any)?.status ?? (error as any)?.response?.status;
            // If onboarding status call returns 401 while authenticated, treat it as not onboarded
            // and send to onboarding instead of bouncing to login (avoids loops).
            if (statusCode === 401) {
                return <Navigate to="/join" replace />;
            }
            if (error instanceof UnauthorizedError) {
                return <Navigate to={loginUrl} replace />;
            }
        }
        if (status?.hasMembership) {
            // ensure TenantContext is hydrated
            if (status.restaurantId && status.restaurantId !== rid) setRid(status.restaurantId);
            if (status.locationId && status.locationId !== lid) setLid(status.locationId);
        } else {
            return <Navigate to="/join" replace />;
        }
    }

    // Optional role gating
    if (roles && roles.length > 0) {
        const raw = (profile as any)?.role as string | string[] | undefined;
        const userRoles = Array.isArray(raw) ? raw : raw ? [raw] : [];
        let ok = roles.some(r => userRoles.includes(r));
        // Fallback: if Admin is required but claim hasn't propagated yet, trust onboarding status
        if (!ok && roles.includes("Admin") && status?.isAdmin) ok = true;
        if (!ok) return <Navigate to={AuthorizationPaths.DefaultLoginRedirectPath} replace />;
    }

    return <>{children}</>;
};
