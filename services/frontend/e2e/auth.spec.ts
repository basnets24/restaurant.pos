import { test, expect } from "@playwright/test";

test("unauthenticated visit to a protected route redirects to Identity login", async ({ browser }) => {
  // Fresh, logged-out context. Passing storageState explicitly (even empty) is
  // required here — browser.newContext() otherwise still inherits the
  // "chromium" project's default storageState (the seeded admin session from
  // auth.setup.ts) even when called with no arguments.
  const context = await browser.newContext({ storageState: { cookies: [], origins: [] } });
  const page = await context.newPage();

  await page.goto("/pos/tables");
  await page.waitForURL(/\/Identity\/Account\/Login/, { timeout: 15000 });
  await expect(page.locator("#Input_Email")).toBeVisible();

  await context.close();
});

test("authenticated session reaches protected POS content", async ({ page }) => {
  // Uses the "chromium" project's default storageState — the login performed
  // once by auth.setup.ts. Reaching real POS content (not a login redirect)
  // is the observable proof that login succeeded and the session persists.
  // TablesPage (floor canvas) has no page heading — the "Fit" zoom-control
  // button is always rendered regardless of whether the tenant has tables yet.
  await page.goto("/pos/tables");
  await expect(page.getByRole("button", { name: "Fit" })).toBeVisible({ timeout: 15000 });
});
