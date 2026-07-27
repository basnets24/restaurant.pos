// src/features/admin/AdminLayout.tsx
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Building2,
  Grid3x3,
  Shield,
  MapPin,
  Plug,
} from "lucide-react";
import { User, Bell } from "lucide-react";
import { AppHeader } from "@/components/AppHeader";
//

//
type NavItem = {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
};

const NAV: NavItem[] = [
  { to: "/admin/organization", label: "Organization",        icon: Building2 },
  { to: "/admin/floor-plan",   label: "Floor Plan",          icon: Grid3x3  },
  { to: "/admin/roles",        label: "Roles & Permissions", icon: Shield   },
  { to: "/admin/locations",    label: "Locations",           icon: MapPin   },
  { to: "/admin/integrations", label: "Integrations",        icon: Plug     },
];

function NavButton({ to, label, icon: Icon }: NavItem) {
  const { pathname } = useLocation();
  const active = pathname === to || pathname.startsWith(to + "/");
  return (
    <Button asChild variant={active ? "default" : "ghost"} className="w-full justify-start">
      <Link to={to} className="flex items-center">
        <Icon className="h-4 w-4 mr-3" />
        {label}
      </Link>
    </Button>
  );
}

export default function AdminLayout() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <AppHeader
        title="Admin Panel"
        subtitle="Manage organization & system"
        logo="A"
        menuItems={[
          { label: "Account", icon: User, onClick: () => navigate("/settings/account") },
          { label: "Security", icon: Shield, onClick: () => navigate("/settings/security") },
          { label: "Notifications", icon: Bell, onClick: () => navigate("/settings/notifications") },
        ]}
      />

      {/* Body */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex gap-8">
          {/* Sidebar */}
          <aside className="w-64 shrink-0">
            <nav className="space-y-2">
              {NAV.map((item) => (
                <NavButton key={item.to} {...item} />
              ))}
            </nav>
          </aside>

          {/* Main content (child routes render here) */}
          <main className="flex-1">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}
