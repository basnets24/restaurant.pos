// src/domain/payments/api.ts
import { ENV } from "@/config/env";
import { http } from "@/lib/http";
import { getApiToken } from "@/auth/getApiToken";
import { tenantAccessor } from "@/auth/runtime";

export type PaymentSessionStatus = "pending" | "succeeded" | "failed" | string;

export type PaymentSessionResponse = {
  clientSecret?: string | null;
  status?: PaymentSessionStatus;
  error?: string;
};

export type PaymentConfirmResponse = {
  status: PaymentSessionStatus;
  receiptUrl?: string | null;
  error?: string;
};

function withTenantHeaders(): Record<string, string> {
  const t = tenantAccessor() ?? {};
  const headers: Record<string, string> = {};
  if (t.restaurantId) headers["x-restaurant-id"] = String(t.restaurantId);
  if (t.locationId) headers["x-location-id"] = String(t.locationId);
  return headers;
}

async function authHeaders() {
  const token = await getApiToken("Payment", ["payment.read"]);
  return { Accept: "application/json", Authorization: `Bearer ${token}`, ...withTenantHeaders() };
}

export async function getPaymentClientSecret(
  orderId: string,
  opts?: { signal?: AbortSignal }
): Promise<PaymentSessionResponse> {
  // Use absolute API URL so dev server (Vite) doesn't need a proxy
  const url = `${ENV.PAYMENT_URL}/orders/${orderId}/payment-session`;
  try {
    const { data } = await http.get<PaymentSessionResponse>(url, {
      signal: opts?.signal as any,
      headers: await authHeaders(),
    });
    return data ?? { clientSecret: null, status: "pending" };
  } catch (err: any) {
    const r = err?.response;
    const code: number | undefined = r?.status;
    if (code === 404 || code === 425 || code === 409 || code === 202) {
      return { clientSecret: null, status: "pending" };
    }
    const message: string = r?.data?.error || r?.statusText || err?.message || "Failed to fetch payment session";
    throw new Error(message);
  }
}

export async function pollForClientSecret(
  orderId: string,
  ms = 6000,
  step = 600,
  opts?: { signal?: AbortSignal }
): Promise<string | null> {
  const start = Date.now();
  while (Date.now() - start < ms) {
    if (opts?.signal?.aborted) throw new DOMException("Aborted", "AbortError");
    try {
      const { clientSecret, status } = await getPaymentClientSecret(orderId, { signal: opts?.signal });
      if (clientSecret) return clientSecret;
      const s = status?.toLowerCase();
      if (s === "succeeded" || s === "failed") return null;
    } catch (err: any) {
      if (err?.name === "AbortError") throw err;
    }
    await sleep(step, opts?.signal);
  }
  return null;
}

// Called right after stripe.confirmCardPayment() resolves - asks the backend to
// verify the result with Stripe server-side and publish PaymentSucceeded/Failed.
export async function confirmPayment(
  orderId: string,
  opts?: { signal?: AbortSignal }
): Promise<PaymentConfirmResponse> {
  const url = `${ENV.PAYMENT_URL}/orders/${orderId}/payment-confirm`;
  const { data } = await http.post<PaymentConfirmResponse>(url, null, {
    signal: opts?.signal as any,
    headers: await authHeaders(),
  });
  return data;
}

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    let done = false;
    const onResolve = () => {
      if (done) return;
      done = true;
      if (signal) signal.removeEventListener("abort", onAbort);
      resolve();
    };
    const onAbort = () => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      if (signal) signal.removeEventListener("abort", onAbort);
      reject(new DOMException("Aborted", "AbortError"));
    };
    const timer = setTimeout(onResolve, ms);
    if (signal) {
      if (signal.aborted) return onAbort();
      signal.addEventListener("abort", onAbort);
    }
  });
}
