import { Outlet, NavLink, useNavigate, useParams } from "react-router-dom";
import { useTable } from "@/domain/tables/hooks";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft } from "lucide-react";

export default function TableRoute() {
  const { tableId = "" } = useParams<{ tableId: string }>();
  const navigate = useNavigate();
  const table = useTable(tableId).data;

  return (
    <div className="p-4 mx-auto max-w-5xl">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => navigate("/pos/tables")}> 
            <ArrowLeft className="h-4 w-4 mr-1" /> Back
          </Button>
          <div className="text-sm text-muted-foreground">Table</div>
          <div className="text-base font-semibold">{table?.number ?? tableId}</div>
          {table?.section && (
            <div className="text-sm text-muted-foreground">• {table.section}</div>
          )}
        </div>
      </div>

      <Card className="p-2">
        <div className="flex items-center gap-4 px-2 py-1">
          <Tab to="menu" label="Menu" />
          <Tab to="order" label="Order" />
          <Tab to="checkout" label="Checkout" />
        </div>
        <Separator className="mb-2" />
        {/* Child routes render here (menu / order / checkout). The index route redirects to menu. */}
        <Outlet />
      </Card>
    </div>
  );
}

function Tab({ to, label }: { to: string; label: string }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `text-sm px-2 py-1 rounded-none border-b-2 ${
          isActive
            ? "border-primary text-foreground font-medium"
            : "border-transparent text-muted-foreground hover:text-foreground"
        }`
      }
      end
    >
      {label}
    </NavLink>
  );
}
