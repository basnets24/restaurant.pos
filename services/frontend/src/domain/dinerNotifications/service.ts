import axios from "axios";
import { DinerNotificationsAPI } from "./api";
import type { DinerNotification } from "./types";

/**
 * Its own axios instance for the same reason `dinerOrders` has one: the shared `http` attaches
 * the staff token and infers a tenant from its claims, and neither is right here.
 *
 * Every call in this module sends the bearer token and no tenant headers at all — these
 * endpoints span restaurants, and sending whichever one the diner last browsed would suggest a
 * scope the server does not apply.
 */
const dinerHttp = axios.create();

const auth = (token: string) => ({ headers: { Authorization: `Bearer ${token}` } });

export const DinerNotifications = {
  async list(token: string, take = 50): Promise<DinerNotification[]> {
    const { data } = await dinerHttp.get<DinerNotification[]>(
      DinerNotificationsAPI.list(take),
      auth(token)
    );
    return data;
  },

  async markRead(token: string, id: string): Promise<void> {
    await dinerHttp.post(DinerNotificationsAPI.read(id), null, auth(token));
  },

  async markAllRead(token: string): Promise<void> {
    await dinerHttp.post(DinerNotificationsAPI.readAll(), null, auth(token));
  },
};
