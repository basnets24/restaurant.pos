import { test, expect } from "./fixtures/test";

test("place an order from the POS floor plan through to order placed", async ({ page, seededPos }) => {
  const { tableNumber, menuItemName } = seededPos;

  await page.goto("/pos/tables");

  // TableMark (TablesPage.tsx) renders just the number + seat count, no
  // data-testid, so match on the `data-table` marker plus the exact table
  // number text — leftover tables from previous runs of this suite aren't
  // cleaned up, so an exact, unique number is required.
  await page.locator("[data-table]", { hasText: tableNumber }).click();

  // Clicking a table opens the TableActionDialog rather than navigating
  // straight to the menu; seating the party is what actually takes you there.
  await page.getByRole("button", { name: "Seat Party" }).click();
  await page.waitForURL(/\/pos\/table\/.+\/menu/, { timeout: 15000 });

  // Scope to the seeded item's own card (menu-item-card) so this doesn't
  // accidentally match "Add to Order" on some other item left over from a
  // previous run of this suite — there's no seed-data cleanup between runs.
  const menuItemCard = page.locator(".menu-item-card", { hasText: menuItemName });
  await expect(menuItemCard).toBeVisible({ timeout: 15000 });
  await menuItemCard.getByRole("button", { name: "Add to Order", exact: true }).click();
  // The "Added 1x ..." toast is transient (sonner auto-dismisses it) and can
  // vanish before an assertion polls for it — the sidebar's own item row is
  // the stable signal that the add-to-cart call actually succeeded.
  await expect(page.getByRole("heading", { name: menuItemName, level: 4 })).toBeVisible({ timeout: 15000 });

  // "Fire to Kitchen" is what actually creates the order and reserves
  // inventory (MenuPage.handleFireToKitchen -> POST /carts/{id}/checkout).
  // Paying is a separate, later step — the sidebar's Pay button stays
  // disabled until firing completes.
  await page.getByRole("button", { name: /Fire to Kitchen/ }).click();
  await expect(page.getByRole("button", { name: /Fired/ })).toBeVisible({ timeout: 15000 });

  // OrderSideBar's Pay button opens the inline payment dialog against the
  // already-created order — the dialog's "Pay Now" button appearing is the
  // "order placed" boundary. Actually paying (the Stripe PaymentElement step)
  // is covered separately by payment.spec.ts.
  await page.getByRole("button", { name: /^Pay/ }).click();
  await expect(page.getByRole("button", { name: /Pay Now/i })).toBeVisible({ timeout: 15000 });
});
