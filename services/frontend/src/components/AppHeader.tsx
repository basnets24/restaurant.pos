import { NavLink, useNavigate } from "react-router-dom";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LogOut, type LucideIcon } from "lucide-react";
import { useAuth } from "@/api-authorization/AuthProvider";
import { useUserDisplayName } from "@/hooks/useUserDisplayName";
import { AuthorizationPaths } from "@/api-authorization/ApiAuthorizationConstants";

// ─────────────────────────────────────────────────────────────────────────────
// Shared application header — the single source of the Spoontab "home" nav bar
// (translucent olive backdrop, rounded brand mark, circular-initial avatar
// dropdown). Used by every authenticated layout. Pass an optional `nav` for a
// center nav row and `menuItems` for surface-specific dropdown actions; Logout
// is always appended.
// ─────────────────────────────────────────────────────────────────────────────

export interface AppHeaderNavItem {
  to: string;
  label: string;
  icon?: ReactNode;
  /** Optional count badge (e.g. active orders) */
  badge?: number;
  disabled?: boolean;
  /** "soft" = ghost with active tint, "solid" = filled when active */
  activeVariant?: "soft" | "solid";
}

export interface AppHeaderMenuItem {
  label: string;
  icon?: LucideIcon;
  onClick: () => void;
}

export interface AppHeaderProps {
  /** Primary line — restaurant/section name */
  title: string;
  /** Secondary line — location, "Point of Sale System", etc. */
  subtitle?: string;
  /** Short text in the brand mark box (e.g. "RMS", "POS", "A") */
  logo?: string;
  /** Where clicking the brand mark navigates (default: /home) */
  brandTo?: string;
  /** Optional center nav (desktop) + chip row (mobile) */
  nav?: AppHeaderNavItem[];
  /** Surface-specific dropdown actions, rendered above Logout */
  menuItems?: AppHeaderMenuItem[];
  /** Optional right-side extra before the avatar */
  rightExtra?: ReactNode;
}

export function AppHeader({
  title,
  subtitle,
  logo = "RMS",
  brandTo = "/home",
  nav,
  menuItems,
  rightExtra,
}: AppHeaderProps) {
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const { displayName } = useUserDisplayName();
  const userInitial = (displayName?.trim()?.[0] ?? "U").toUpperCase();
  const onLogout = () =>
    void signOut(`${window.location.origin}${AuthorizationPaths.LoggedOut}`);

  return (
    <header
      className="sticky top-0 z-40 border-b border-border"
      style={{
        background: "color-mix(in srgb, var(--olive-300) 90%, transparent)",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
      }}
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-3">
        <div className="flex items-center justify-between gap-3">
          {/* Left: brand */}
          <button
            type="button"
            onClick={() => brandTo && navigate(brandTo)}
            className="flex items-center gap-3 min-w-0 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-lg"
          >
            <div className="w-10 h-10 shrink-0 bg-primary rounded-[10px] flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-sm">{logo}</span>
            </div>
            <div className="min-w-0">
              <h1 className="text-base sm:text-lg font-semibold text-foreground leading-tight truncate">
                {title}
              </h1>
              {subtitle && <p className="text-xs text-muted-foreground truncate">{subtitle}</p>}
            </div>
          </button>

          {/* Center: nav (optional) */}
          {nav && nav.length > 0 && (
            <nav className="hidden md:flex items-center gap-1">
              {nav.map((item) => (
                <NavButton key={item.to} {...item} />
              ))}
            </nav>
          )}

          {/* Right: extras + avatar */}
          <div className="flex items-center gap-2 sm:gap-3">
            {rightExtra}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="w-10 h-10 rounded-full bg-primary text-primary-foreground font-bold text-sm flex items-center justify-center cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  aria-label="User menu"
                >
                  {userInitial}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-48">
                <DropdownMenuLabel className="truncate">{displayName}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {menuItems?.map((mi) => (
                  <DropdownMenuItem key={mi.label} onClick={mi.onClick}>
                    {mi.icon && <mi.icon className="h-4 w-4 mr-2" />}
                    {mi.label}
                  </DropdownMenuItem>
                ))}
                {menuItems && menuItems.length > 0 && <DropdownMenuSeparator />}
                <DropdownMenuItem onClick={onLogout}>
                  <LogOut className="h-4 w-4 mr-2" /> Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Mobile nav chip row */}
        {nav && nav.length > 0 && (
          <div className="md:hidden pt-2 flex items-center gap-2 overflow-x-auto no-scrollbar">
            {nav.map((item) => (
              <NavChip key={item.to} {...item} />
            ))}
          </div>
        )}
      </div>
    </header>
  );
}

/** Desktop nav button with active styling via NavLink */
function NavButton({ to, icon, label, badge, disabled, activeVariant = "soft" }: AppHeaderNavItem) {
  return (
    <NavLink to={to} className="group">
      {({ isActive }) => (
        <Button
          type="button"
          variant={isActive && activeVariant === "solid" ? "default" : "ghost"}
          size="sm"
          className={`gap-2 ${isActive && activeVariant === "soft" ? "bg-primary/15 text-foreground" : ""}`}
          disabled={disabled}
        >
          {icon}
          <span className="hidden lg:inline">{label}</span>
          {!!badge && (
            <Badge variant="secondary" className="ml-1">
              {badge}
            </Badge>
          )}
        </Button>
      )}
    </NavLink>
  );
}

/** Mobile chip */
function NavChip({ to, label, disabled }: AppHeaderNavItem) {
  return (
    <NavLink to={to} className="shrink-0">
      {({ isActive }) => (
        <Button
          type="button"
          variant={isActive ? "default" : "outline"}
          size="sm"
          disabled={disabled}
          className="rounded-full"
        >
          {label}
        </Button>
      )}
    </NavLink>
  );
}
