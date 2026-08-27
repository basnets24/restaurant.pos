import type { APIRequestContext } from "@playwright/test";
import { authHeader } from "./http";
import { readTenantHeaders } from "./tenant";
import { ORDER_URL } from "../env";

/**
 * Creates a cart for the given table, adds one of the given menu item, and
 * checks it out — i.e. everything pos-ordering.spec.ts already covers through
 * the real UI — via direct API calls instead, so payment.spec.ts can start
 * from an already-placed order without re-driving the cart/checkout flow
 * that isn't what it's testing.
 */
export async function placeOrder(
  request: APIRequestContext,
  tableId: string,
  menuItemId: string
): Promise<{ orderId: string }> {
  const headers = { ...readTenantHeaders(), ...(await authHeader(request, ["order.write"])) };

  const cartResponse = await request.post(`${ORDER_URL}/carts`, {
    headers,
    data: { tableId },
  });
  if (!cartResponse.ok()) {
    throw new Error(`Failed to create cart: ${cartResponse.status()} ${await cartResponse.text()}`);
  }
  const cart = (await cartResponse.json()) as { id: string };

  const itemResponse = await request.post(`${ORDER_URL}/carts/${cart.id}/items`, {
    headers,
    data: { menuItemId, quantity: 1 },
  });
  if (!itemResponse.ok()) {
    throw new Error(`Failed to add item to cart: ${itemResponse.status()} ${await itemResponse.text()}`);
  }

  const checkoutResponse = await request.post(`${ORDER_URL}/carts/${cart.id}/checkout`, { headers });
  if (!checkoutResponse.ok()) {
    throw new Error(`Failed to checkout cart: ${checkoutResponse.status()} ${await checkoutResponse.text()}`);
  }
  const { orderId } = (await checkoutResponse.json()) as { orderId: string };
  return { orderId };
}
