import { http as api } from "@/lib/http";
import { ENV } from "@/config/env";
import { getApiToken } from "@/auth/getApiToken";
import { withTenantHeaders } from "@/auth/tenantHeaders";
import type { NotificationViewDto } from "./types";

// Point Notifications API to the Order service base URL from env
const base = `${ENV.ORDER_URL}/api/notifications`;

export const NotificationsApi = {
  async getAll(take = 50): Promise<NotificationViewDto[]> {
    const token = await getApiToken('Order', ['order.read']);
    const { data } = await api.get<NotificationViewDto[]>(base, {
      params: { take },
      headers: { ...withTenantHeaders(), Authorization: `Bearer ${token}` }
    });
    return data;
  },
  async markAsRead(id: string): Promise<void> {
    const token = await getApiToken('Order', ['order.read']);
    await api.post(`${base}/${id}/read`, null, {
      headers: { ...withTenantHeaders(), Authorization: `Bearer ${token}` }
    });
  }
};
