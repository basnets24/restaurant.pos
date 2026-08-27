import { ENV } from "@/config/env";

const base = `${ENV.ORDER_URL}/diner/notifications`;

export const DinerNotificationsAPI = {
  list: (take: number) => `${base}?take=${take}`,
  read: (id: string) => `${base}/${id}/read`,
  readAll: () => `${base}/read-all`,
} as const;
