import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as signalR from "@microsoft/signalr";
import { ENV } from "@/config/env";
import { notificationKeys } from "./keys";
import { NotificationsApi } from "./api";
import type { NotificationViewDto } from "./types";

// ---------- Queries ----------

export function useNotifications() {
  return useQuery({
    queryKey: notificationKeys.list(),
    queryFn: () => NotificationsApi.getAll(),
    staleTime: 10_000
  });
}

// ---------- Mutations ----------

export function useMarkNotificationRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => NotificationsApi.markAsRead(id),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: notificationKeys.list() });
      const prev = qc.getQueryData<NotificationViewDto[]>(notificationKeys.list());
      if (prev) {
        qc.setQueryData(
          notificationKeys.list(),
          prev.map((n) => (n.id === id ? { ...n, readAt: new Date().toISOString() } : n))
        );
      }
      return { prev };
    },
    onError: (_err, _id, ctx) => {
      if (ctx?.prev) qc.setQueryData(notificationKeys.list(), ctx.prev);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: notificationKeys.list() });
    }
  });
}

// ---------- Realtime ----------

type NotificationHubOpts = {
  baseUrl?: string;
  restaurantId?: string;
  locationId?: string;
  accessTokenFactory?: () => string | Promise<string>;
};

/**
 * Subscribes to the order service's floor hub for "NotificationReceived"
 * pushes. Table notifications ride the same hub connection tables.ts's
 * useFloorHub uses, just from wherever the notification list is rendered
 * (e.g. the home dashboard) rather than the floor-plan page.
 */
export function useNotificationHub({ baseUrl = ENV.ORDER_URL, restaurantId, locationId, accessTokenFactory }: NotificationHubOpts) {
  const qc = useQueryClient();

  useEffect(() => {
    if (!restaurantId || !locationId) return;
    const url = `${baseUrl}/hubs/floor?restaurantId=${restaurantId}&locationId=${locationId}`;
    const conn = new signalR.HubConnectionBuilder()
      .withUrl(url, { accessTokenFactory, withCredentials: true })
      .withAutomaticReconnect()
      .build();

    const onReceived = () => qc.invalidateQueries({ queryKey: notificationKeys.list() });
    conn.on("NotificationReceived", onReceived);
    conn.start().catch(console.error);

    return () => {
      try { conn.off("NotificationReceived", onReceived); } finally { conn.stop().catch(() => { }); }
    };
  }, [baseUrl, restaurantId, locationId, accessTokenFactory, qc]);
}
