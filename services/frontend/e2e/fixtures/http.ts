import type { APIRequestContext } from "@playwright/test";
import { getScopedAccessToken } from "./oidc";

/**
 * Mints a scoped access token and returns it as a ready-to-spread
 * Authorization header. Tenant headers (x-restaurant-id/x-location-id) are
 * deliberately not folded in here — not every authenticated call is
 * tenant-scoped (e.g. the onboarding endpoints in fixtures/tenant.ts are
 * keyed by the user's `sub`, not a tenant) — spread readTenantHeaders()
 * alongside this where it's actually needed.
 */
export async function authHeader(request: APIRequestContext, scopes: string[]): Promise<Record<string, string>> {
  const token = await getScopedAccessToken(request, scopes);
  return { Authorization: `Bearer ${token}` };
}
