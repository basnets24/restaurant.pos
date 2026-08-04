import { Outlet } from "react-router-dom";
import { DinerCartProvider } from "./cart/DinerCartProvider";
import { DinerAuthProvider } from "./auth/DinerAuthProvider";

/**
 * Shell for the customer-facing ordering surface (`/order`). Public — no
 * ProtectedRoute wrapper — because browsing restaurants and menus must work
 * signed out; only placing an order requires an account.
 *
 * Each page renders its own header (see DinerHeader), because the header
 * genuinely differs between discovery and a restaurant menu.
 */
export default function DinerLayout() {
  return (
    <DinerAuthProvider>
      <DinerCartProvider>
        <div className="min-h-screen bg-background">
          <Outlet />
        </div>
      </DinerCartProvider>
    </DinerAuthProvider>
  );
}
