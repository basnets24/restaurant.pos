import { ENV } from "@/config/env";

const base = `${ENV.ORDER_URL}/diner`;

// Payment lives in its own service despite the /orders/... path - the SPA calls it directly,
// same as the POS does. There is no diner-specific route here: the endpoints are shared with
// staff, and the payment service tells the two apart by the token's `diner` scope.
const payments = `${ENV.PAYMENT_URL}/orders`;

export const DinerOrdersAPI = {
  quote: () => `${base}/quote`,
  checkout: () => `${base}/checkout`,
  orders: () => `${base}/orders`,
  history: () => `${base}/history`,
  order: (orderId: string) => `${base}/orders/${orderId}`,
  cancelOrder: (orderId: string) => `${base}/orders/${orderId}/cancel`,
  paymentSessionStream: (orderId: string) => `${payments}/${orderId}/payment-session/stream`,
  paymentConfirm: (orderId: string, attemptId: string) =>
    `${payments}/${orderId}/payment-confirm?attemptId=${encodeURIComponent(attemptId)}`,
} as const;
