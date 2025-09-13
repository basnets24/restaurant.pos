import { Outlet, useNavigate, useParams } from "react-router-dom";
import { useTable } from "@/domain/tables/hooks";
import { Button } from "@/components/ui/button";
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

      {/* Render the selected child route (menu). The index route redirects to menu. */}
      <Outlet />
    </div>
  );
}
