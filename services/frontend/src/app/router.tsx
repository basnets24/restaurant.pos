// src/app/router.tsx
import { createBrowserRouter, Navigate, RouterProvider } from "react-router-dom";
import { lazy, Suspense } from "react";

// ---- Auth plumbing (your files) ----
import { AuthorizationPaths } from "../api-authorization/ApiAuthorizationConstants";
import { ProtectedRoute } from "../api-authorization/ProtectedRoute";

import LoginPage from "../api-authorization/LoginPage";
import LogoutPage from "../api-authorization/LogoutPage";
import LogoutCallbackPage from "../api-authorization/LogoutCallbackPage";
import LoggedOutPage from "../api-authorization/LoggedOutPage";
import LoginCallbackPage from "../api-authorization/LoginCallback";
import RegisterPage from "../api-authorization/RegisterPage";

import SuccessView from "@/components/SuccessView";
import CancelView from "@/components/CancelView";

// ---- Shared fallback ----
const Fallback = () => <div className="p-6 text-muted-foreground">Loading…</div>;

// ---- Public top-level ----
const LandingView = lazy(() => import("@/features/landing/LandingView"));
const HomePage    = lazy(() => import("@/features/home/HomePage"));

// ---- Management ----
const ManagementLayout  = lazy(() => import("@/features/management/ManagementLayout"));
const AnalyticsTab      = lazy(() => import("@/features/management/tabs/AnalyticsTab"));
const StaffTab          = lazy(() => import("@/features/management/tabs/StaffTab"));
const InventoryTab      = lazy(() => import("@/features/management/tabs/InventoryTab"));
const MenuTab           = lazy(() => import("@/features/management/tabs/MenuTab"));
const ReservationsTab   = lazy(() => import("@/features/management/tabs/ReservationsTab"));

// ---- Admin (role-gated) ----
const AdminLayout        = lazy(() => import("@/features/admin/AdminLayout"));
const OrganizationPage   = lazy(() => import("@/features/admin/pages/OrganizationPage"));
const FloorPlanDesigner  = lazy(() => import("@/features/admin/pages/FloorPlanDesigner"));
const RolesPage          = lazy(() => import("@/features/admin/pages/RolesPage"));
const LocationsPage      = lazy(() => import("@/features/admin/pages/LocationsPage"));
const IntegrationsPage   = lazy(() => import("@/features/admin/pages/IntegrationsPage"));

// ---- Settings (profile only) ----
const SettingsLayout     = lazy(() => import("@/features/settings/SettingsLayout"));
const AccountPage        = lazy(() => import("@/features/settings/pages/AccountPage"));
const SecurityPage       = lazy(() => import("@/features/settings/pages/SecurityPage"));
const NotificationsPage  = lazy(() => import("@/features/settings/pages/NotificationsPage"));

// ---- POS ----
const PosLayout     = lazy(() => import("@/features/pos/PosLayout"));
const TablesPage    = lazy(() => import("@/features/pos/routes/TablesPage"));
const TableRoute    = lazy(() => import("@/features/pos/routes/TableRoute"));
const MenuPage      = lazy(() => import("@/features/pos/routes/MenuPage"));
const OrderPage     = lazy(() => import("@/features/pos/routes/OrderPage"));
const ActiveOrdersPage = lazy(() => import("@/features/pos/routes/ActiveOrdersPage"));
const OrdersPage    = lazy(() => import("@/features/pos/routes/OrdersPage"));

// ---- 404 ----
const NotFoundPage  = lazy(() => import("@/features/misc/NotFoundPage"));
const JoinPage      = lazy(() => import("@/features/join/JoinPage"));

export const router = createBrowserRouter([
  // ========= PUBLIC =========
  { path: "/", element: <Suspense fallback={<Fallback />}><LandingView /></Suspense> },

  // Auth endpoints (public)
  { path: AuthorizationPaths.Login,           element: <LoginPage /> },
  { path: AuthorizationPaths.Register,        element: <RegisterPage /> },
  { path: AuthorizationPaths.LoginCallback,   element: <LoginCallbackPage /> },
  { path: AuthorizationPaths.LogOut,          element: <LogoutPage /> },
  { path: AuthorizationPaths.LogOutCallback,  element: <LogoutCallbackPage /> },
  { path: AuthorizationPaths.LoggedOut,       element: <LoggedOutPage /> },

  // ========= PROTECTED (everything from /home onward) =========
  { path: "/join",
    element: (
      <ProtectedRoute>
        <Suspense fallback={<Fallback />}><JoinPage /></Suspense>
      </ProtectedRoute>
    ),
  },
  { path: "/home",
    element: (
      <ProtectedRoute>
        <Suspense fallback={<Fallback />}><HomePage /></Suspense>
      </ProtectedRoute>
    ),
  },

  // Management
  {
    path: "/management",
    element: (
      <ProtectedRoute>
        <Suspense fallback={<Fallback />}><ManagementLayout /></Suspense>
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <Navigate to="analytics" replace /> },
      { path: "analytics",    element: <Suspense fallback={<Fallback />}><AnalyticsTab /></Suspense> },
      { path: "staff",        element: <Suspense fallback={<Fallback />}><StaffTab /></Suspense> },
      { path: "inventory",    element: <Suspense fallback={<Fallback />}><InventoryTab /></Suspense> },
      { path: "menu",         element: <Suspense fallback={<Fallback />}><MenuTab /></Suspense> },
      { path: "reservations", element: <Suspense fallback={<Fallback />}><ReservationsTab /></Suspense> },
    ],
  },

  // Admin (Admin/Manager only)
  {
    path: "/admin",
    element: (
      <ProtectedRoute roles={["Admin", "Manager"]}>
        <Suspense fallback={<Fallback />}><AdminLayout /></Suspense>
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <Navigate to="organization" replace /> },
      { path: "organization", element: <Suspense fallback={<Fallback />}><OrganizationPage /></Suspense> },
      { path: "floor-plan",   element: <Suspense fallback={<Fallback />}><FloorPlanDesigner /></Suspense> },
      { path: "roles",        element: <Suspense fallback={<Fallback />}><RolesPage /></Suspense> },
      { path: "locations",    element: <Suspense fallback={<Fallback />}><LocationsPage /></Suspense> },
      { path: "integrations", element: <Suspense fallback={<Fallback />}><IntegrationsPage /></Suspense> },
    ],
  },

  // Settings (profile)
  {
    path: "/settings",
    element: (
      <ProtectedRoute>
        <Suspense fallback={<Fallback />}><SettingsLayout /></Suspense>
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <Navigate to="account" replace /> },
      { path: "account",       element: <Suspense fallback={<Fallback />}><AccountPage /></Suspense> },
      { path: "security",      element: <Suspense fallback={<Fallback />}><SecurityPage /></Suspense> },
      { path: "notifications", element: <Suspense fallback={<Fallback />}><NotificationsPage /></Suspense> },
    ],
  },

  // POS
  {
    path: "/pos",
    element: (
      <ProtectedRoute>
        <Suspense fallback={<Fallback />}><PosLayout /></Suspense>
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <Navigate to="tables" replace /> },
      { path: "tables", element: <Suspense fallback={<Fallback />}><TablesPage /></Suspense> },
      { path: "current", element: <Suspense fallback={<Fallback />}><ActiveOrdersPage /></Suspense> },
      { path: "orders", element: <Suspense fallback={<Fallback />}><OrdersPage /></Suspense> },
      {
        path: "table/:tableId",
        element: <Suspense fallback={<Fallback />}><TableRoute /></Suspense>,
        children: [
          { index: true, element: <Navigate to="menu" replace /> },
          { path: "menu",     element: <Suspense fallback={<Fallback />}><MenuPage /></Suspense> },
          { path: "order",    element: <Suspense fallback={<Fallback />}><OrderPage /></Suspense> },
          { path: "checkout/success", element: <Suspense fallback={<Fallback />}><SuccessView /></Suspense> },
          { path: "checkout/cancel",  element: <Suspense fallback={<Fallback />}><CancelView /></Suspense> },
        ],
      },
    ],
  },

  // 404
  { path: "*", element: <Suspense fallback={<Fallback />}><NotFoundPage /></Suspense> },
]);

export function AppRouter() {
  return (
    <Suspense fallback={<Fallback />}>
      <RouterProvider router={router} />
    </Suspense>
  );
}
