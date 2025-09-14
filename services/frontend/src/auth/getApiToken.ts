import { oidc, BASE_ID_SCOPES } from "./oidc";
import { useAuth } from "./store";
import { logToken } from "./debug";

type Audience = "Tenant" | "Catalog" | "Order" | "Inventory" | "Payment" | "IdentityServerApi";

const cache = new Map<string, { token: string; exp: number }>();

function parseExp(jwt: string) {
  const [, payload] = jwt.split(".");
  const json = JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/")));
  return json.exp as number;
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
  const user = await oidc.signinSilent({ scope });

  const token = user!.access_token!;
  const exp = parseExp(token);
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
