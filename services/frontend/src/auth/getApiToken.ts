import { userManager, BASE_ID_SCOPES } from "@/api-authorization/oidc";
import { addGrantedScopes, getGrantedScopes } from "./permissions";
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

// Concurrent callers asking for the same scope set (e.g. Home mounting useDomainTables,
// useOrders, and useNotifications together, all needing `order.read`) would otherwise each
// race their own signinSilent() - a hidden-iframe prompt=none round trip - before any of them
// had populated `cache`. Keyed by the same string as `cache`, so the second+ caller awaits the
// first's in-flight attempt instead of starting a duplicate one.
const inFlight = new Map<string, Promise<string>>();

// Fire-and-forget warmup for a scope a layout knows its children will need imminently (e.g.
// ManagementLayout mounting before its MenuTab/StaffTab chunk finishes loading). Lets the
// signinSilent() round trip overlap with route/chunk transition time instead of only starting
// once the page that actually needs the token has mounted. Errors are swallowed here - a failed
// prefetch just means the real caller pays the normal cost when it asks for the token itself.
export function prefetchApiToken(resource: Audience, neededScopes: string[]) {
  void getApiToken(resource, neededScopes).catch(() => { });
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

  const existing = inFlight.get(key);
  if (existing) return existing;

  const promise = mintToken(key, neededScopes).finally(() => inFlight.delete(key));
  inFlight.set(key, promise);
  return promise;
}

async function mintToken(key: string, neededScopes: string[]): Promise<string> {
  // The token already on hand may cover every scope this call needs even though it's not
  // in `cache` under this exact key yet (e.g. a demo session minted once with a broad scope
  // set up front - see AuthProvider.signInDemoAdmin). Reuse it directly rather than always
  // paying for a signinSilent() round trip first: that round trip is a hidden-iframe
  // prompt=none request against the IdP, and for a session with no real Authorization Code
  // session there (any password/custom-grant session) it's guaranteed to fail before we'd
  // fall back to this same token anyway.
  const current = await userManager.getUser();
  // Seed the accumulator from whatever the persisted token already carries - after a reload
  // (which wipes `cache` and this module's in-memory grant history) the accumulator would
  // otherwise start empty even though `current` still has everything granted before the
  // reload, causing the union below to regress to just `neededScopes` for the first new
  // scope requested post-reload.
  if (current?.scopes?.length) {
    addGrantedScopes(current.scopes);
  }

  if (current && !current.expired && neededScopes.every((s) => current.scopes.includes(s))) {
    const token = current.access_token;
    const exp = parseExp(token) ?? (Math.floor(Date.now() / 1000) + 60);
    cache.set(key, { token, exp });
    addGrantedScopes(neededScopes);
    return token;
  }

  // Request the union of every scope granted so far this session plus the newly needed ones,
  // not just neededScopes alone - each signinSilent() replaces the single stored OIDC user, so
  // requesting a narrow scope here would discard breadth already won by earlier calls (see the
  // comment on `inFlight` above for the sibling problem this pairs with).
  const unionScopes = new Set([...getGrantedScopes(), ...neededScopes]);
  const scope = `${BASE_ID_SCOPES} ${Array.from(unionScopes).join(" ")}`.trim();
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
