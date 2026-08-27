import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { tableKeys } from "./keys";
import { useFloorHubConnection } from "@/domain/realtime/FloorHubProvider";

// Every event DiningTableService actually broadcasts to the tenant group.
const TABLE_EVENTS = [
  "TableStatusChanged",
  "OrderLinked",
  "OrderUnlinked",
  "TableLayoutChanged",
  "TableRemoved",
  "TablesJoined",
  "TablesSplit",
] as const;

// Subscribes to table events on the shared connection FloorHubProvider owns
// (mounted once in main.tsx, for the whole login session) — this hook no
// longer opens/closes a connection of its own, so it's safe to call from any
// page without causing reconnect churn on navigation.
export function useFloorHub() {
  const qc = useQueryClient();
  const conn = useFloorHubConnection();

  useEffect(() => {
    if (!conn) return;
    const onUpdated = () => qc.invalidateQueries({ queryKey: tableKeys.all });
    TABLE_EVENTS.forEach((event) => conn.on(event, onUpdated));
    return () => {
      TABLE_EVENTS.forEach((event) => conn.off(event, onUpdated));
    };
  }, [conn, qc]);
}
