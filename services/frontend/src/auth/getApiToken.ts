import { oidc, BASE_ID_SCOPES } from "./oidc";
import { useAuth } from "./store";
import { logToken } from "./debug";
import { AuthorizationPaths, QueryParameterNames } from "@/api-authorization/ApiAuthorizationConstants";

type Audience = "Tenant" | "Catalog" | "Order" | "Inventory" | "Payment" | "IdentityServerApi";

const cache = new Map<string, { token: string; exp: number }>();

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

  const scope = `${BASE_ID_SCOPES} ${neededScopes.join(" ")}`.trim();
  let user: Awaited<ReturnType<typeof oidc.signinSilent>> | null = null;
  try {
    user = await oidc.signinSilent({ scope });
  } catch (err: any) {
    const msg = String(err?.message || err || "signinSilent failed").toLowerCase();
    // If the OP requires interactive login, send user to login preserving returnUrl
    if (msg.includes("login_required") || msg.includes("consent_required") || msg.includes("interaction_required")) {
      const returnUrl = `${window.location.origin}${window.location.pathname}${window.location.search}${window.location.hash}`;
      const url = `${AuthorizationPaths.Login}?${QueryParameterNames.ReturnUrl}=${encodeURIComponent(returnUrl)}`;
      window.location.assign(url);
      // Return a never-resolving promise to halt callers after redirect
      return new Promise<string>(() => { });
    }
    throw err;
  }

  const token = user?.access_token;
  if (!token || typeof token !== "string") {
    throw new Error("Missing access token from OIDC");
  }
  const exp = parseExp(token) ?? (Math.floor(Date.now() / 1000) + 60); // fallback short cache
  cache.set(key, { token, exp });

  // merge granted scopes into UI store so permissions update
  const st = useAuth.getState();
  const merged = Array.from(new Set([...(st.grants?.scopes ?? []), ...neededScopes]));
  useAuth.setGrants({ ...(st.grants ?? { roles: [] }), scopes: merged });

  if (import.meta.env.DEV && (window as any)?.AUTH_DEBUG) {
    logToken(token, `scoped token (scopes=${neededScopes.join(" ")})`);
  }

  return token;
}
