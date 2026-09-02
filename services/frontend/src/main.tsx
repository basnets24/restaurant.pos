
import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { queryClient } from "./lib/react-query";

import { AuthProvider } from "./api-authorization/AuthProvider";
import { AppRouter } from "./app/router";
import { RestaurantUserProfileProvider } from "@/domain/restaurantUserProfile/Provider";
import { EmployeeProvider } from "@/domain/employee/Provider";
import { TenantDomainProvider } from "@/domain/tenant/Provider";
import { TenantInfoProvider } from "@/app/TenantInfoProvider";
import { FloorHubProvider } from "@/domain/realtime/FloorHubProvider";
import { Toaster } from "@/components/ui/sonner";
import "./index.css";

function start() {
  ReactDOM.createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <FloorHubProvider>
            <RestaurantUserProfileProvider>
              <TenantDomainProvider>
                <EmployeeProvider>
                  <TenantInfoProvider>
                    <AppRouter />
                  </TenantInfoProvider>
                </EmployeeProvider>
              </TenantDomainProvider>
            </RestaurantUserProfileProvider>
          </FloorHubProvider>
        </AuthProvider>
        {/* Several surfaces already call toast() but no Toaster was ever mounted, so none
            of them rendered anything. Mounting it here makes those existing calls visible. */}
        {/* top-center, not the sonner default of bottom-right: that corner is where the
            cart sheet's checkout button sits, and the toast covered it. No richColors - the
            Toaster component themes success/error itself off brand.css's tokens instead. */}
        <Toaster closeButton position="top-center" />
        <ReactQueryDevtools initialIsOpen={false} />
      </QueryClientProvider>
    </React.StrictMode>
  );
}

start();
