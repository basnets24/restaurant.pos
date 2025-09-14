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
import { CircleUserRound, User, Bell, LogOut } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useAuth } from "@/api-authorization/AuthProvider";
import { useUserDisplayName } from "@/hooks/useUserDisplayName";
import { AuthorizationPaths } from "@/api-authorization/ApiAuthorizationConstants";
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
  const { signOut } = useAuth();
  const { displayName } = useUserDisplayName();
  const onLogout = () => void signOut(`${window.location.origin}${AuthorizationPaths.DefaultLoginRedirectPath}`);

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

            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                onClick={() => navigate("/home")}
                className="flex items-center gap-2 text-muted-foreground hover:text-foreground"
              >
                <Home className="h-4 w-4" />
                Home
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="gap-2">
                    <CircleUserRound className="h-4 w-4" />
                    <span className="hidden sm:inline">{displayName}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel className="text-xs">Signed in as</DropdownMenuLabel>
                  <div className="px-2 pb-1 text-sm truncate">{displayName}</div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate("/settings/account")}>
                    <User className="h-4 w-4 mr-2" /> Account
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate("/settings/security")}>
                    <Shield className="h-4 w-4 mr-2" /> Security
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate("/settings/notifications")}>
                    <Bell className="h-4 w-4 mr-2" /> Notifications
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={onLogout}>
                    <LogOut className="h-4 w-4 mr-2" /> Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
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
