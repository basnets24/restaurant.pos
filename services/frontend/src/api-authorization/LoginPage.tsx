// auth/LoginPage.tsx
import  { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from './AuthProvider';
import { QueryParameterNames } from './ApiAuthorizationConstants';

export default function LoginPage() {
    const [params] = useSearchParams();
    const navigate = useNavigate();
    const { signIn, isAuthenticated } = useAuth();

    useEffect(() => {
        const returnUrl = params.get(QueryParameterNames.ReturnUrl) ?? `${window.location.origin}/home`;
        void signIn(returnUrl);
    }, [params, signIn]);

    // signIn() only returns without navigating away when it took the silent (already-logged-in
    // at the IdP) path - the interactive path redirects the whole browser via signinRedirect()
    // and never reaches here. Navigate in-app once that silent sign-in lands, instead of the
    // window.location.replace AuthProvider used to do (see its signIn()).
    useEffect(() => {
        if (!isAuthenticated) return;
        const returnUrl = params.get(QueryParameterNames.ReturnUrl) ?? `${window.location.origin}/home`;
        const path = returnUrl.startsWith(window.location.origin)
            ? returnUrl.slice(window.location.origin.length) || "/"
            : returnUrl;
        navigate(path, { replace: true });
    }, [isAuthenticated, navigate, params]);

    return <div>Processing login…</div>;
}
