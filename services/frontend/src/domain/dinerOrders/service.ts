import axios from "axios";
import { DinerOrdersAPI } from "./api";
import type {
  DinerCheckoutRequest,
  DinerCheckoutResult,
  DinerEstimate,
  DinerOrder,
  DinerPaymentConfirm,
  DinerPaymentSession,
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

  /** Calls off an unpaid order. The server rejects an already-paid one, so this is only ever
   *  offered before payment. */
  async cancel(token: string, tenant: DinerTenant, orderId: string): Promise<void> {
    await dinerHttp.post(DinerOrdersAPI.cancelOrder(orderId), null, {
      headers: headers(token, tenant),
    });
  },

  async paymentSession(
    token: string,
    tenant: DinerTenant,
    orderId: string
  ): Promise<DinerPaymentSession> {
    try {
      const { data } = await dinerHttp.get<DinerPaymentSession>(
        DinerOrdersAPI.paymentSession(orderId),
        { headers: headers(token, tenant) }
      );
      return data ?? { status: "pending" };
    } catch (error) {
      // 404 means the PaymentIntent doesn't exist yet - it is created a broker round trip after
      // inventory is reserved. 202 is the same thing once the row exists but has no secret.
      //
      // 404 is also the answer for an order belonging to someone else, deliberately: the payment
      // service refuses to distinguish the two. Reporting "pending" for both is the price of
      // that, and it only shows up on a page the diner reached with someone else's order id.
      const code = axios.isAxiosError(error) ? error.response?.status : undefined;
      if (code === 404 || code === 202) return { status: "pending" };
      throw error;
    }
  },

  async confirmPayment(
    token: string,
    tenant: DinerTenant,
    orderId: string
  ): Promise<DinerPaymentConfirm> {
    const { data } = await dinerHttp.post<DinerPaymentConfirm>(
      DinerOrdersAPI.paymentConfirm(orderId),
      null,
      { headers: headers(token, tenant) }
    );
    return data;
  },
};
