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
            } catch (e) {
                // automaticSilentRenew (see oidc.ts) loads this same route inside a hidden
                // iframe on every token-expiry check, and a failed renewal (e.g.
                // error=login_required, no live IdP session) rejects here by design -
                // completeSignIn's own signinCallback() call already resolved the pending
                // signinSilent() promise back in the parent frame before throwing, so there's
                // nothing left to recover here. Redirecting this iframe would just be a wasted
                // reload that oidc-client-ts's iframe teardown aborts anyway.
                if (window.self !== window.top) return;
                console.warn("LoginCallbackPage: completeSignIn failed", e);
                // Fallback: if state/returnUrl missing, go to home
                window.location.replace(AuthorizationPaths.DefaultLoginRedirectPath);
            }
        })();
    }, [completeSignIn]);
    return <div>Processing login callback…</div>;
}
