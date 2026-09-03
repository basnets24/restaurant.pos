import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { Building2, Shield } from "lucide-react";
import { FloorPlanGridIcon } from "@/components/brand-icons/table-icons";
import { useAuth } from "@/api-authorization/AuthProvider";
import { isDemoProfile } from "@/auth/demoSession";

const SUB_NAV = [
    { to: "organization", label: "Organization",        icon: Building2, demoVisible: false },
    { to: "floor-plan",   label: "Floor Plan",          icon: FloorPlanGridIcon, demoVisible: true },
    { to: "roles",        label: "Roles & Permissions", icon: Shield, demoVisible: false },
];

export default function AdminTab() {
    const { pathname } = useLocation();
    const navigate = useNavigate();
    const { profile } = useAuth();
    // Organization settings and role management are blocked at the route
    // level for the demo_admin session (see app/router.tsx's blockDemo) -
    // drop them here too so the sub-nav doesn't offer a link that immediately
    // redirects. Floor Plan stays, it's the one admin page demo visitors are
    // meant to reach.
    const subNav = isDemoProfile(profile) ? SUB_NAV.filter((item) => item.demoVisible) : SUB_NAV;

    return (
        <>
            <div className="flex gap-1 border-b border-border mb-6 overflow-x-auto">
                {subNav.map((item) => {
                    const to = `/management/admin/${item.to}`;
                    const active = pathname === to || pathname.startsWith(to + "/");
                    return (
                        <button
                            key={item.to}
                            type="button"
                            onClick={() => navigate(to)}
                            className={`flex items-center gap-2 px-3 py-2.5 text-sm font-semibold border-b-2 -mb-px whitespace-nowrap transition-colors ${
                                active
                                    ? "text-brand-strong border-brand"
                                    : "text-muted-foreground border-transparent hover:text-foreground"
                            }`}
                        >
                            <item.icon className="h-4 w-4" />
                            {item.label}
                        </button>
                    );
                })}
            </div>
            <Outlet />
        </>
    );
}
