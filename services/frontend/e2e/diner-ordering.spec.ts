import { test, expect } from "./fixtures/test";
import { registerDinerAccount } from "./fixtures/dinerAccount";

test("browse, customize, sign in and pay as a diner", async ({ page, request, dinerMenu }) => {
  // This flow has several more steps before it even reaches the Stripe dialog than
  // payment.spec.ts's does, so the default 30s test timeout runs out mid-payment rather than
  // on a genuine hang.
  test.setTimeout(60000);

  // Same reason as payment.spec.ts: the expanded Stripe accordion is taller than a default
  // browser window, so the dialog's submit button falls outside Playwright's viewport check.
  await page.setViewportSize({ width: 1280, height: 1600 });

  const diner = await registerDinerAccount(request);

  // ---- Discovery ----
  await page.goto("/order");
  await page.getByRole("textbox", { name: "Search restaurants" }).first().fill(dinerMenu.restaurantName);
  const listingCard = page.getByRole("button", { name: new RegExp(dinerMenu.restaurantName) });
  await expect(listingCard).toBeVisible({ timeout: 15000 });
  await listingCard.click();

  // ---- Menu + modifier ----
  await page.waitForURL(new RegExp(`/order/${dinerMenu.restaurantId}/${dinerMenu.locationId}`), { timeout: 15000 });
  const menuItemHeading = page.getByRole("heading", { name: dinerMenu.menuItemName, level: 3 });
  await expect(menuItemHeading).toBeVisible({ timeout: 15000 });
  // Scope to this item's own row: the E2E tenant accumulates the shared demo menu
  // (scripts/seed-discovery.sh has been run against it before), so several other items on
  // this page also have their own "Customize" button.
  const itemRow = page
    .locator("div")
    .filter({ has: menuItemHeading })
    .filter({ has: page.getByRole("button", { name: "Customize" }) })
    .last();
  await itemRow.getByRole("button", { name: "Customize" }).click();

  const dialog = page.getByRole("dialog", { name: dinerMenu.menuItemName });
  await expect(dialog).toBeVisible();
  // The "Size" group is required — Add stays disabled ("Choose size") until an option is
  // picked. Choosing the priced-up option also proves the modifier delta reaches the total.
  await dialog.getByRole("radio", { name: new RegExp(dinerMenu.largeOptionName) }).click();
  await dialog.getByRole("button", { name: /Add to Order/ }).click();

  // ---- Cart ----
  await page.getByRole("button", { name: /^Cart/ }).click();
  const cartSheet = page.getByRole("dialog").filter({ hasText: "Your order" });
  await expect(cartSheet.getByText(dinerMenu.menuItemName)).toBeVisible();
  await expect(cartSheet.getByText(dinerMenu.largeOptionName)).toBeVisible();
  await cartSheet.getByRole("button", { name: "Continue to Checkout" }).click();

  // ---- Sign in ----
  await page.waitForURL(/\/order\/checkout$/, { timeout: 15000 });
  await page.getByRole("button", { name: "Sign in to continue" }).click();
  await page.getByLabel("Email").fill(diner.email);
  await page.getByLabel("Password").fill(diner.password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();

  // Signing in reveals the server-computed quote and enables placing the order.
  await expect(page.getByText(`Ordering as ${diner.email}`)).toBeVisible({ timeout: 15000 });
  const placeOrderButton = page.getByRole("button", { name: "Place order" });
  await expect(placeOrderButton).toBeEnabled({ timeout: 15000 });
  await placeOrderButton.click();

  // ---- Order status + pay ----
  await page.waitForURL(/\/order\/orders\/.+/, { timeout: 15000 });
  // InventoryReservedConsumer only fires PaymentRequested once the saga confirms the order over
  // the broker, so the pay button takes a moment to go from disabled ("Preparing payment…") to
  // its priced, clickable state.
  const payButton = page.getByRole("button", { name: /^Pay \$/ });
  await expect(payButton).toBeEnabled({ timeout: 20000 });
  await payButton.click();

  await expect(page.getByRole("dialog", { name: "Payment" })).toBeVisible({ timeout: 15000 });

  // Same Stripe iframe gotchas as payment.spec.ts: the accordion needs an explicit expand
  // click before the card fields exist, and a second, unrelated iframe shares the same title.
  const stripeFrame = page.frameLocator(
    'iframe[title="Secure payment input frame"][src*="accessory-target"]'
  );
  await stripeFrame.locator('[data-value="card"]').click();
  await stripeFrame.locator('[name="number"]').fill("4242424242424242");
  await stripeFrame.locator('[name="expiry"]').fill("12/34");
  await stripeFrame.locator('[name="cvc"]').fill("123");
  await stripeFrame.locator('[name="postalCode"]').fill("94103");

  await page.getByRole("button", { name: "Pay now" }).click();

  await expect(page.getByRole("heading", { name: "Paid — see you soon" })).toBeVisible({ timeout: 15000 });
});
