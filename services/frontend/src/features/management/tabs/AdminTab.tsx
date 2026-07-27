import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { Building2, Grid3x3, Shield, MapPin, Plug } from "lucide-react";

const SUB_NAV = [
    { to: "organization", label: "Organization",        icon: Building2 },
    { to: "floor-plan",   label: "Floor Plan",          icon: Grid3x3 },
    { to: "roles",        label: "Roles & Permissions", icon: Shield },
    { to: "locations",    label: "Locations",           icon: MapPin },
    { to: "integrations", label: "Integrations",        icon: Plug },
];

export default function AdminTab() {
    const { pathname } = useLocation();
    const navigate = useNavigate();

    return (
        <>
            <div className="flex gap-1 border-b border-border mb-6 overflow-x-auto">
                {SUB_NAV.map((item) => {
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
