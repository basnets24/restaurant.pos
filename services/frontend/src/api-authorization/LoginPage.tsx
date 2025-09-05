// auth/LoginPage.tsx
import  { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from './AuthProvider';
import { QueryParameterNames } from './ApiAuthorizationConstants';

export default function LoginPage() {
    const [params] = useSearchParams();
    const { signIn } = useAuth();

    useEffect(() => {
        const returnUrl = params.get(QueryParameterNames.ReturnUrl) ?? `${window.location.origin}/home`;
        void signIn(returnUrl);
    }, [params, signIn]);

    return <div>Processing login…</div>;
}
