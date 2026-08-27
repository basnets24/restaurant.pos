import React, { createContext, useContext } from "react";
import { useTenant } from "@/auth/tenant";
import { useTenantDomain } from "@/domain/tenant/Provider";
import { useAuth } from "@/api-authorization/AuthProvider";

type TenantInfo = {
  restaurantName?: string;
  locations?: { id: string; name: string; isActive: boolean; timeZoneId: string | null }[];
  isLoading: boolean;
};

const Ctx = createContext<TenantInfo | null>(null);

export const TenantInfoProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const { rid } = useTenant();
  const { isAuthenticated } = useAuth();
  const tenant = useTenantDomain();
  // TenantInfoProvider wraps every route (mounted once at the app root in
  // main.tsx), including the public landing page — gating on `rid` alone
  // isn't enough, since `rid` is only cleared from localStorage on an
  // explicit sign-out, not on token expiry or a fresh unauthenticated
  // visit. Firing this without `isAuthenticated` triggers getApiToken's
  // silent-auth-fails-so-redirect-to-login fallback on `/` itself.
  const { data, isLoading } = tenant.useTenant(rid ?? "", { enabled: !!rid && isAuthenticated });

  const value: TenantInfo = {
    restaurantName: data?.restaurant.name ?? undefined,
    locations: data?.locations?.map(l => ({ id: l.id, name: l.name, isActive: l.isActive, timeZoneId: l.timeZoneId ?? null })) ?? undefined,
    isLoading,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
};

// eslint-disable-next-line react-refresh/only-export-components
export function useTenantInfo() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useTenantInfo must be used within TenantInfoProvider");
  return ctx;
}

