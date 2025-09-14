// src/features/pos/routes/TablesPage.tsx
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTables, useSeat, useSetTableStatus, useClear } from "@/domain/tables/hooks";
import { useFloorHub } from "@/domain/tables/realtime";
import { useAuth } from "@/api-authorization/AuthProvider";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import type { TableViewDto, TableStatus } from "@/domain/tables/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CardGrid } from "@/components/primitives/CardGrid";
import { StatCard } from "@/components/primitives/StatCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Users, Clock, AlertTriangle, ZoomIn, ZoomOut } from "lucide-react";
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuSeparator, ContextMenuTrigger } from "@/components/ui/context-menu";

const GRID = 14;
const statusClass: Record<string, string> = {
  available: "bg-emerald-500/80 border-emerald-600 text-white",
  occupied: "bg-rose-500/80 border-rose-600 text-white",
  reserved: "bg-amber-500/80 border-amber-600 text-white",
  dirty: "bg-zinc-400/70 border-zinc-500 text-white",
};

export default function TablesPage() {
  const { data, isLoading } = useTables();
  const navigate = useNavigate();
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
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
  const sections = useMemo(() => Array.from(new Set(tables.map(t => t.section).filter(Boolean))) as (string[]) , [tables]);
  const onOpen = (id: string) => navigate(`/pos/table/${id}`);

  if (isLoading) return <div className="p-6">Loading…</div>;

  // Fit-to-content helper (5% padding)
  const fitToContent = (wrap: HTMLDivElement | null) => {
    if (!wrap) return;
    const rect = wrap.getBoundingClientRect();
    if (tables.length === 0) { setZoom(1); setPan({ x: 0, y: 0 }); return; }
    const minX = Math.min(...tables.map(t => t.position.x));
    const minY = Math.min(...tables.map(t => t.position.y));
    const maxX = Math.max(...tables.map(t => t.position.x + t.size.width));
    const maxY = Math.max(...tables.map(t => t.position.y + t.size.height));
    const contentW = Math.max(1, maxX - minX);
    const contentH = Math.max(1, maxY - minY);
    const pad = 0.06;
    const nz = Math.min(2, Math.max(0.5, Math.min((rect.width*(1-pad))/contentW, (rect.height*(1-pad))/contentH)));
    const offX = -minX * nz + (rect.width - contentW * nz) / 2;
    const offY = -minY * nz + (rect.height - contentH * nz) / 2;
    setZoom(+nz.toFixed(2));
    setPan({ x: Math.round(offX), y: Math.round(offY) });
  };

  return (
    <div className="p-4 space-y-4">
      <header className="space-y-1">
        <h1 className="text-xl font-semibold">Restaurant Floor Plan</h1>
        <p className="text-sm text-muted-foreground">Right-click tables to manage seating and status</p>
      </header>

      <CardGrid cols={{ base: 2, md: 4 }} gap="gap-3" className="mb-0">
        <StatCard label="Available" value={counts.available} icon={<CheckCircle className="h-5 w-5 text-emerald-600" />} trend="neutral" />
        <StatCard label="Occupied" value={counts.occupied} icon={<Users className="h-5 w-5 text-rose-600" />} trend="neutral" />
        <StatCard label="Reserved" value={counts.reserved} icon={<Clock className="h-5 w-5 text-amber-600" />} trend="neutral" />
        <StatCard label="Need Cleaning" value={counts.dirty} icon={<AlertTriangle className="h-5 w-5 text-zinc-600" />} trend="neutral" />
      </CardGrid>

      <Card>
        <CardHeader className="flex items-center justify-between py-3">
          <CardTitle className="text-base">Dining Room Floor Plan</CardTitle>
          <div className="flex items-center gap-2">
            <Button size="icon" variant="outline" onClick={() => setZoom(z => Math.max(0.5, z - 0.1))}><ZoomOut className="h-4 w-4" /></Button>
            <span className="text-sm w-12 text-center">{Math.round(zoom * 100)}%</span>
            <Button size="icon" variant="outline" onClick={() => setZoom(z => Math.min(2, z + 0.1))}><ZoomIn className="h-4 w-4" /></Button>
            <Button variant="outline" onClick={() => fitToContent(document.getElementById('pos-floor-wrap') as HTMLDivElement)}>Fit</Button>
            <Badge variant="secondary" className="ml-2">{tables.length} tables</Badge>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div
            id="pos-floor-wrap"
            className="relative h-[520px] mx-auto max-w-4xl rounded-lg overflow-hidden bg-[linear-gradient(90deg,rgba(0,0,0,.04)_1px,transparent_1px),linear-gradient(180deg,rgba(0,0,0,.04)_1px,transparent_1px)]"
            style={{ backgroundSize: `${GRID}px ${GRID}px` }}
          >
            <div className="absolute inset-0" style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`, transformOrigin: "0 0" }}>
              {tables.map(t => (
                <TableNode key={t.id} t={t} onOpen={onOpen} />
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sections chips */}
      {sections.length > 0 && (
        <div className="flex flex-wrap gap-2 pt-1">
          {sections.map(s => (
            <Badge key={s} variant="outline" className="text-xs">{s}</Badge>
          ))}
        </div>
      )}
    </div>
  );
}

function TableNode({ t, onOpen }: { t: TableViewDto; onOpen: (id: string) => void }) {
  const navigate = useNavigate();
  const seat = useSeat(t.id);
  const setStatus = useSetTableStatus(t.id);
  const clear = useClear(t.id);
  const mark = (s: TableStatus) => setStatus.mutate({ status: s });

  const canViewOrder = t.status === "occupied" && (t.activeCartId ?? null);
  const [seatOpen, setSeatOpen] = useState(false);
  const [party, setParty] = useState<string>("2");

  return (
    <ContextMenu>
      <ContextMenuTrigger>
        <button
          className={`absolute rounded-md border shadow-sm focus:outline-none focus:ring-2 focus:ring-primary transition-transform px-2.5 py-3 ${statusClass[t.status] ?? "bg-muted/60"}`}
          style={{ left: t.position.x, top: t.position.y, width: t.size.width, height: t.size.height, transform: `rotate(${(t as any).rotation ?? 0}deg)` }}
          onClick={() => onOpen(t.id)}
        >
          <div className="text-[10px] px-1 py-0.5 opacity-90">{t.section || ""}</div>
          <div className="px-1 text-sm font-medium">#{t.number}</div>
          <div className="px-1 text-[10px]">{t.seats} seats</div>
        </button>
      </ContextMenuTrigger>
      <ContextMenuContent className="w-48">
        <ContextMenuItem disabled={t.status === "occupied"} onClick={() => setSeatOpen(true)}>Seat Party…   ⌘S</ContextMenuItem>
        <ContextMenuItem disabled={!canViewOrder} onClick={() => onOpen(t.id)}>Open Order   ⌘O</ContextMenuItem>
        <ContextMenuItem disabled>Transfer…   ⌘T</ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem onClick={() => mark("reserved")}>Mark Reserved   R</ContextMenuItem>
        <ContextMenuItem onClick={() => mark("dirty")}>Needs Cleaning   D</ContextMenuItem>
        <ContextMenuItem onClick={() => mark("available")}>Mark Available   A</ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem onClick={() => { if (t.activeCartId) { if (confirm("Clear table with open check?")) clear.mutate(); } else { clear.mutate(); } }}>Clear   ⌘K</ContextMenuItem>
      </ContextMenuContent>
      <Dialog open={seatOpen} onOpenChange={setSeatOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Seat Party — Table {t.number}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-2">
            <label className="text-xs">Party size</label>
            <Input type="number" min={1} max={t.seats} value={party} onChange={(e) => setParty(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSeatOpen(false)}>Cancel</Button>
            <Button onClick={async () => {
              const size = Math.max(1, Math.min(t.seats, parseInt(party || "1")));
              try { await seat.mutateAsync(size); } catch {}
              setSeatOpen(false);
              navigate(`/pos/table/${t.id}/menu`, { state: { partySize: size } });
            }}>Seat</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ContextMenu>
  );
}

function countByStatus(tables: TableViewDto[]) {
  const res = { available: 0, occupied: 0, reserved: 0, dirty: 0 } as Record<string, number>;
  for (const t of tables) res[t.status] = (res[t.status] ?? 0) + 1;
  return res;
}

// Stat component replaced by shared StatCard
