// src/auth/ProtectedRoute.tsx
import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { AuthorizationPaths, QueryParameterNames } from './ApiAuthorizationConstants';
import { useAuth } from './AuthProvider';

export const ProtectedRoute: React.FC = () => {
    const { isReady, isAuthenticated } = useAuth();
    const loc = useLocation();
    const returnUrl = `${window.location.origin}${loc.pathname}${loc.search}${loc.hash}`;
    const loginUrl = `${AuthorizationPaths.Login}?${QueryParameterNames.ReturnUrl}=${encodeURIComponent(returnUrl)}`;

    if (!isReady) return null;
    return isAuthenticated ? <Outlet /> : <Navigate to={loginUrl} replace />;
};
