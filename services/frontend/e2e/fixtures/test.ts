import { test as base } from "@playwright/test";
import { seedTableAndMenuItem, cleanupSeeded, type SeededPosData } from "./seed";

/**
 * Extends the base test with a `seededPos` fixture: seeds one dining table +
 * one available, in-stock menu item before the test body runs, and deletes
 * both afterwards regardless of whether the test passed or failed (fixture
 * teardown always runs) — see cleanupSeeded in ./seed for why that matters.
 */
export const test = base.extend<{ seededPos: SeededPosData }>({
  seededPos: async ({ request }, provide) => {
    const data = await seedTableAndMenuItem(request);
    await provide(data);
    await cleanupSeeded(request, data);
  },
});

export { expect } from "@playwright/test";
