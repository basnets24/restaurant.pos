// auth/LogoutPage.tsx
import  { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from './AuthProvider';
import { QueryParameterNames } from './ApiAuthorizationConstants';

export default function LogoutPage() {
    const [params] = useSearchParams();
    const { signOut } = useAuth();

    useEffect(() => {
        const returnUrl = params.get(QueryParameterNames.ReturnUrl)
            ?? `${window.location.origin}/authentication/logged-out`;
        void signOut(returnUrl);
    }, [params, signOut]);

    return <div>Processing logout…</div>;
}
