import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { APIRequestContext } from "@playwright/test";
import { authHeader } from "./http";
import { IDENTITY_URL } from "../env";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TENANT_FILE = path.resolve(__dirname, "../.auth/tenant.json");

export interface TenantInfo {
  restaurantId: string;
  locationId: string;
}

/**
 * The seeded admin (IdentitySeedHostedService.cs) has CurrentRestaurantId
 * "acme-bistro" set directly on the ApplicationUser row, but OnboardingController
 * .GetStatus reads a *different*, relational source of truth — Tenant.Domain's
 * RestaurantMemberships table — which the seed service never populates. So a
 * freshly seeded admin has hasMembership=false and ProtectedRoute sends every
 * request to /join, same as any other never-onboarded user, until this runs.
 *
 * This resolves (or, once only, creates) that membership over HTTP — the same
 * "Create Restaurant" action a human would take once by hand on a fresh
 * environment — and returns the real restaurant/location ids (Restaurant.Id is
 * a generated Guid, not the "acme-bistro" slug, so these must be threaded
 * through rather than hardcoded).
 */
export async function ensureOnboarded(request: APIRequestContext): Promise<TenantInfo> {
  const headers = await authHeader(request, ["IdentityServerApi"]);
  const statusResponse = await request.get(`${IDENTITY_URL}/api/onboarding/status`, { headers });
  if (!statusResponse.ok()) {
    throw new Error(`GET /api/onboarding/status failed: ${statusResponse.status()} ${await statusResponse.text()}`);
  }
  const status = (await statusResponse.json()) as {
    hasMembership: boolean;
    restaurantId: string | null;
    locationId: string | null;
  };

  let info: TenantInfo;
  if (status.hasMembership && status.restaurantId && status.locationId) {
    info = { restaurantId: status.restaurantId, locationId: status.locationId };
  } else {
    const createResponse = await request.post(`${IDENTITY_URL}/api/onboarding/restaurant`, {
      headers,
      data: { name: `E2E Test Restaurant ${Date.now().toString(36)}` },
    });
    if (!createResponse.ok()) {
      throw new Error(
        `POST /api/onboarding/restaurant failed: ${createResponse.status()} ${await createResponse.text()}`
      );
    }
    const created = (await createResponse.json()) as { restaurantId: string; locationId: string };
    info = created;
  }

  fs.mkdirSync(path.dirname(TENANT_FILE), { recursive: true });
  fs.writeFileSync(TENANT_FILE, JSON.stringify(info, null, 2));
  return info;
}

/** Read back what auth.setup.ts (via ensureOnboarded) resolved for this tenant. */
export function readTenantHeaders(): Record<string, string> {
  if (!fs.existsSync(TENANT_FILE)) {
    throw new Error(`${TENANT_FILE} not found — run the "setup" project (auth.setup.ts) first.`);
  }
  const info = JSON.parse(fs.readFileSync(TENANT_FILE, "utf-8")) as TenantInfo;
  return { "x-restaurant-id": info.restaurantId, "x-location-id": info.locationId };
}
