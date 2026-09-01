import { userManager, BASE_ID_SCOPES } from "@/api-authorization/oidc";
import { addGrantedScopes } from "./permissions";
import { logToken } from "./debug";
import { AuthorizationPaths, QueryParameterNames } from "@/api-authorization/ApiAuthorizationConstants";
import { errorMessage } from "@/lib/apiErrors";
import { isDemoProfile } from "./demoSession";
import type { AppProfile } from "./types";

type Audience = "Tenant" | "Catalog" | "Order" | "Payment" | "IdentityServerApi";

const cache = new Map<string, { token: string; exp: number }>();

export function clearApiTokenCache() {
  cache.clear();
}

// Every in-flight signinSilent() attempt started below registers itself here so
// AuthProvider's own expiry-driven renewal (onExpired) can wait for it instead of racing
// it - without this, onExpired's independent renewal could fail and clear session state
// while one of these was still about to succeed, leaving local state out of sync with a
// token this module was about to hand back. See AuthProvider.tsx's onExpired.
const pendingRenewals = new Set<Promise<unknown>>();

export async function waitForPendingRenewals(): Promise<void> {
  if (pendingRenewals.size === 0) return;
  await Promise.allSettled(Array.from(pendingRenewals));
}

function parseExp(jwt: string): number | undefined {
  try {
    const [, payload] = jwt.split(".");
    if (!payload) return undefined;
    const json = JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/")));
    return typeof json.exp === "number" ? json.exp : undefined;
  } catch {
    return undefined;
  }
}

export async function getApiToken(_resource: Audience, neededScopes: string[]) {
  // Duende Resource Indicators are optional and often disabled.
  // Instead of passing `resource=...`, request the needed API scopes.
  // Duende will include the corresponding ApiResource(s) in `aud`.

  const key = neededScopes.sort().join(" ") || "base";
  const skew = 30;
  const now = Math.floor(Date.now() / 1000) + skew;

  const hit = cache.get(key);
  if (hit && hit.exp > now) return hit.token;

  // The token already on hand may cover every scope this call needs even though it's not
  // in `cache` under this exact key yet (e.g. a demo session minted once with a broad scope
  // set up front - see AuthProvider.signInDemoAdmin). Reuse it directly rather than always
  // paying for a signinSilent() round trip first: that round trip is a hidden-iframe
  // prompt=none request against the IdP, and for a session with no real Authorization Code
  // session there (any password/custom-grant session) it's guaranteed to fail before we'd
  // fall back to this same token anyway.
  const current = await userManager.getUser();
  if (current && !current.expired && neededScopes.every((s) => current.scopes.includes(s))) {
    const token = current.access_token;
    const exp = parseExp(token) ?? (Math.floor(Date.now() / 1000) + 60);
    cache.set(key, { token, exp });
    addGrantedScopes(neededScopes);
    return token;
  }

  const scope = `${BASE_ID_SCOPES} ${neededScopes.join(" ")}`.trim();
  let user: Awaited<ReturnType<typeof userManager.signinSilent>>;
  const attempt = userManager.signinSilent({ scope });
  pendingRenewals.add(attempt);
  try {
    user = await attempt;
  } catch (err: unknown) {
    const msg = String(errorMessage(err) || err || "signinSilent failed").toLowerCase();
    // If the OP requires interactive login, send user to login preserving returnUrl
    if (msg.includes("login_required") || msg.includes("consent_required") || msg.includes("interaction_required")) {
      // A demo session (see AuthProvider.signInDemoAdmin) has no username/password to sign
      // back in with - bouncing it to the real staff login page is a dead end. Send it back
      // to the landing page instead, where "Explore staff demo" can mint a fresh one.
      if (isDemoProfile(current?.profile as AppProfile | undefined)) {
        try { await userManager.removeUser(); } catch (e) { console.warn("getApiToken: failed to remove expired demo user", e); }
        window.location.assign(`${window.location.origin}/`);
        return new Promise<string>(() => { });
      }

      const returnUrl = `${window.location.origin}${window.location.pathname}${window.location.search}${window.location.hash}`;
      const url = `${AuthorizationPaths.Login}?${QueryParameterNames.ReturnUrl}=${encodeURIComponent(returnUrl)}`;
      window.location.assign(url);
      // Return a never-resolving promise to halt callers after redirect
      return new Promise<string>(() => { });
    }
    throw err;
  } finally {
    pendingRenewals.delete(attempt);
  }

  const token = user?.access_token;
  if (!token || typeof token !== "string") {
    throw new Error("Missing access token from OIDC");
  }
  const exp = parseExp(token) ?? (Math.floor(Date.now() / 1000) + 60); // fallback short cache
  cache.set(key, { token, exp });

  // merge granted scopes into the accumulator so permission checks update
  addGrantedScopes(neededScopes);

  if (import.meta.env.DEV && window.AUTH_DEBUG) {
    logToken(token, `scoped token (scopes=${neededScopes.join(" ")})`);
  }

  return token;
}
