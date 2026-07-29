import { tokenAccessor } from "@/auth/runtime";

export function decodeJwt(token: string): Record<string, unknown> | null {
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
  const roles = toArray<string>(p["role"]);
  const rid = p["restaurant_id"] ?? p["restaurantId"];
  const lid = p["location_id"] ?? p["locationId"];
  const exp = p["exp"] as number | undefined;
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
  const t = tokenAccessor?.() as string | undefined;
  if (!t) {
    console.warn("[auth] no base token available");
    return;
  }
  logToken(t, "base access token");
}

