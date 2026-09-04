import axios from "axios";
import { DinerOrdersAPI } from "./api";
import type {
  DinerCheckoutRequest,
  DinerCheckoutResult,
  DinerEstimate,
  DinerOrder,
  DinerPaymentConfirm,
  DinerPaymentSession,
  DinerOrderSummary,
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

  /**
   * Every order this diner has placed, at any restaurant.
   *
   * The only diner call that sends no tenant headers, deliberately: there is no one restaurant
   * this question is about, and sending whichever one the diner last browsed would imply a
   * scope the server does not apply. The server ignores them here in any case.
   */
  async history(token: string): Promise<DinerOrderSummary[]> {
    const { data } = await dinerHttp.get<DinerOrderSummary[]>(DinerOrdersAPI.history(), {
      headers: { Authorization: `Bearer ${token}` },
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

  // SSE alternative to polling GET .../payment-session - see payments/api.ts's waitForClientSecret for why
  // this is a manual fetch + stream read rather than the native EventSource API (no way to carry
  // an Authorization header with it). Holds the connection open until PaymentRequestedConsumer's
  // ClientSecret is ready, or up to timeoutMs, instead of a fixed-interval poll.
  async waitForPaymentSession(
    token: string,
    tenant: DinerTenant,
    orderId: string,
    timeoutMs = 15_000
  ): Promise<DinerPaymentSession> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(DinerOrdersAPI.paymentSessionStream(orderId), {
        headers: headers(token, tenant),
        signal: controller.signal,
      });
      if (!res.ok || !res.body) return { status: "pending" };

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      while (true) {
        const { value, done } = await reader.read();
        if (done) return { status: "pending" };
        buffer += decoder.decode(value, { stream: true });

        let sepIndex: number;
        while ((sepIndex = buffer.indexOf("\n\n")) !== -1) {
          const rawEvent = buffer.slice(0, sepIndex);
          buffer = buffer.slice(sepIndex + 2);
          const dataLine = rawEvent.split("\n").find((l) => l.startsWith("data:"));
          if (!dataLine) continue;
          try {
            const parsed = JSON.parse(dataLine.slice(5).trim()) as DinerPaymentSession;
            if (parsed.clientSecret && parsed.attemptId) {
              void reader.cancel().catch(() => { });
              return parsed;
            }
          } catch {
            // Malformed/partial chunk - keep reading.
          }
        }
      }
    } catch {
      return { status: "pending" };
    } finally {
      clearTimeout(timeout);
    }
  },

  async confirmPayment(
    token: string,
    tenant: DinerTenant,
    orderId: string,
    attemptId: string
  ): Promise<DinerPaymentConfirm> {
    const { data } = await dinerHttp.post<DinerPaymentConfirm>(
      DinerOrdersAPI.paymentConfirm(orderId, attemptId),
      null,
      { headers: headers(token, tenant) }
    );
    return data;
  },
};
