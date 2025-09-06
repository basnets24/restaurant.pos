// src/features/admin/AdminLayout.tsx
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Building2,
  Grid3x3,
  Shield,
  MapPin,
  Plug,
  ArrowLeft,
  Home,
} from "lucide-react";
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
      {/* Header */}
      <header className="bg-card shadow-sm border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                onClick={() => navigate("/home")}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Dashboard
              </Button>

              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-primary rounded-xl flex items-center justify-center">
                  <span className="text-primary-foreground font-bold text-sm">A</span>
                </div>
                <div>
                  <h1 className="text-lg font-bold text-foreground">Admin Panel</h1>
                  <p className="text-sm text-muted-foreground">Manage organization & system</p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                onClick={() => navigate("/")}
                className="flex items-center gap-2 text-muted-foreground hover:text-foreground"
              >
                <Home className="h-4 w-4" />
                Home
              </Button>
            </div>
          </div>
        </div>
      </header>

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
