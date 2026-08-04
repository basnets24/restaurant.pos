import axios from "axios";
import { DinerOrdersAPI } from "./api";
import type {
  DinerCheckoutRequest,
  DinerCheckoutResult,
  DinerEstimate,
  DinerOrder,
  DinerTenant,
} from "./types";

/**
 * Diner calls carry a bearer token AND explicit tenant headers, so neither `publicHttp`
 * (no auth) nor `http` (staff token, tenant inferred from claims) fits.
 *
 * Both pieces are passed in per call rather than read from a module-level accessor: the token
 * comes from `DinerAuthProvider` and the tenant from whichever restaurant the cart belongs to,
 * and inferring either one is precisely how a request ends up scoped to the wrong restaurant.
 */
const dinerHttp = axios.create();

const headers = (token: string, tenant: DinerTenant) => ({
  Authorization: `Bearer ${token}`,
  "x-restaurant-id": tenant.restaurantId,
  "x-location-id": tenant.locationId,
});

/** Surfaces the server's own message. Domain rules ("only one Size may be chosen", "insufficient
 *  stock") are written for the diner to read, and replacing them with a generic string would
 *  hide the one piece of information that tells them what to fix. */
export function dinerErrorMessage(error: unknown, fallback: string): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as { detail?: string; message?: string } | undefined;
    return data?.detail ?? data?.message ?? fallback;
  }
  return fallback;
}

export const DinerOrders = {
  async quote(token: string, tenant: DinerTenant, body: DinerCheckoutRequest): Promise<DinerEstimate> {
    const { data } = await dinerHttp.post<DinerEstimate>(DinerOrdersAPI.quote(), body, {
      headers: headers(token, tenant),
    });
    return data;
  },

  async checkout(
    token: string,
    tenant: DinerTenant,
    body: DinerCheckoutRequest
  ): Promise<DinerCheckoutResult> {
    const { data } = await dinerHttp.post<DinerCheckoutResult>(DinerOrdersAPI.checkout(), body, {
      headers: headers(token, tenant),
    });
    return data;
  },

  async list(token: string, tenant: DinerTenant): Promise<DinerOrder[]> {
    const { data } = await dinerHttp.get<DinerOrder[]>(DinerOrdersAPI.orders(), {
      headers: headers(token, tenant),
    });
    return data;
  },

  async get(token: string, tenant: DinerTenant, orderId: string): Promise<DinerOrder> {
    const { data } = await dinerHttp.get<DinerOrder>(DinerOrdersAPI.order(orderId), {
      headers: headers(token, tenant),
    });
    return data;
  },
};
