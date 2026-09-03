import { Suspense } from "react";
import { Outlet } from "react-router-dom";
import { AppHeader } from "@/components/AppHeader";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";

// Account is the only real settings page (Notifications/Security were UI
// shells with no backend and were removed) - no tab switcher needed for one
// destination. Kept as a layout rather than folded into AccountPage itself
// so the route structure (/settings -> /settings/account) and this header
// chrome stay in place for whatever gets added here next.
export default function SettingsLayout() {
  useDocumentTitle("Account · Spoontab");

  return (
    <div className="min-h-screen bg-background">
      <AppHeader title="Settings" subtitle="Account & preferences" />

      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Suspense fallback={<div className="p-6 text-muted-foreground">Loading…</div>}>
          <Outlet />
        </Suspense>
      </div>
    </div>
  );
}
