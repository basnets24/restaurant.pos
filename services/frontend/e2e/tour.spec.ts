import { test, expect, type Page } from "@playwright/test";

// The guided tour only renders for a demo_admin session (isDemoProfile, see
// auth/demoSession.ts) - not the seeded real admin the "chromium" project's
// default storageState logs in as. Every test here needs its own fresh,
// logged-out context and authenticates via the one-click "Explore staff
// demo" button instead, same as auth.spec.ts's unauthenticated case.
async function startAdminDemo(page: Page) {
  await page.goto("/");
  await page.getByRole("button", { name: "Explore staff demo" }).click();
  await page.waitForURL(/\/home/, { timeout: 15000 });
}

const TOTAL_STEPS = 6;
const stepCounter = (n: number) => new RegExp(`^Step ${n} of ${TOTAL_STEPS}$`);

// The demo tenant's floor plan is shared, long-lived state across every run
// of this suite (no per-test seeding like pos-ordering.spec.ts's seededPos
// fixture) - a table clicked by an earlier run may already carry a fired
// order. kitchenStore's "is this order fired" flag is local to the browser
// context though (each test starts with a wiped origin, so it always reads
// false at first), while the *server's* cart/order state is real and
// persists - reusing an already-fired cart would make this test's own Fire
// click legitimately fail server-side (already checked out), which is a
// test-isolation problem, not a tour bug. Walk the floor until an actually
// "Available" table turns up, guaranteeing a brand-new cart every run.
async function openAvailableTable(page: Page) {
  const tables = page.locator("[data-table]");
  // count() doesn't wait for the floor plan's async table fetch to resolve -
  // without this, an empty/loading page reads as "no tables" and the loop
  // below never runs.
  await tables.first().waitFor({ state: "visible", timeout: 15000 });
  const count = await tables.count();
  for (let i = 0; i < count; i++) {
    await tables.nth(i).click();
    // Scoped to the dialog - the floor's own StatusLegend footer ("Available
    // 8") also matches "Available" text and isn't specific to this table.
    const dialog = page.getByRole("dialog").first();
    if (await dialog.getByText("Available", { exact: true }).isVisible()) return;
    await dialog.getByRole("button", { name: "Close" }).click();
  }
  throw new Error("No available table found on the demo floor plan");
}

// Picks a random in-stock item rather than always the first one - exercises
// the tour against a card other than whichever the tooltip itself happens
// to spotlight (see tourSteps.ts's menu-grid step), same reasoning as
// openAvailableTable not assuming a specific table. Scoped to "Add to
// Order" buttons specifically: an out-of-stock item's button reads "Out of
// Stock" instead, so this naturally excludes it without a separate check.
async function addRandomMenuItem(page: Page) {
  const addButtons = page.getByRole("button", { name: "Add to Order", exact: true });
  await addButtons.first().waitFor({ state: "visible", timeout: 15000 });
  const count = await addButtons.count();
  await addButtons.nth(Math.floor(Math.random() * count)).click();
}

test.describe("Guided demo tour", () => {
  test("walks through the full staff demo flow: dashboard to payment", async ({ browser }) => {
    // Several real navigations/API calls plus openAvailableTable potentially
    // probing multiple tables (see its own comment) - same rationale as
    // diner-ordering.spec.ts's multi-step flow.
    test.setTimeout(60000);
    const context = await browser.newContext({ storageState: { cookies: [], origins: [] } });
    const page = await context.newPage();

    await startAdminDemo(page);

    // Step 1 - welcome, anchored on the Floor & Orders tile; advances on the
    // user's own click navigating to /pos/tables, not a "Next" button
    // (welcome framing and "go to the floor plan" are folded into one step).
    await expect(page.getByText(stepCounter(1))).toBeVisible({ timeout: 15000 });
    await page.locator('[data-tour="floor-orders-tile"]').click();
    await page.waitForURL(/\/pos\/tables/, { timeout: 15000 });

    // Step 2 - "click any table" (see openAvailableTable for why this test
    // still has to pick a specific, actually-available one). Advances the
    // instant a table is clicked, opening the real TableActionDialog - no
    // separate tour step narrates that dialog, its own Seat Party/Open
    // Order labeling carries it.
    await expect(page.getByText(stepCounter(2))).toBeVisible({ timeout: 15000 });
    await openAvailableTable(page);
    await page.locator('[data-tour="seat-party-btn"]').click();
    await page.waitForURL(/\/pos\/table\/.+\/menu/, { timeout: 15000 });

    // Step 3 - the menu grid, cart still empty.
    await expect(page.getByText(stepCounter(3))).toBeVisible({ timeout: 15000 });
    await addRandomMenuItem(page);
    await page.getByRole("button", { name: "Next", exact: true }).click();

    // Step 4 (Fire to Kitchen) - openAvailableTable guarantees a fresh cart,
    // so this should always be reachable, but accept step 5 too: useGuidedTour
    // auto-skips step 4 if its target is already showing "Fired ✓" (see
    // tourSteps.ts's skipIf), which this assertion exercises defensively
    // rather than assuming a specific outcome.
    await expect(page.getByText(stepCounter(4)).or(page.getByText(stepCounter(5)))).toBeVisible({ timeout: 15000 });
    if (await page.getByText(stepCounter(4)).isVisible()) {
      await page.locator('[data-tour="fire-btn"]').click();
      await expect(page.getByText(stepCounter(5))).toBeVisible({ timeout: 15000 });
    }

    // Step 5 - Pay, now enabled since the order is fired either way.
    await page.locator('[data-tour="pay-btn"]').click();

    // Step 6 - closing card, no page anchor (Stripe's payment dialog opens
    // underneath). "Done" both finishes the tour and dismisses it. Matched
    // by text rather than getByRole("button", ...): Radix's payment Dialog
    // applies aria-hidden to sibling DOM (this tooltip included, since it's
    // a plain div rather than a coordinated Radix overlay) while it's open,
    // which drops the button from the accessibility tree even though it's
    // still visibly on top and mouse-clickable - a real, if narrow, a11y gap
    // worth a follow-up, but getByText matches on raw DOM text and isn't
    // affected by it.
    await expect(page.getByText(stepCounter(6))).toBeVisible({ timeout: 15000 });
    await page.getByText("Done", { exact: true }).click();
    await expect(page.getByText(stepCounter(6))).not.toBeVisible();

    await context.close();
  });

  test("dismissing the tour hides it for the rest of the session", async ({ browser }) => {
    const context = await browser.newContext({ storageState: { cookies: [], origins: [] } });
    const page = await context.newPage();

    await startAdminDemo(page);

    await expect(page.getByText(stepCounter(1))).toBeVisible({ timeout: 15000 });
    await page.getByRole("button", { name: "Skip tour" }).click();
    await expect(page.getByText(stepCounter(1))).not.toBeVisible();

    // Dismissal is sessionStorage-backed (see tourSteps.ts's
    // TOUR_DISMISSED_KEY) - it should survive a reload without the tooltip
    // reappearing, for the rest of this demo session.
    await page.reload();
    await expect(page.getByRole("heading", { name: "Floor & Orders" })).toBeVisible({ timeout: 15000 });
    await expect(page.getByText(stepCounter(1))).not.toBeVisible();

    await context.close();
  });
});
