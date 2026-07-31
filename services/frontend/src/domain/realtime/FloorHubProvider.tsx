import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import * as signalR from "@microsoft/signalr";
import { ENV } from "@/config/env";
import { useAuth } from "@/api-authorization/AuthProvider";
import { useTenant } from "@/auth/tenant";

const FloorHubContext = createContext<signalR.HubConnection | null>(null);

/**
 * One SignalR connection to the order service's floor hub, shared for the
 * whole login session instead of one per page. Previously each consumer
 * (TablesPage for table updates, HomeView for notifications) opened its own
 * connection in a useEffect and tore it down on unmount, so navigating
 * between pages spammed connect/disconnect/reconnect churn in the console.
 * Mounted once in main.tsx inside AuthProvider, so it survives route
 * navigation and only reconnects when auth or the active tenant changes.
 */
export function FloorHubProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated, getAccessToken } = useAuth();
  const { rid, lid } = useTenant();
  const [conn, setConn] = useState<signalR.HubConnection | null>(null);
  const getAccessTokenRef = useRef(getAccessToken);
  getAccessTokenRef.current = getAccessToken;

  useEffect(() => {
    if (!isAuthenticated || !rid || !lid) {
      setConn(null);
      return;
    }
    const url = `${ENV.ORDER_URL}/hubs/floor?restaurantId=${rid}&locationId=${lid}`;
    const hub = new signalR.HubConnectionBuilder()
      .withUrl(url, {
        accessTokenFactory: async () => (await getAccessTokenRef.current()) ?? "",
        withCredentials: true,
      })
      .withAutomaticReconnect()
      // Default (Information) logs the full connection URL, which includes
      // the access_token query param SignalR appends for WebSocket auth -
      // that's a live JWT leaking into the browser console on every connect.
      .configureLogging(signalR.LogLevel.Warning)
      .build();

    hub.start().catch(console.error);
    setConn(hub);

    return () => {
      setConn(null);
      hub.stop().catch(() => { });
    };
  }, [isAuthenticated, rid, lid]);

  return <FloorHubContext.Provider value={conn}>{children}</FloorHubContext.Provider>;
}

export function useFloorHubConnection() {
  return useContext(FloorHubContext);
}
