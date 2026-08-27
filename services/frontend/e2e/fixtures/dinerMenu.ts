import { execFileSync } from "node:child_process";
import type { APIRequestContext } from "@playwright/test";
import { authHeader } from "./http";
import { readTenantHeaders } from "./tenant";
import { CATALOG_URL, IDENTITY_URL } from "../env";

export interface SeededDinerMenu {
  restaurantId: string;
  restaurantName: string;
  locationId: string;
  menuItemId: string;
  menuItemName: string;
  sizeGroupName: string;
  largeOptionName: string;
  largeOptionDelta: number;
}

/**
 * Makes the E2E tenant's location publicly discoverable (real HTTP calls, the same admin
 * endpoints Phase 6's discovery-admin verification exercised) and gives it one menu item with
 * a required single-select modifier group, so the diner flow has something to browse,
 * customize, and check out.
 *
 * There is no staff API for modifier groups (see catalog/README.md's "Diner ordering" section
 * — deliberately out of scope in this project, seeded by script only), so those two rows go in
 * via a direct psql call against the same local Postgres container `scripts/seed-discovery.sh`
 * uses, scoped to just this one item's id rather than touching every tenant the way that
 * script does. Deleting the menu item at teardown cascades both rows away (see
 * CatalogDbContext's `OnDelete(DeleteBehavior.Cascade)` on `ModifierGroup`).
 */
export async function seedDinerMenu(request: APIRequestContext): Promise<SeededDinerMenu> {
  const tenantHeaders = readTenantHeaders();
  const restaurantId = tenantHeaders["x-restaurant-id"];
  const locationId = tenantHeaders["x-location-id"];
  const suffix = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
  const idHeaders = await authHeader(request, ["IdentityServerApi"]);

  // Needed to search for this exact restaurant on the discovery page — "E2E Test Restaurant"
  // alone isn't unique across leftover restaurants from previous suite runs (nothing in the
  // suite deletes them), but the full name with its creation timestamp is.
  const tenantResponse = await request.get(`${IDENTITY_URL}/tenants/${restaurantId}`, {
    headers: idHeaders,
  });
  if (!tenantResponse.ok()) {
    throw new Error(`Failed to read tenant name: ${tenantResponse.status()} ${await tenantResponse.text()}`);
  }
  const { restaurant } = (await tenantResponse.json()) as { restaurant: { name: string } };

  // ---- Discoverability ----
  const cuisineResponse = await request.put(`${IDENTITY_URL}/tenants/${restaurantId}/discovery`, {
    headers: idHeaders,
    data: { cuisine: "Test Cuisine" },
  });
  if (!cuisineResponse.ok()) {
    throw new Error(`Failed to set restaurant cuisine: ${cuisineResponse.status()} ${await cuisineResponse.text()}`);
  }

  const listingResponse = await request.put(
    `${IDENTITY_URL}/tenants/${restaurantId}/locations/${locationId}/discovery`,
    {
      headers: idHeaders,
      data: {
        isDiscoverable: true,
        address: "1 E2E Test Way",
        displayDistanceMiles: 1.2,
        estimatedPickupMinutes: 15,
      },
    }
  );
  if (!listingResponse.ok()) {
    throw new Error(`Failed to list location: ${listingResponse.status()} ${await listingResponse.text()}`);
  }

  // ---- Menu item (same two-call pattern as seedTableAndMenuItem in ./seed) ----
  const menuHeaders = { ...tenantHeaders, ...(await authHeader(request, ["menu.write"])) };
  const menuItemName = `E2E Diner Item ${suffix}`;
  const menuItemResponse = await request.post(`${CATALOG_URL}/menu-items`, {
    headers: menuHeaders,
    data: {
      name: menuItemName,
      description: "Seeded by the Playwright diner E2E suite",
      price: 12.0,
      category: "Mains",
    },
  });
  if (!menuItemResponse.ok()) {
    throw new Error(`Failed to seed diner menu item: ${menuItemResponse.status()} ${await menuItemResponse.text()}`);
  }
  const menuItem = (await menuItemResponse.json()) as { id: string };

  const stockResponse = await request.patch(`${CATALOG_URL}/menu-items/${menuItem.id}`, {
    headers: menuHeaders,
    data: { isAvailable: true, quantity: 25 },
  });
  if (!stockResponse.ok()) {
    throw new Error(`Failed to stock diner menu item: ${stockResponse.status()} ${await stockResponse.text()}`);
  }

  // ---- Modifier group + options: required single-select "Size", Regular (default) / Large (+$2.50) ----
  const sizeGroupName = "Size";
  const largeOptionName = "Large";
  const largeOptionDelta = 2.5;
  const sql = `
    WITH g AS (
      INSERT INTO catalog."ModifierGroups"
        ("Id","MenuItemId","Name","SelectionType","Required","DisplayOrder","RestaurantId","LocationId")
      VALUES (gen_random_uuid(), '${menuItem.id}', '${sizeGroupName}', 'Single', true, 0,
              '${restaurantId}', '${locationId}')
      RETURNING "Id"
    )
    INSERT INTO catalog."ModifierOptions" ("Id","ModifierGroupId","Name","PriceDelta","DisplayOrder","IsDefault")
    SELECT gen_random_uuid(), g."Id", o.name, o.delta, o.ord, o.is_default
    FROM g CROSS JOIN (VALUES
      ('Regular', 0.00, 0, true),
      ('${largeOptionName}', ${largeOptionDelta}, 1, false)
    ) AS o(name, delta, ord, is_default);
  `;
  execFileSync("docker", ["exec", "-i", "restaurant-postgres", "psql", "-v", "ON_ERROR_STOP=1", "-U", "postgres", "-d", "identity_db", "-q"], {
    input: sql,
  });

  // Both the discoverability PUTs above and the menu item's own MenuItemCreated/Updated events
  // (consumed by the order service's PosReadModelProjector — required for diner checkout to
  // resolve this item at all) propagate asynchronously; give them a moment.
  await new Promise((resolve) => setTimeout(resolve, 2000));

  return {
    restaurantId,
    restaurantName: restaurant.name,
    locationId,
    menuItemId: menuItem.id,
    menuItemName,
    sizeGroupName,
    largeOptionName,
    largeOptionDelta,
  };
}

/**
 * Deletes the menu item this seeded (cascading its modifier group/options). Does not unlist
 * the location or clear the cuisine — nothing else in this suite cleans up tenant records
 * either, and the E2E tenant itself is recreated fresh by auth.setup.ts on the next full run.
 */
export async function cleanupDinerMenu(request: APIRequestContext, data: SeededDinerMenu): Promise<void> {
  const tenantHeaders = readTenantHeaders();
  await request.delete(`${CATALOG_URL}/menu-items/${data.menuItemId}`, {
    headers: { ...tenantHeaders, ...(await authHeader(request, ["menu.write"])) },
  });
}
