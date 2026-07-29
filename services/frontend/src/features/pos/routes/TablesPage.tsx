// src/features/pos/routes/TablesPage.tsx
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTables, useSeat, useSetTableStatus, useClear } from "@/domain/tables/hooks";
import { useFloorHub } from "@/domain/tables/realtime";
import { useAuth } from "@/api-authorization/AuthProvider";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { TableViewDto, TableStatus } from "@/domain/tables/types";
import { ZoomIn, ZoomOut } from "lucide-react";
import { SectionSigns, shapeRadiusClass, STATUS_STYLE, StatusLegend, countByStatus } from "@/components/floor-plan/floorVisuals";

const GRID = 20;

export default function TablesPage() {
  const { data, isLoading } = useTables();
  const { profile, getAccessToken } = useAuth();
  const restaurantId = (profile as any)?.restaurantId ?? (profile as any)?.restaurant_id;
  const locationId = (profile as any)?.locationId ?? (profile as any)?.location_id;
  useFloorHub({ restaurantId, locationId, accessTokenFactory: async () => (await getAccessToken()) ?? "" });

  const tables: TableViewDto[] = useMemo(() => {
    if (Array.isArray(data)) return data as TableViewDto[];
    if (data && Array.isArray((data as any).items)) return (data as any).items as TableViewDto[];
    return [];
  }, [data]);

  const counts = useMemo(() => countByStatus(tables), [tables]);
  const [active, setActive] = useState<TableViewDto | null>(null);

  const wrapRef = useRef<HTMLDivElement | null>(null);
  const [view, setView] = useState({ x: 0, y: 0, zoom: 1 });
  const panRef = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(null);
  const [panning, setPanning] = useState(false);

  const fitToContent = () => {
    const el = wrapRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    if (tables.length === 0) { setView({ x: 0, y: 0, zoom: 1 }); return; }
    const pad = 0.08;
    const minX = Math.min(...tables.map(t => t.position.x));
    const minY = Math.min(...tables.map(t => t.position.y));
    const maxX = Math.max(...tables.map(t => t.position.x + t.size.width));
    const maxY = Math.max(...tables.map(t => t.position.y + t.size.height));
    const contentW = Math.max(1, maxX - minX);
    const contentH = Math.max(1, maxY - minY);
    const nz = Math.max(0.35, Math.min(2, Math.min((rect.width * (1 - pad)) / contentW, (rect.height * (1 - pad)) / contentH)));
    const offX = -minX * nz + (rect.width - contentW * nz) / 2;
    const offY = -minY * nz + (rect.height - contentH * nz) / 2;
    setView({ x: Math.round(offX), y: Math.round(offY), zoom: +nz.toFixed(2) });
  };

  // Fit once the floor has tables to fit to (data arrives async after mount).
  useLayoutEffect(() => {
    fitToContent();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tables.length > 0]);

  // Re-fit whenever the canvas itself resizes (browser window resize, devtools
  // toggling, etc.) — otherwise the pan/zoom computed for the old container
  // size sticks around and the floor drifts off-center. Routed through a ref
  // so the observer (created once) always calls the latest closure instead of
  // one stale from first mount, without re-fitting on every data refresh.
  const fitRef = useRef(fitToContent);
  useEffect(() => { fitRef.current = fitToContent; });
  useEffect(() => {
    // wrapRef.current is only null while the "Loading…" branch below is
    // rendered (before the canvas div — which owns this ref — ever mounts);
    // re-run once that flips so the observer actually gets attached.
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => fitRef.current());
    ro.observe(el);
    return () => ro.disconnect();
  }, [isLoading]);

  const onCanvasMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest("[data-table]")) return;
    panRef.current = { startX: e.clientX, startY: e.clientY, origX: view.x, origY: view.y };
    setPanning(true);
  };
  const onCanvasMouseMove = (e: React.MouseEvent) => {
    const p = panRef.current;
    if (!p) return;
    setView(v => ({ ...v, x: p.origX + (e.clientX - p.startX), y: p.origY + (e.clientY - p.startY) }));
  };
  const onCanvasMouseUp = () => { panRef.current = null; setPanning(false); };
  const onWheel = (e: React.WheelEvent) => {
    if (!e.ctrlKey && !e.metaKey) return;
    e.preventDefault();
    setView(v => ({ ...v, zoom: Math.max(0.35, Math.min(2, +(v.zoom - e.deltaY * 0.001).toFixed(2))) }));
  };

  if (isLoading) return <div className="p-6 text-muted-foreground">Loading…</div>;

  return (
    <div className="flex flex-col gap-4 p-4">
      <div
        ref={wrapRef}
        onMouseDown={onCanvasMouseDown}
        onMouseMove={onCanvasMouseMove}
        onMouseUp={onCanvasMouseUp}
        onMouseLeave={onCanvasMouseUp}
        onWheel={onWheel}
        className={`relative h-[70vh] rounded-2xl border border-border overflow-hidden bg-muted ${panning ? "cursor-grabbing" : "cursor-default"}`}
        style={{ backgroundImage: "linear-gradient(90deg,rgba(53,25,3,.05) 1px,transparent 1px),linear-gradient(180deg,rgba(53,25,3,.05) 1px,transparent 1px)", backgroundSize: `${GRID}px ${GRID}px` }}
      >
        {tables.length === 0 ? (
          <div className="absolute inset-0 flex items-center justify-center text-center px-6">
            <div className="text-sm text-muted-foreground">
              No tables yet. Add some from Management → Admin → Floor Plan.
            </div>
          </div>
        ) : (
          <div className="absolute inset-0" style={{ transform: `translate(${view.x}px, ${view.y}px) scale(${view.zoom})`, transformOrigin: "0 0" }}>
            <SectionSigns tables={tables} />
            {tables.map(t => (
              <TableMark key={t.id} t={t} onOpen={() => setActive(t)} />
            ))}
          </div>
        )}

        <div className="absolute top-4 right-4 flex items-center gap-1 rounded-xl border border-border bg-card p-1 shadow-sm">
          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setView(v => ({ ...v, zoom: Math.max(0.35, +(v.zoom - 0.1).toFixed(2)) }))}>
            <ZoomOut className="h-4 w-4" />
          </Button>
          <span className="w-10 text-center text-xs font-numeric text-muted-foreground">{Math.round(view.zoom * 100)}%</span>
          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setView(v => ({ ...v, zoom: Math.min(2, +(v.zoom + 0.1).toFixed(2)) }))}>
            <ZoomIn className="h-4 w-4" />
          </Button>
          <div className="w-px h-5 bg-border mx-0.5" />
          <Button size="sm" variant="ghost" className="h-8" onClick={fitToContent}>Fit</Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-end gap-x-8 gap-y-2 rounded-xl border border-border bg-card px-6 py-4">
        <StatusLegend counts={counts} />
      </div>

      <TableActionDialog table={active} onClose={() => setActive(null)} />
    </div>
  );
}

function TableMark({ t, onOpen }: { t: TableViewDto; onOpen: () => void }) {
  const s = STATUS_STYLE[t.status] ?? STATUS_STYLE.available;
  return (
    <button
      data-table
      onClick={onOpen}
      className={`absolute border-2 shadow-sm flex flex-col items-center justify-center gap-0.5 focus:outline-none focus:ring-2 focus:ring-ring transition-transform duration-[120ms] ease-out hover:scale-[1.04] ${s.bg} ${s.border} ${shapeRadiusClass(t.shape)}`}
      style={{ left: t.position.x, top: t.position.y, width: t.size.width, height: t.size.height, transform: `rotate(${(t as any).rotation ?? 0}deg)` }}
    >
      <span className="font-numeric text-lg font-semibold text-foreground">{t.number}</span>
      <span className="text-xs text-muted-foreground">{t.seats} seats</span>
    </button>
  );
}

function TableActionDialog({ table, onClose }: { table: TableViewDto | null; onClose: () => void }) {
  const navigate = useNavigate();
  const seat = useSeat(table?.id ?? "");
  const setStatus = useSetTableStatus(table?.id ?? "");
  const clear = useClear(table?.id ?? "");
  const [party, setParty] = useState("2");

  useEffect(() => {
    if (table) setParty(String(Math.min(2, table.seats)));
  }, [table?.id, table?.seats]);

  if (!table) return null;
  const s = STATUS_STYLE[table.status] ?? STATUS_STYLE.available;
  const otherStatuses = (Object.entries(STATUS_STYLE) as [TableStatus, typeof s][]).filter(([key]) => key !== table.status);

  const onSeatParty = async () => {
    const size = Math.max(1, Math.min(table.seats, parseInt(party || "1")));
    try { await seat.mutateAsync(size); } catch {}
    onClose();
    navigate(`/pos/table/${table.id}/menu`, { state: { partySize: size } });
  };

  const onOpenOrder = () => {
    onClose();
    navigate(`/pos/table/${table.id}`);
  };

  const onClear = () => {
    if (table.activeCartId) {
      if (!confirm("Clear table with open check?")) return;
    }
    clear.mutate();
    onClose();
  };

  return (
    <Dialog open={!!table} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <div className="flex items-center gap-3.5 pr-6">
            <div className={`w-12 h-12 rounded-xl border-2 flex items-center justify-center font-numeric text-sm font-semibold text-foreground shrink-0 overflow-hidden px-1 ${s.bg} ${s.border}`}>
              <span className="truncate">{table.number}</span>
            </div>
            <div className="min-w-0">
              <DialogTitle className="truncate">Table {table.number}</DialogTitle>
              <div className="text-sm text-muted-foreground truncate">{table.section || "—"} · seats {table.seats}</div>
            </div>
          </div>
        </DialogHeader>

        <span className={`inline-flex w-fit items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${s.bg}`}>
          <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
          {s.label}
        </span>

        <div className="h-px bg-border" />

        {table.status !== "occupied" && (
          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground">Party size</label>
            <div className="flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => setParty(p => String(Math.max(1, Number(p || 1) - 1)))}
                className="w-9 h-9 rounded-lg border border-border bg-card text-foreground text-lg font-semibold flex items-center justify-center"
              >
                −
              </button>
              <span className="font-numeric text-lg font-semibold text-foreground w-8 text-center">{party}</span>
              <button
                type="button"
                onClick={() => setParty(p => String(Math.min(table.seats, Number(p || 0) + 1)))}
                className="w-9 h-9 rounded-lg border border-border bg-card text-foreground text-lg font-semibold flex items-center justify-center"
              >
                +
              </button>
            </div>
          </div>
        )}

        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Change status</div>
          <div className="flex flex-wrap gap-2">
            {otherStatuses.map(([key, style]) => (
              <button
                key={key}
                type="button"
                onClick={() => setStatus.mutate({ status: key })}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground hover:bg-accent"
              >
                <span className={`h-2 w-2 rounded-full ${style.dot}`} />
                {style.label}
              </button>
            ))}
          </div>
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-col">
          {table.status !== "occupied" ? (
            <Button className="w-full" onClick={onSeatParty}>Seat Party</Button>
          ) : (
            <>
              <Button className="w-full" onClick={onOpenOrder}>Open Order</Button>
              <Button variant="outline" className="w-full" onClick={onClear}>Clear Table</Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
