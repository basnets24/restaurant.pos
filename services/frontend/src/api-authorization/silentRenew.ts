// Entry point for silent-renew.html. Deliberately minimal: it must resolve oidc-client-ts's
// postMessage handshake back to the pending signinSilent() promise in the parent frame, and
// nothing else - no React app, no providers, no router.
import { userManager } from './oidc';

userManager.signinSilentCallback().catch((e) => {
    console.warn('silentRenew: signinSilentCallback failed', e);
});
