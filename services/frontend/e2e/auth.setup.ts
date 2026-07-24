import { test as setup } from "@playwright/test";
import { ADMIN_EMAIL, ADMIN_PASSWORD } from "./env";
import { ensureOnboarded } from "./fixtures/tenant";

const authFile = "e2e/.auth/admin.json";

// Runs once (Playwright's "setup" project, see playwright.config.ts) and caches
// the resulting storageState (cookies on both the frontend and identity
// origins + oidc-client-ts's localStorage user) for every other test to reuse,
// instead of logging in per-spec.
setup("authenticate as seeded admin", async ({ page }) => {
  await page.goto("/authentication/login");

  // LoginPage (src/api-authorization/LoginPage.tsx) tries a silent SSO check
  // first, which fails fast on a brand-new browser context, then falls back
  // to an interactive signinRedirect — a real cross-origin navigation to
  // IdentityServer's Duende-hosted Razor login page.
  await page.waitForURL(/\/Identity\/Account\/Login/, { timeout: 15000 });

  await page.locator("#Input_Email").fill(ADMIN_EMAIL);
  await page.locator("#Input_Password").fill(ADMIN_PASSWORD!);
  await page.getByRole("button", { name: "Sign in" }).click();

  // Back on the frontend: LoginCallback -> AuthProvider.completeSignIn lands on
  // /home. (Its own onboarding-status check uses a base-scope token, which
  // 401s against OnboardingController's LocalApi policy and is silently
  // swallowed — so this redirect happens regardless of membership state.
  // ProtectedRoute's check, below/elsewhere, is the one that actually matters.)
  await page.waitForURL(/\/home$/, { timeout: 15000 });

  // The seeded admin (IdentitySeedHostedService.cs) has restaurant/location
  // fields set directly on the ApplicationUser row, but no corresponding
  // Tenant.Domain RestaurantMembership — so ProtectedRoute still treats them
  // as never onboarded and would bounce every /pos/* etc. visit to /join.
  // Resolve (or, once, create) that membership now so the rest of the suite
  // reaches real content instead of the Join page. Uses page.request (bound to
  // this same browser context) rather than the top-level `request` fixture —
  // the "setup" project has no storageState configured (it's what establishes
  // one), so the standalone `request` fixture would start cookie-less here.
  await ensureOnboarded(page.request);

  await page.context().storageState({ path: authFile });
});
