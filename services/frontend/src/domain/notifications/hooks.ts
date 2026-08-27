import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { notificationKeys } from "./keys";
import { NotificationsApi } from "./api";
import type { NotificationViewDto } from "./types";
import { useFloorHubConnection } from "@/domain/realtime/FloorHubProvider";

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

/**
 * Subscribes to "NotificationReceived" on the shared floor-hub connection
 * FloorHubProvider owns (mounted once in main.tsx, for the whole login
 * session) — table updates and notifications ride the same connection
 * object now, not two independent ones.
 */
export function useNotificationHub() {
  const qc = useQueryClient();
  const conn = useFloorHubConnection();

  useEffect(() => {
    if (!conn) return;
    const onReceived = () => qc.invalidateQueries({ queryKey: notificationKeys.list() });
    conn.on("NotificationReceived", onReceived);
    return () => { conn.off("NotificationReceived", onReceived); };
  }, [conn, qc]);
}
