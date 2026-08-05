import { test as base } from "@playwright/test";
import { seedTableAndMenuItem, cleanupSeeded, type SeededPosData } from "./seed";
import { seedDinerMenu, cleanupDinerMenu, type SeededDinerMenu } from "./dinerMenu";

/**
 * Extends the base test with a `seededPos` fixture: seeds one dining table +
 * one available, in-stock menu item before the test body runs, and deletes
 * both afterwards regardless of whether the test passed or failed (fixture
 * teardown always runs) — see cleanupSeeded in ./seed for why that matters.
 *
 * `dinerMenu` is the equivalent for the diner-facing suite: lists the E2E
 * tenant publicly and gives it one menu item with a modifier group, deleting
 * just the menu item afterward (see cleanupDinerMenu in ./dinerMenu for why
 * the listing itself is left alone).
 */
export const test = base.extend<{ seededPos: SeededPosData; dinerMenu: SeededDinerMenu }>({
  seededPos: async ({ request }, provide) => {
    const data = await seedTableAndMenuItem(request);
    await provide(data);
    await cleanupSeeded(request, data);
  },
  dinerMenu: async ({ request }, provide) => {
    const data = await seedDinerMenu(request);
    await provide(data);
    await cleanupDinerMenu(request, data);
  },
});

export { expect } from "@playwright/test";
