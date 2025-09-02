import { api } from "../../lib/axios";

export async function createCheckoutSession(payload?: {
    orderId?: string; amount?: number; currency?: string; description?: string;
}): Promise<{ sessionId: string }> {
    const { data } = await api.post("/api/payments/stripe/checkout/session", payload ?? {});
    if (!data?.sessionId) throw new Error("No sessionId returned from server.");
    return { sessionId: data.sessionId };
}

export async function confirmCheckout(sessionId: string): Promise<{
    orderId?: string;
    amount?: number;
    currency?: string;
    receiptUrl?: string;
    status?: string;
}> {
    const { data } = await api.post(
        "/api/payments/stripe/checkout/confirm",
        null,
        { params: { sessionId } }
    );
    return data;
}
