import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import * as signalR from "@microsoft/signalr";
import { tableKeys } from "./keys";
import { ENV } from "@/config/env";

type FloorHubOpts = {
  baseUrl?: string;
  restaurantId: string;
  locationId: string;
  accessTokenFactory?: () => string | Promise<string>;
};

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

    conn.on("TableUpdated", () => qc.invalidateQueries({ queryKey: tableKeys.all }));
    conn.start().catch(console.error);
    connRef.current = conn;

    return () => { conn.stop().catch(() => {}); };
  }, [baseUrl, restaurantId, locationId, accessTokenFactory, qc]);
}
