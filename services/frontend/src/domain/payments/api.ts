// src/domain/payments/api.ts
import { ENV } from "@/config/env";
import { http } from "@/lib/http";
import { getApiToken } from "@/auth/getApiToken";
import { withTenantHeaders } from "@/auth/tenantHeaders";
import { errorMessage, errorName, isAxiosError } from "@/lib/apiErrors";

export type PaymentSessionStatus = "pending" | "succeeded" | "failed" | string;

export type PaymentSessionResponse = {
  clientSecret?: string | null;
  attemptId?: string;
  status?: PaymentSessionStatus;
  error?: string;
};

export type PaymentConfirmResponse = {
  status: PaymentSessionStatus;
  receiptUrl?: string | null;
  error?: string;
};

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
      signal: opts?.signal,
      headers: await authHeaders(),
    });
    return data ?? { clientSecret: null, status: "pending" };
  } catch (err: unknown) {
    const r = isAxiosError<{ error?: string }>(err) ? err.response : undefined;
    const code = r?.status;
    if (code === 404 || code === 425 || code === 409 || code === 202) {
      return { clientSecret: null, status: "pending" };
    }
    const message: string = r?.data?.error || r?.statusText || errorMessage(err) || "Failed to fetch payment session";
    throw new Error(message, { cause: err });
  }
}

export type PaymentSession = { clientSecret: string; attemptId: string };

// Single SSE connection instead of polling getPaymentClientSecret every step ms - the backend
// (PaymentSessionController.StreamPaymentSession) holds the request open and emits exactly one
// event once PaymentRequestedConsumer's ClientSecret is ready, or closes with none if the
// payment resolved (succeeded/failed) through some other path. Native EventSource can't carry
// an Authorization header, hence the manual fetch + stream read below rather than that API.
export async function waitForClientSecret(
  orderId: string,
  timeoutMs = 15_000,
  opts?: { signal?: AbortSignal }
): Promise<PaymentSession | null> {
  const timeoutController = new AbortController();
  const timeout = setTimeout(() => timeoutController.abort(), timeoutMs);
  const onOuterAbort = () => timeoutController.abort();
  opts?.signal?.addEventListener("abort", onOuterAbort);

  try {
    const url = `${ENV.PAYMENT_URL}/orders/${orderId}/payment-session/stream`;
    const res = await fetch(url, { headers: await authHeaders(), signal: timeoutController.signal });
    if (!res.ok || !res.body) return null;

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    while (true) {
      const { value, done } = await reader.read();
      if (done) return null;
      buffer += decoder.decode(value, { stream: true });

      let sepIndex: number;
      while ((sepIndex = buffer.indexOf("\n\n")) !== -1) {
        const rawEvent = buffer.slice(0, sepIndex);
        buffer = buffer.slice(sepIndex + 2);
        const dataLine = rawEvent.split("\n").find((l) => l.startsWith("data:"));
        if (!dataLine) continue;
        try {
          const parsed = JSON.parse(dataLine.slice(5).trim()) as Partial<PaymentSession>;
          if (parsed.clientSecret && parsed.attemptId) {
            void reader.cancel().catch(() => { });
            return { clientSecret: parsed.clientSecret, attemptId: parsed.attemptId };
          }
        } catch {
          // Malformed/partial chunk - keep reading.
        }
      }
    }
  } catch (err: unknown) {
    if (errorName(err) === "AbortError" && opts?.signal?.aborted) throw err;
    return null;
  } finally {
    clearTimeout(timeout);
    opts?.signal?.removeEventListener("abort", onOuterAbort);
  }
}

// Called right after stripe.confirmCardPayment() resolves - asks the backend to
// verify the result with Stripe server-side and publish PaymentSucceeded/Failed.
// attemptId must be the one the ClientSecret being confirmed was issued with - the
// backend rejects (status: "stale") a confirm whose attemptId doesn't match the
// order's current payment attempt, since a retry may have since started a new one.
export async function confirmPayment(
  orderId: string,
  attemptId: string,
  opts?: { signal?: AbortSignal }
): Promise<PaymentConfirmResponse> {
  const url = `${ENV.PAYMENT_URL}/orders/${orderId}/payment-confirm?attemptId=${encodeURIComponent(attemptId)}`;
  const { data } = await http.post<PaymentConfirmResponse>(url, null, {
    signal: opts?.signal,
    headers: await authHeaders(),
  });
  return data;
}
