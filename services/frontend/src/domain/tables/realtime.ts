import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import * as signalR from "@microsoft/signalr";
import { tableKeys } from "./keys";
import { ENV } from "@/config/env";

type FloorHubOpts = {
  baseUrl?: string;
  restaurantId?: string;
  locationId?: string;
  accessTokenFactory?: () => string | Promise<string>;
};

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

export function useFloorHub({ baseUrl = ENV.ORDER_URL, restaurantId, locationId, accessTokenFactory }: FloorHubOpts) {
  const qc = useQueryClient();
  const connRef = useRef<signalR.HubConnection | null>(null);

  useEffect(() => {
    if (!restaurantId || !locationId) return;
    const url = `${baseUrl}/hubs/floor?restaurantId=${restaurantId}&locationId=${locationId}`;
    const conn = new signalR.HubConnectionBuilder()
      .withUrl(url, { accessTokenFactory, withCredentials: true })
      .withAutomaticReconnect()
      .build();

    const onUpdated = () => qc.invalidateQueries({ queryKey: tableKeys.all });
    TABLE_EVENTS.forEach((event) => conn.on(event, onUpdated));
    conn.start().catch(console.error);
    connRef.current = conn;

    return () => {
      try {
        TABLE_EVENTS.forEach((event) => conn.off(event, onUpdated));
      } finally {
        conn.stop().catch(() => { });
      }
    };
  }, [baseUrl, restaurantId, locationId, accessTokenFactory, qc]);
}
