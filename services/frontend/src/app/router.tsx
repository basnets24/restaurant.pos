// src/app/router.tsx
import { createBrowserRouter, Navigate, RouterProvider } from "react-router-dom";
import { lazy, Suspense } from "react";
import RouteErrorBoundary from "./RouteErrorBoundary";
import { FullScreenLoader } from "@/components/primitives/FullScreenLoader";

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

// Static imports, not lazy(): these are the two public marketing pages most
// visitors land on first (and the only ones with no auth/tenant dependency).
// Code-splitting them the same way as authenticated app routes forces a
// chunk-fetch round trip before any static content can paint - the "Loading…"
// fallback below was measurably taking several seconds on cold loads. Every
// other route stays lazy; those are genuinely gated behind navigation/auth,
// so deferring their JS is a real win rather than pure overhead.
import LandingView from "@/features/landing/LandingView";
import EngineeringView from "@/features/landing/EngineeringView";

// ---- Shared fallback ----
const Fallback = () => <FullScreenLoader />;

// ---- Public top-level ----
const HomePage    = lazy(() => import("@/features/home/HomePage"));

// ---- Management ----
const ManagementLayout  = lazy(() => import("@/features/management/ManagementLayout"));
const AnalyticsTab      = lazy(() => import("@/features/management/tabs/AnalyticsTab"));
const StaffTab          = lazy(() => import("@/features/management/tabs/StaffTab"));
const MenuTab           = lazy(() => import("@/features/management/tabs/MenuTab"));
const ReservationsTab   = lazy(() => import("@/features/management/tabs/ReservationsTab"));

// ---- Admin (nested under Management, role-gated) ----
const AdminTab           = lazy(() => import("@/features/management/tabs/AdminTab"));
const OrganizationPage   = lazy(() => import("@/features/admin/pages/OrganizationPage"));
const FloorPlanDesigner  = lazy(() => import("@/features/admin/pages/FloorPlanDesigner"));
const RolesPage          = lazy(() => import("@/features/admin/pages/RolesPage"));

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

// ---- Diner ordering (public, customer-facing) ----
const DinerLayout    = lazy(() => import("@/features/diner/DinerLayout"));
const DiscoveryPage  = lazy(() => import("@/features/diner/routes/DiscoveryPage"));
const RestaurantMenuPage = lazy(() => import("@/features/diner/routes/RestaurantMenuPage"));
const DinerCheckoutPage  = lazy(() => import("@/features/diner/routes/CheckoutPage"));
const DinerOrderStatusPage = lazy(() => import("@/features/diner/routes/OrderStatusPage"));
const DinerOrderHistoryPage = lazy(() => import("@/features/diner/routes/OrderHistoryPage"));

// ---- 404 ----
const NotFoundPage  = lazy(() => import("@/features/misc/NotFoundPage"));
const JoinPage      = lazy(() => import("@/features/join/JoinPage"));

// eslint-disable-next-line react-refresh/only-export-components
export const router = createBrowserRouter([
  // ========= PUBLIC =========
  // No Suspense here on purpose - these two import statically above, so
  // there's nothing to suspend on and no fallback flash to show.
  { path: "/", element: <LandingView />, errorElement: <RouteErrorBoundary /> },
  { path: "/engineering", element: <EngineeringView />, errorElement: <RouteErrorBoundary /> },

  // Auth endpoints (public)
  { path: AuthorizationPaths.Login,           element: <LoginPage />, errorElement: <RouteErrorBoundary /> },
  { path: AuthorizationPaths.Register,        element: <RegisterPage />, errorElement: <RouteErrorBoundary /> },
  { path: AuthorizationPaths.LoginCallback,   element: <LoginCallbackPage />, errorElement: <RouteErrorBoundary /> },
  { path: AuthorizationPaths.LogOut,          element: <LogoutPage />, errorElement: <RouteErrorBoundary /> },
  { path: AuthorizationPaths.LogOutCallback,  element: <LogoutCallbackPage />, errorElement: <RouteErrorBoundary /> },
  { path: AuthorizationPaths.LoggedOut,       element: <LoggedOutPage />, errorElement: <RouteErrorBoundary /> },

  // Diner ordering — public by design. Browsing restaurants and menus must work
  // signed out; only placing an order requires an account, gated further in.
  {
    path: "/order",
    element: <Suspense fallback={<Fallback />}><DinerLayout /></Suspense>,
    errorElement: <RouteErrorBoundary />,
    children: [
      { index: true, element: <Suspense fallback={<Fallback />}><DiscoveryPage /></Suspense> },
      // Static segments before the :restaurantId/:locationId pattern, or "checkout" would
      // match as a restaurant id.
      { path: "checkout", element: <Suspense fallback={<Fallback />}><DinerCheckoutPage /></Suspense> },
      { path: "orders", element: <Suspense fallback={<Fallback />}><DinerOrderHistoryPage /></Suspense> },
      { path: "orders/:orderId", element: <Suspense fallback={<Fallback />}><DinerOrderStatusPage /></Suspense> },
      { path: ":restaurantId/:locationId", element: <Suspense fallback={<Fallback />}><RestaurantMenuPage /></Suspense> },
    ],
  },

  // ========= PROTECTED (everything from /home onward) =========
  { path: "/join",
    element: (
      <ProtectedRoute>
        <Suspense fallback={<Fallback />}><JoinPage /></Suspense>
      </ProtectedRoute>
    ),
    errorElement: <RouteErrorBoundary />,
  },
  { path: "/home",
    element: (
      <ProtectedRoute>
        <Suspense fallback={<Fallback />}><HomePage /></Suspense>
      </ProtectedRoute>
    ),
    errorElement: <RouteErrorBoundary />,
  },

  // Management
  {
    path: "/management",
    element: (
      <ProtectedRoute>
        <Suspense fallback={<Fallback />}><ManagementLayout /></Suspense>
      </ProtectedRoute>
    ),
    errorElement: <RouteErrorBoundary />,
    children: [
      { index: true, element: <Navigate to="analytics" replace /> },
      { path: "analytics",    element: <Suspense fallback={<Fallback />}><AnalyticsTab /></Suspense> },
      { path: "staff",        element: <Suspense fallback={<Fallback />}><StaffTab /></Suspense> },
      { path: "menu",         element: <Suspense fallback={<Fallback />}><MenuTab /></Suspense> },
      { path: "reservations", element: <Suspense fallback={<Fallback />}><ReservationsTab /></Suspense> },
      {
        path: "admin",
        element: (
          <ProtectedRoute roles={["Admin", "Manager"]}>
            <Suspense fallback={<Fallback />}><AdminTab /></Suspense>
          </ProtectedRoute>
        ),
        children: [
          { index: true, element: <Navigate to="organization" replace /> },
          { path: "organization", element: <Suspense fallback={<Fallback />}><OrganizationPage /></Suspense> },
          { path: "floor-plan",   element: <Suspense fallback={<Fallback />}><FloorPlanDesigner /></Suspense> },
          { path: "roles",        element: <Suspense fallback={<Fallback />}><RolesPage /></Suspense> },
        ],
      },
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
    errorElement: <RouteErrorBoundary />,
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
    errorElement: <RouteErrorBoundary />,
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
  { path: "*", element: <Suspense fallback={<Fallback />}><NotFoundPage /></Suspense>, errorElement: <RouteErrorBoundary /> },
]);

export function AppRouter() {
  return (
    <Suspense fallback={<Fallback />}>
      <RouterProvider router={router} />
    </Suspense>
  );
}
