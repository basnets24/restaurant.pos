export function decodeJwt(token: string): any {
  try {
    const [, payload] = token.split(".");
    const json = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
    return JSON.parse(json);
  } catch {
    return null;
  }
}

function toArray<T = string>(v: unknown): T[] {
  if (Array.isArray(v)) return v as T[];
  if (v == null) return [] as T[];
  return [v as T];
}

export function logToken(token: string, label = "token") {
  const p = decodeJwt(token);
  if (!p) {
    console.warn(`[auth] ${label}: invalid token`);
    return;
  }
  const aud = toArray<string>(p["aud"]);
  const scopes = toArray<string>(p["scope"]);
  const roles = toArray<string>((p as any)["role"]);
  const rid = (p as any)["restaurant_id"] ?? (p as any)["restaurantId"];
  const lid = (p as any)["location_id"] ?? (p as any)["locationId"];
  const exp = (p as any)["exp"] as number | undefined;
  const now = Math.floor(Date.now() / 1000);
  const ttl = exp ? `${Math.max(0, exp - now)}s` : "?";

  console.group(`[auth] ${label}`);
  console.log("aud:", aud);
  console.log("scope:", scopes);
  console.log("roles:", roles);
  if (rid || lid) console.log("tenant:", { restaurantId: rid, locationId: lid });
  if (exp) console.log("exp:", new Date(exp * 1000).toISOString(), `(in ${ttl})`);
  console.groupEnd();
}

export function logCurrentBaseToken() {
  const { tokenAccessor } = require("@/auth/runtime");
  const t = tokenAccessor?.() as string | undefined;
  if (!t) {
    console.warn("[auth] no base token available");
    return;
  }
  logToken(t, "base access token");
}

