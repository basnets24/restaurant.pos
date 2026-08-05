import type { APIRequestContext } from "@playwright/test";
import { IDENTITY_URL } from "../env";

export interface DinerCredentials {
  email: string;
  password: string;
}

/**
 * Registers a throwaway diner account directly against `/public/diner/register`, the same
 * endpoint `DinerAuthDialog`'s "Create account" mode calls. Done here rather than by driving
 * the register form in the browser so the spec's one browser-driven sign-in exercises the
 * dialog's "signIn" mode against a known-good account, instead of retracing registration too —
 * and so repeated local runs don't stack up against `DinerRegistration`'s 5-per-15-minutes
 * rate limit (see identity's `RateLimitPolicies`) as fast as clicking through the UI would.
 *
 * No cleanup: there is no delete-account endpoint, and nothing else in this suite deletes the
 * accounts/tenants it creates either.
 */
export async function registerDinerAccount(request: APIRequestContext): Promise<DinerCredentials> {
  const suffix = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
  const email = `e2e-diner-${suffix}@example.com`;
  const password = "E2eDinerPwd!1";

  const response = await request.post(`${IDENTITY_URL}/public/diner/register`, {
    data: { email, password, displayName: "E2E Diner" },
  });
  if (!response.ok()) {
    throw new Error(`Failed to register diner account: ${response.status()} ${await response.text()}`);
  }

  return { email, password };
}
