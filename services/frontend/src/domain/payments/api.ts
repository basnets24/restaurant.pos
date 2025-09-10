// src/api/payments.ts
export async function getPaymentSessionUrl(orderId: string) {
    const r = await fetch(`/api/orders/${orderId}/payment-session`);
    if (!r.ok) throw new Error("payment session not ready");
    return r.json() as Promise<{ sessionUrl?: string | null; status?: string; error?: string }>;
  }
  
  export async function pollForSessionUrl(orderId: string, ms = 6000, step = 600) {
    const start = Date.now();
    while (Date.now() - start < ms) {
      const { sessionUrl, status } = await getPaymentSessionUrl(orderId);
      if (sessionUrl) return sessionUrl;
      // If webhook already finished, stop polling (user might have paid in another tab)
      if (status === "Succeeded" || status === "Failed") return null;
      await new Promise(r => setTimeout(r, step));
    }
    return null;
  }
  