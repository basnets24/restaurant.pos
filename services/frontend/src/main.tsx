
import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { queryClient } from "./lib/react-query";

import { AuthProvider } from "./api-authorization/AuthProvider";
import { AppRouter } from "./app/router";
import { TenantProvider } from "./app/TenantContext";
import { RestaurantUserProfileProvider } from "@/domain/restaurantUserProfile/Provider";
import { EmployeeProvider } from "@/domain/employee/Provider";
import { TenantDomainProvider } from "@/domain/tenant/Provider";
import { TenantInfoProvider } from "@/app/TenantInfoProvider";
import "./index.css";
import { bootstrapAuth } from "@/auth/bootstrap";

async function start() {
  try {
    await bootstrapAuth();
  } catch {
    // ignore bootstrap failures; UI will still render and AuthProvider will hydrate
  }

  ReactDOM.createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <TenantProvider>
            <RestaurantUserProfileProvider>
              <TenantDomainProvider>
                <EmployeeProvider>
                  <TenantInfoProvider>
                    <AppRouter />
                  </TenantInfoProvider>
                </EmployeeProvider>
              </TenantDomainProvider>
            </RestaurantUserProfileProvider>
          </TenantProvider>
        </AuthProvider>
        <ReactQueryDevtools initialIsOpen={false} />
      </QueryClientProvider>
    </React.StrictMode>
  );
}

start();
