import React, { createContext, useContext } from "react";
import { useTenant } from "./TenantContext";
import { useTenantDomain } from "@/domain/tenant/Provider";

type TenantInfo = {
  restaurantName?: string;
  locations?: { id: string; name: string; isActive: boolean; timeZoneId: string | null }[];
  isLoading: boolean;
};

const Ctx = createContext<TenantInfo | null>(null);

export const TenantInfoProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const { rid } = useTenant();
  const tenant = useTenantDomain();
  const { data, isLoading } = tenant.useTenant(rid ?? "", { enabled: !!rid });

  const value: TenantInfo = {
    restaurantName: data?.restaurant.name ?? undefined,
    locations: data?.locations?.map(l => ({ id: l.id, name: l.name, isActive: l.isActive, timeZoneId: l.timeZoneId ?? null })) ?? undefined,
    isLoading,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
};

export function useTenantInfo() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useTenantInfo must be used within TenantInfoProvider");
  return ctx;
}

