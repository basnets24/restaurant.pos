import { test, expect } from "./fixtures/test";
import { placeOrder } from "./fixtures/order";

test("pay for a placed order with a Stripe test card", async ({ page, request, seededPos }) => {
  // The Stripe dialog, once the Card accordion is expanded, is taller than a
  // default browser window — grow the viewport so its submit button is
  // actually reachable rather than fighting Playwright's viewport checks.
  await page.setViewportSize({ width: 1280, height: 1600 });

  const { orderId } = await placeOrder(request, seededPos.tableId, seededPos.menuItemId);

  await page.goto(`/pos/table/${seededPos.tableId}/order?order=${orderId}`);
  await expect(page.getByRole("button", { name: "Pay Now" })).toBeVisible({ timeout: 15000 });
  await page.getByRole("button", { name: "Pay Now" }).click();

  // handlePayNow (OrderPage.tsx) requests payment, then polls up to 12s for a
  // PaymentIntent client secret before opening the embedded Stripe dialog.
  await expect(page.getByRole("dialog", { name: "Payment" })).toBeVisible({ timeout: 15000 });

  // The Payment Element's test Stripe account has multiple payment methods
  // enabled, so it renders as a collapsed accordion (Card/Bank/Cash App/...)
  // rather than bare card fields — "Card" is pre-selected but its panel still
  // needs an explicit click to expand before the number/expiry/cvc inputs
  // exist in the DOM. Both the accordion and the fields live in the same
  // "Secure payment input frame" iframe (its src identifies it as
  // "accessory-target" — there's a second, unrelated iframe with the same
  // title that's just Stripe's dev-tools/error-reporting overlay).
  const stripeFrame = page.frameLocator(
    'iframe[title="Secure payment input frame"][src*="accessory-target"]'
  );
  await stripeFrame.locator('[data-value="card"]').click();
  await stripeFrame.locator('[name="number"]').fill("4242424242424242");
  await stripeFrame.locator('[name="expiry"]').fill("12/34");
  await stripeFrame.locator('[name="cvc"]').fill("123");
  await stripeFrame.locator('[name="postalCode"]').fill("94103");

  await page.getByRole("button", { name: "Pay now" }).click();

  // handlePaymentSuccess (OrderPage.tsx) closes the dialog and shows both a
  // status Badge and a separate confirmation line reading "Paid" once
  // PaymentSessionController confirms the PaymentIntent server-side — scope
  // to the badge specifically since both match plain getByText("Paid").
  await expect(page.locator('[data-slot="badge"]', { hasText: "Paid" })).toBeVisible({ timeout: 15000 });
});
