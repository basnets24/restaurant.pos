// src/domain/payments/api.ts
import { ENV } from "@/config/env";
import { http } from "@/lib/http";
import { getApiToken } from "@/auth/getApiToken";

export type PaymentSessionStatus = "pending" | "succeeded" | "failed" | string;

export type PaymentSessionResponse = {
  sessionUrl?: string | null;
  status?: PaymentSessionStatus;
  error?: string;
};

export async function getPaymentSessionUrl(
  orderId: string,
  opts?: { signal?: AbortSignal }
): Promise<PaymentSessionResponse> {
  // Use absolute API URL so dev server (Vite) doesn't need a proxy
  const url = `${ENV.PAYMENT_URL}/orders/${orderId}/payment-session`;
  try {
    const token = await getApiToken("Payment", ["payment.read"]);
    const { data } = await http.get<PaymentSessionResponse>(url, {
      signal: opts?.signal as any,
      headers: { Accept: "application/json", Authorization: `Bearer ${token}` },
      // Authorization header is attached by http interceptor; getToken exists for SSR safety
    });
    // Normalize successful payloads
    return data ?? { sessionUrl: null, status: "pending" };
  } catch (err: any) {
    const r = err?.response;
    const code: number | undefined = r?.status;
    if (code === 404 || code === 425 || code === 409 || code === 202) {
      return { sessionUrl: null, status: "pending" };
    }
    const message: string = r?.data?.error || r?.statusText || err?.message || "Failed to fetch payment session";
    throw new Error(message);
  }
}

export async function pollForSessionUrl(
  orderId: string,
  ms = 6000,
  step = 600,
  opts?: { signal?: AbortSignal }
): Promise<string | null> {
  const start = Date.now();
  while (Date.now() - start < ms) {
    if (opts?.signal?.aborted) throw new DOMException("Aborted", "AbortError");
    try {
      const { sessionUrl, status } = await getPaymentSessionUrl(orderId, { signal: opts?.signal });
      if (sessionUrl) return sessionUrl;
      const s = status?.toLowerCase();
      // If webhook already finished, stop polling (user might have paid in another tab)
      if (s === "succeeded" || s === "failed") return null;
    } catch (err: any) {
      // Allow cancellation to bubble, but treat other errors as transient
      if (err?.name === "AbortError") throw err;
      // Optional: could log error to monitoring here
    }
    await sleep(step, opts?.signal);
  }
  return null;
}

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => resolve(), ms);
    if (!signal) return;
    const onAbort = () => {
      clearTimeout(timer);
      reject(new DOMException("Aborted", "AbortError"));
    };
    if (signal.aborted) return onAbort();
    signal.addEventListener("abort", onAbort, { once: true });
  });
}
  
