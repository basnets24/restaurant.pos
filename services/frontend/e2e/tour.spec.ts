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
    // still has to pick a specific, actually-available one, and why it may
    // click and close a few before finding it - advanceOn: "route-change"
    // means none of that probing advances the tour early, only actually
    // landing on a table's menu page does). No separate tour step narrates
    // the TableActionDialog itself - its own Seat Party/Open Order labeling
    // carries it.
    await expect(page.getByText(stepCounter(2))).toBeVisible({ timeout: 15000 });
    await openAvailableTable(page);
    // TableActionDialog counts as a modal (useGuidedTour's modalOpen), so
    // the tooltip is hidden while any dialog is open regardless of step -
    // close without seating first, to confirm the click alone didn't
    // silently advance past step 2 (advanceOn: "route-change" means only
    // actually navigating into a menu does).
    await page.getByRole("dialog").first().getByRole("button", { name: "Close" }).click();
    await expect(page.getByText(stepCounter(2))).toBeVisible({ timeout: 15000 });
    await openAvailableTable(page);
    await page.locator('[data-tour="seat-party-btn"]').click();
    await page.waitForURL(/\/pos\/table\/.+\/menu/, { timeout: 15000 });

    // Step 3 - the menu grid, cart still empty. Advances on its own
    // (advanceOn: "condition") once an item lands in the cart - no Next
    // button on this step.
    await expect(page.getByText(stepCounter(3))).toBeVisible({ timeout: 15000 });
    await addRandomMenuItem(page);
    await expect(page.getByText(stepCounter(3))).not.toBeVisible({ timeout: 15000 });

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

    // Step 5 - Pay. Opening the dialog no longer advances the tour by itself
    // (advanceOn: "event") - the tooltip stays on step 5 and stays visible
    // through the payment dialog (visibleDuringModal, since its test-card
    // guidance matters most right here), without registering as an outside
    // click that closes the dialog (CheckoutPaymentDialog's
    // onPointerDownOutside ignores clicks on the tour's own portal).
    await page.locator('[data-tour="pay-btn"]').click();
    await expect(page.getByRole("dialog", { name: "Payment" })).toBeVisible({ timeout: 15000 });
    await expect(page.getByText(stepCounter(5))).toBeVisible();

    await page.setViewportSize({ width: 1280, height: 1600 });
    await page.getByRole("button", { name: "Pay Now" }).click();

    const stripeFrame = page.frameLocator(
      'iframe[title="Secure payment input frame"][src*="accessory-target"]'
    );
    await stripeFrame.locator('[data-value="card"]').click();
    await stripeFrame.locator('[name="number"]').fill("4242424242424242");
    await stripeFrame.locator('[name="expiry"]').fill("12/34");
    await stripeFrame.locator('[name="cvc"]').fill("123");
    await stripeFrame.locator('[name="postalCode"]').fill("94103");
    await page.getByRole("button", { name: "Pay now" }).click();

    // Payment confirmed server-side - MenuPage dispatches the tour's
    // PAYMENT_SUCCEEDED_EVENT here, advancing to step 6, but the tooltip
    // stays hidden until the success card's own dialog is dismissed - and
    // since it was a paid dismissal, MenuPage sends us back to /home too.
    await expect(page.getByText("Payment complete")).toBeVisible({ timeout: 15000 });
    await expect(page.getByText(stepCounter(6))).not.toBeVisible();
    await page.getByRole("button", { name: "Back to Home" }).click();
    await page.waitForURL(/\/home/, { timeout: 15000 });

    // Step 6 - closing card, no page anchor, now on the dashboard the
    // payment flow returned to. "Done" finishes and dismisses the tour
    // without navigating anywhere further.
    await expect(page.getByText(stepCounter(6))).toBeVisible({ timeout: 15000 });
    await expect(page.getByRole("button", { name: "Done" })).toBeVisible();
    await page.getByRole("button", { name: "Done" }).click();
    await expect(page.getByText(stepCounter(6))).not.toBeVisible();
    await expect(page).toHaveURL(/\/home/);

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
