import type { APIRequestContext } from "@playwright/test";
import { authHeader } from "./http";
import { readTenantHeaders } from "./tenant";
import { CATALOG_URL, ORDER_URL } from "../env";

export interface SeededPosData {
  tableId: string;
  tableNumber: string;
  menuItemId: string;
  menuItemName: string;
}

/**
 * Creates one dining table and one available, in-stock menu item via direct
 * API calls (not by clicking through FloorPlanDesigner/MenuTab, which have no
 * data-testid selectors and aren't the flow under test). Getting the menu
 * item to a state where it can actually be added to a cart takes three calls,
 * not one — see the comments below — because CatalogService.MenuItemsController
 * .PostAsync creates new items unavailable with zero stock, and OrderService's
 * CartService.AddItemAsync (services/order/src/OrderService/Services/CartService.cs)
 * rejects add-to-cart unless both menu- and inventory-availability are true
 * and stock covers the requested quantity.
 */
export async function seedTableAndMenuItem(request: APIRequestContext): Promise<SeededPosData> {
  // Random component, not just Date.now(): two spec files seeding concurrently
  // in different workers can call this within the same millisecond, and a
  // timestamp-only suffix collided in practice (two "E2E-<suffix>" tables
  // with the identical number, which then made table-button locators
  // ambiguous, and each other's seeded menu items visible in each other's
  // "3 items" grid).
  const suffix = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
  const TENANT_HEADERS = readTenantHeaders();

  // ---- Table ----
  const tableNumber = `E2E-${suffix}`;
  const tableResponse = await request.post(`${ORDER_URL}/api/tables`, {
    headers: { ...TENANT_HEADERS, ...(await authHeader(request, ["order.write"])) },
    data: {
      number: tableNumber,
      section: "Main",
      seats: 2,
      shape: "rectangle",
      // Randomized so tables seeded by concurrently-running spec files don't
      // land on the exact same floor-plan coordinates — overlapping table
      // nodes intercept each other's clicks (a real flake this suite hit
      // once two UI specs started seeding tables in parallel).
      position: { x: Math.floor(Math.random() * 600), y: Math.floor(Math.random() * 400) },
      size: { width: 80, height: 80 },
    },
  });
  if (!tableResponse.ok()) {
    throw new Error(`Failed to seed dining table: ${tableResponse.status()} ${await tableResponse.text()}`);
  }
  const tableLocation = tableResponse.headers()["location"];
  const tableId = tableLocation?.split("/").pop();
  if (!tableId) throw new Error(`No table id in Location header: ${tableLocation}`);

  // ---- Menu item ----
  const menuHeaders = { ...TENANT_HEADERS, ...(await authHeader(request, ["menu.write"])) };
  const menuItemName = `E2E Item ${suffix}`;
  const menuItemResponse = await request.post(`${CATALOG_URL}/menu-items`, {
    headers: menuHeaders,
    data: {
      name: menuItemName,
      description: "Seeded by the Playwright E2E suite",
      price: 9.99,
      category: "Mains",
    },
  });
  if (!menuItemResponse.ok()) {
    throw new Error(`Failed to seed menu item: ${menuItemResponse.status()} ${await menuItemResponse.text()}`);
  }
  const menuItem = (await menuItemResponse.json()) as { id: string };

  // Mark it available — publishes MenuItemUpdated, which OrderService's
  // PosReadModelProjector consumes to set MenuAvailable=true for this item.
  const availabilityResponse = await request.post(`${CATALOG_URL}/menu-items/${menuItem.id}:availability`, {
    headers: { ...menuHeaders, "Content-Type": "application/json" },
    data: "true", // endpoint binds a raw bool from the body, not a wrapped object
  });
  if (!availabilityResponse.ok()) {
    throw new Error(
      `Failed to mark menu item available: ${availabilityResponse.status()} ${await availabilityResponse.text()}`
    );
  }

  // Stock it. A positive Quantity delta on a zero-stock item trips
  // InventoryManager's "restock" branch (Quantity 0 -> N), which sets
  // IsAvailable=true and publishes InventoryItemRestocked — the POS
  // projector then sets InventoryAvailable=true and Quantity=N for this item.
  const inventoryHeaders = {
    ...TENANT_HEADERS,
    ...(await authHeader(request, ["catalog.inventory.read", "catalog.inventory.write"])),
  };
  const inventoryListResponse = await request.get(`${CATALOG_URL}/inventory-items`, {
    headers: inventoryHeaders,
    params: { name: menuItemName },
  });
  if (!inventoryListResponse.ok()) {
    throw new Error(`Failed to look up seeded inventory item: ${inventoryListResponse.status()}`);
  }
  const inventoryPage = (await inventoryListResponse.json()) as { items: { id: string }[] };
  const inventoryItemId = inventoryPage.items[0]?.id;
  if (!inventoryItemId) throw new Error(`No inventory item found for menu item "${menuItemName}"`);

  const stockResponse = await request.put(`${CATALOG_URL}/inventory-items/${inventoryItemId}`, {
    headers: inventoryHeaders,
    data: { quantity: 25 },
  });
  if (!stockResponse.ok()) {
    throw new Error(`Failed to stock seeded inventory item: ${stockResponse.status()} ${await stockResponse.text()}`);
  }

  // OrderService's PosReadModelProjector consumes the events above off
  // RabbitMQ asynchronously; give it a moment before the UI test tries to add
  // this item to a cart. Local broker propagation is normally sub-second.
  await new Promise((resolve) => setTimeout(resolve, 2000));

  return { tableId, tableNumber, menuItemId: menuItem.id, menuItemName };
}

/**
 * Deletes what seedTableAndMenuItem created. Nothing in this suite cleans up
 * after itself otherwise — repeated runs would otherwise accumulate "E2E-*"
 * tables and "E2E Item *" menu items in whatever tenant these tests point at
 * forever. Deleting the menu item also deletes its linked inventory item
 * server-side (CatalogService.MenuItemsController.DeleteAsync), so there's
 * nothing extra to clean up there.
 */
export async function cleanupSeeded(request: APIRequestContext, data: SeededPosData): Promise<void> {
  const TENANT_HEADERS = readTenantHeaders();

  await request.delete(`${ORDER_URL}/api/tables/${data.tableId}`, {
    headers: { ...TENANT_HEADERS, ...(await authHeader(request, ["order.write"])) },
  });

  await request.delete(`${CATALOG_URL}/menu-items/${data.menuItemId}`, {
    headers: { ...TENANT_HEADERS, ...(await authHeader(request, ["menu.write"])) },
  });
}
