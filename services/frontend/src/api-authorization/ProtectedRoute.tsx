// src/auth/ProtectedRoute.tsx
import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { AuthorizationPaths, QueryParameterNames } from './ApiAuthorizationConstants';
import { useAuth } from './AuthProvider';

type Props = React.PropsWithChildren<{ roles?: string[] }>;

export const ProtectedRoute: React.FC<Props> = ({ roles, children }) => {
    const { isReady, isAuthenticated, profile } = useAuth();
    const loc = useLocation();
    const returnUrl = `${window.location.origin}${loc.pathname}${loc.search}${loc.hash}`;
    const loginUrl = `${AuthorizationPaths.Login}?${QueryParameterNames.ReturnUrl}=${encodeURIComponent(returnUrl)}`;

    if (!isReady) return null;
    if (!isAuthenticated) return <Navigate to={loginUrl} replace />;

    // Optional role gating
    if (roles && roles.length > 0) {
        const raw = (profile as any)?.role as string | string[] | undefined;
        const userRoles = Array.isArray(raw) ? raw : raw ? [raw] : [];
        const ok = roles.some(r => userRoles.includes(r));
        if (!ok) return <Navigate to={AuthorizationPaths.DefaultLoginRedirectPath} replace />;
    }

    return <>{children}</>;
};
