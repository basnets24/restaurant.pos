import { test, expect } from "./fixtures/test";

test("place an order from the POS floor plan through to order placed", async ({ page, seededPos }) => {
  const { tableNumber, menuItemName } = seededPos;

  await page.goto("/pos/tables");

  // TableNode (TablesPage.tsx) renders "{section} #{number} {seats} seats" as
  // one button whose accessible name concatenates all three. No data-testid
  // exists on this screen, so match by text — exact table number, since
  // leftover tables from previous runs of this suite aren't cleaned up.
  await page.getByRole("button", { name: `Main #${tableNumber} 2 seats` }).click();
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

  // OrderSideBar's checkout button (bound to MenuPage.handleCheckout) fires the
  // order to the kitchen and navigates to SuccessView — this is the "order
  // placed" boundary; paying for the order is a separate, later step on
  // OrderPage and is covered by payment.spec.ts instead.
  await page.getByRole("button", { name: /^Checkout/ }).click();
  await page.waitForURL(/\/checkout\/success/, { timeout: 15000 });
  await expect(page.getByRole("heading", { name: "Order Placed" })).toBeVisible();
});
