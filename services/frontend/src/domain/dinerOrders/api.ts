import { ENV } from "@/config/env";

const base = `${ENV.ORDER_URL}/diner`;

export const DinerOrdersAPI = {
  quote: () => `${base}/quote`,
  checkout: () => `${base}/checkout`,
  orders: () => `${base}/orders`,
  order: (orderId: string) => `${base}/orders/${orderId}`,
} as const;
