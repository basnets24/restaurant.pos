// src/pages/auth/LoginCallbackPage.tsx
import { useEffect } from 'react';
import { useAuth } from './AuthProvider';
import { AuthorizationPaths } from './ApiAuthorizationConstants';

export default function LoginCallbackPage() {
    const { completeSignIn } = useAuth();

    useEffect(() => {
        (async () => {
            try {
                await completeSignIn();
            } catch {
                // Fallback: if state/returnUrl missing, go to home
                window.location.replace(AuthorizationPaths.DefaultLoginRedirectPath);
            }
        })();
    }, [completeSignIn]);
    return <div>Processing login callback…</div>;
}
