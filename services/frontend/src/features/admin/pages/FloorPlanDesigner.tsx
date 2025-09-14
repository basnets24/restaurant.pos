import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/api-authorization/AuthProvider";
import { toast } from "sonner";

import {
  useTables,
  useBulkUpdateLayout,
  useCreateTable,
  useDeleteTable,
  useJoinTables,
  useSplitTables,
} from "@/domain/tables/hooks";
import type { TableViewDto, BulkLayoutItemDto } from "@/domain/tables/types";
import { tableKeys } from "@/domain/tables/keys";
import { useQueryClient } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

import { Plus, Save, UploadCloud, Undo2, Redo2, ZoomOut, Trash2, Play } from "lucide-react";

type Mode = "view" | "edit";

type DraftTable = TableViewDto & {
  rotation?: number;
  selected?: boolean;
  isNew?: boolean;
  _deleted?: boolean;
};

export default function FloorPlanDesigner() {
  const { data, isLoading } = useTables();
  const [mode, setMode] = useState<Mode>("view");

  if (isLoading) return <div className="p-6">Loading…</div>;
  const tables: TableViewDto[] = Array.isArray(data)
    ? (data as TableViewDto[])
    : Array.isArray((data as any)?.items)
      ? ((data as any).items as TableViewDto[])
      : [];

  if (mode === "view") return <ViewMode tables={tables} onEdit={() => setMode("edit")} />;
  return <EditMode initial={tables} onExit={() => setMode("view")} />;
}

function ViewMode({ tables, onEdit }: { tables: TableViewDto[]; onEdit: () => void }) {
  const hasAny = tables.length > 0;
  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Floor Plan</h1>
        <Button onClick={onEdit}>{hasAny ? "Edit layout" : "Add first table"}</Button>
      </div>
      {!hasAny ? (
        <Card>
          <CardHeader>
            <CardTitle>No tables yet</CardTitle>
            <CardDescription>Design your restaurant floor plan to get started.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={onEdit}><Plus className="h-4 w-4 mr-2" />Add first table</Button>
          </CardContent>
        </Card>
      ) : (
        <ReadOnlyCanvas tables={tables} />
      )}
    </div>
  );
}

function ReadOnlyCanvas({ tables }: { tables: TableViewDto[] }) {
  return (
    <div className="relative h-[640px] rounded-lg border bg-muted/20 overflow-hidden">
      {tables.map((t) => (
        <div
          key={t.id}
          className="absolute rounded-md border bg-white/90 shadow-sm"
          style={{ left: t.position.x, top: t.position.y, width: t.size.width, height: t.size.height, transform: `rotate(${(t as any).rotation ?? 0}deg)` }}
        >
          <div className="text-xs px-2 py-1 opacity-70">{t.section || "Section"}</div>
          <div className="px-2">#{t.number}</div>
          <div className="px-2 text-xs">{t.seats} seats</div>
        </div>
      ))}
    </div>
  );
}

const GRID = 20;
const snap = (v: number) => Math.round(v / GRID) * GRID;

function EditMode({ initial, onExit }: { initial: TableViewDto[]; onExit: () => void }) {
  const qc = useQueryClient();
  const { profile } = useAuth();
  const rolesRaw = (profile as any)?.role as string | string[] | undefined;
  const roles = Array.isArray(rolesRaw) ? rolesRaw : rolesRaw ? [rolesRaw] : [];
  const canPublish = roles.includes("Admin") || roles.includes("Manager");

  const [draft, setDraft] = useState<DraftTable[]>(() => initial.map((t) => ({ ...t, rotation: 0 })));
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [guides, setGuides] = useState<{ vx?: number[]; hy?: number[] }>({});
  const [savedDraft, setSavedDraft] = useState(false);
  const [undoStack, setUndo] = useState<DraftTable[][]>([]);
  const [redoStack, setRedo] = useState<DraftTable[][]>([]);
  const [conflictOpen, setConflictOpen] = useState(false);
  const [publishOpen, setPublishOpen] = useState(false);

  const bulk = useBulkUpdateLayout();
  const createMut = useCreateTable();
  const deleteMut = useDeleteTable();
  const joinMut = useJoinTables();
  const splitMut = useSplitTables();

  // selection helpers
  const selectedIds = useMemo(() => draft.filter(d => d.selected && !d._deleted).map(d => d.id), [draft]);
  const pushUndo = () => setUndo((s) => [...s, structuredClone(draft)]);

  const mutateTable = (id: string, updater: (t: DraftTable) => DraftTable) => {
    setDraft((prev) => prev.map((t) => (t.id === id ? updater(t) : t)));
  };

  const onAddTable = () => {
    pushUndo();
    const nid = `tmp-${Date.now()}`;
    setDraft((prev) => [
      ...prev,
      {
        id: nid,
        number: String(prev.length + 1),
        section: "Main",
        seats: 4,
        shape: "rectangle",
        status: "available",
        position: { x: snap(32 + prev.length * 10), y: snap(32 + prev.length * 6) },
        size: { width: 80, height: 80 },
        version: 0,
        isNew: true,
        rotation: 0,
      },
    ]);
  };

  const onDelete = () => {
    const toDelete = draft.filter(d => d.selected && !d.isNew && !d._deleted);
    const occupied = toDelete.filter(d => d.status === "occupied");
    if (occupied.length > 0) {
      toast.error("Cannot delete occupied tables");
      return;
    }
    pushUndo();
    setDraft(draft => draft.map(d => d.selected ? ({ ...d, _deleted: true }) : d));
  };

  const onSaveDraft = () => {
    // Persist to localStorage only
    const payload = { draft, ts: Date.now() };
    localStorage.setItem("floorplan_draft", JSON.stringify(payload));
    setSavedDraft(true);
    toast.success("Draft saved");
  };

  const changedLayouts = (): BulkLayoutItemDto[] => {
    return draft
      .filter(d => !d.isNew && !d._deleted)
      .map(d => ({ id: d.id, x: d.position.x, y: d.position.y, width: d.size.width, height: d.size.height, rotation: d.rotation ?? 0, shape: d.shape, version: d.version }));
  };

  const onPublish = async () => {
    // Publish new tables, deletions, and layout updates
    try {
      // Create new tables
      const creations = draft.filter(d => d.isNew && !d._deleted);
      for (const c of creations) {
        await createMut.mutateAsync({ number: c.number, section: c.section ?? undefined, seats: c.seats, shape: c.shape, position: c.position, size: c.size });
      }

      // Delete marked tables
      const deletions = draft.filter(d => d._deleted && !d.isNew);
      for (const del of deletions) {
        await deleteMut.mutateAsync(del.id);
      }

      // Bulk layout update for existing tables
      const items = changedLayouts();
      if (items.length > 0) {
        await bulk.mutateAsync({ items });
      }

      localStorage.removeItem("floorplan_draft");
      setSavedDraft(false);
      toast.success("Layout published");
      qc.invalidateQueries({ queryKey: tableKeys.all });
      onExit();
    } catch (e: any) {
      if (e?.response?.status === 409) {
        setConflictOpen(true);
      } else {
        toast.error("Failed to publish layout");
      }
    }
  };

  const onDiscard = () => {
    setDraft(initial.map(t => ({ ...t, rotation: 0 })));
    setSavedDraft(false);
    toast("Draft discarded");
  };

  const onUndo = () => {
    setRedo(r => [...r, draft]);
    setDraft(undoStack.at(-1) ?? draft);
    setUndo(s => s.slice(0, Math.max(0, s.length - 1)));
  };
  const onRedo = () => {
    const next = redoStack.at(-1);
    if (!next) return;
    setUndo(s => [...s, draft]);
    setDraft(next);
    setRedo(s => s.slice(0, Math.max(0, s.length - 1)));
  };

  // Canvas interactions
  const wrapRef = useRef<HTMLDivElement | null>(null);
  type DragMode = { type: "move"; id: string; ox: number; oy: number; group?: { id: string; ox: number; oy: number }[] } |
  { type: "resize"; id: string; edge: "nw" | "ne" | "se" | "sw"; ox: number; oy: number; start: DraftTable } |
  { type: "rotate"; id: string; cx: number; cy: number };
  const dragRef = useRef<DragMode | null>(null);

  useEffect(() => {
    // Fit view on entering edit mode
    fitToContent();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fit-to-content on mount + helper
  const fitToContent = () => {
    const el = wrapRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const pad = 0.08; // 8% padding
    const items = draft.filter(d => !d._deleted);
    if (items.length === 0) { setZoom(1); setPan({ x: 0, y: 0 }); return; }
    const minX = Math.min(...items.map(t => t.position.x));
    const minY = Math.min(...items.map(t => t.position.y));
    const maxX = Math.max(...items.map(t => t.position.x + t.size.width));
    const maxY = Math.max(...items.map(t => t.position.y + t.size.height));
    const contentW = Math.max(1, maxX - minX);
    const contentH = Math.max(1, maxY - minY);
    const scaleW = (rect.width * (1 - pad)) / contentW;
    const scaleH = (rect.height * (1 - pad)) / contentH;
    const nz = Math.max(0.25, Math.min(2, Math.min(scaleW, scaleH)));
    const offX = -minX * nz + (rect.width - contentW * nz) / 2;
    const offY = -minY * nz + (rect.height - contentH * nz) / 2;
    setZoom(parseFloat(nz.toFixed(2)));
    setPan({ x: Math.round(offX), y: Math.round(offY) });
  };

  const onMouseDown = (e: React.MouseEvent, id: string) => {
    if (e.button !== 0) return;
    const wrap = wrapRef.current;
    if (!wrap) return;
    const rect = wrap.getBoundingClientRect();
    const x = (e.clientX - rect.left - pan.x) / zoom;
    const y = (e.clientY - rect.top - pan.y) / zoom;
    const t = draft.find(d => d.id === id)!;
    // If multiple selected, prepare group offsets
    const group = draft.filter(d => d.selected && !d._deleted).map(d => ({ id: d.id, ox: x - d.position.x, oy: y - d.position.y }));
    dragRef.current = { type: "move", id, ox: x - t.position.x, oy: y - t.position.y, group };
    // selection
    if (e.shiftKey) {
      setDraft(prev => prev.map(d => d.id === id ? { ...d, selected: !d.selected } : d));
    } else {
      setDraft(prev => prev.map(d => ({ ...d, selected: d.id === id })));
    }
  };

  const onMouseMove = (e: React.MouseEvent) => {
    if (!dragRef.current) return;
    e.preventDefault();
    const wrap = wrapRef.current;
    if (!wrap) return;
    const rect = wrap.getBoundingClientRect();
    const x = (e.clientX - rect.left - pan.x) / zoom;
    const y = (e.clientY - rect.top - pan.y) / zoom;
    const dm = dragRef.current;
    if (dm.type === "move") {
      // Move all selected keeping relative offsets
      const nx = snap(x - dm.ox);
      const ny = snap(y - dm.oy);
      if (dm.group && dm.group.length > 1) {
        setDraft(prev => prev.map(t => {
          const g = dm.group!.find(g => g.id === t.id);
          if (!g || t._deleted) return t;
          const gx = snap(x - g.ox);
          const gy = snap(y - g.oy);
          return { ...t, position: { x: gx, y: gy } };
        }));
      } else {
        mutateTable(dm.id, (t) => ({ ...t, position: { x: nx, y: ny } }));
      }
      // Alignment guides
      const moving = draft.find(d => d.id === (dm as any).id);
      if (moving) {
        const edges = { l: nx, r: nx + moving.size.width, t: ny, b: ny + moving.size.height, cx: nx + moving.size.width/2, cy: ny + moving.size.height/2 };
        const vx: number[] = []; const hy: number[] = [];
        const threshold = 6;
        for (const other of draft) {
          if (other.id === moving.id || other._deleted) continue;
          const o = { l: other.position.x, r: other.position.x + other.size.width, t: other.position.y, b: other.position.y + other.size.height, cx: other.position.x + other.size.width/2, cy: other.position.y + other.size.height/2 };
          if (Math.abs(edges.l - o.l) <= threshold) vx.push(o.l);
          if (Math.abs(edges.r - o.r) <= threshold) vx.push(o.r);
          if (Math.abs(edges.cx - o.cx) <= threshold) vx.push(o.cx);
          if (Math.abs(edges.t - o.t) <= threshold) hy.push(o.t);
          if (Math.abs(edges.b - o.b) <= threshold) hy.push(o.b);
          if (Math.abs(edges.cy - o.cy) <= threshold) hy.push(o.cy);
        }
        setGuides({ vx: vx.slice(0,2), hy: hy.slice(0,2) });
      }
    } else if (dm.type === "resize") {
      // Resize from the specified corner, keep min 16
      setDraft(prev => prev.map(t => {
        if (t.id !== dm.id) return t;
        const start = dm.start;
        let w = start.size.width;
        let h = start.size.height;
        let px = start.position.x;
        let py = start.position.y;
        const rx = x; const ry = y;
        if (dm.edge === "se") { w = snap(Math.max(16, rx - start.position.x)); h = snap(Math.max(16, ry - start.position.y)); }
        if (dm.edge === "sw") { w = snap(Math.max(16, start.size.width + (start.position.x - rx))); px = snap(rx); h = snap(Math.max(16, ry - start.position.y)); }
        if (dm.edge === "ne") { w = snap(Math.max(16, rx - start.position.x)); h = snap(Math.max(16, start.size.height + (start.position.y - ry))); py = snap(ry); }
        if (dm.edge === "nw") { w = snap(Math.max(16, start.size.width + (start.position.x - rx))); px = snap(rx); h = snap(Math.max(16, start.size.height + (start.position.y - ry))); py = snap(ry); }
        return { ...t, position: { x: px, y: py }, size: { width: w, height: h } };
      }));
    } else if (dm.type === "rotate") {
      // Rotation around center, snap to 15 degrees
      setDraft(prev => prev.map(t => {
        if (t.id !== dm.id) return t;
        const angle = Math.atan2(y - dm.cy, x - dm.cx) * 180 / Math.PI;
        const snapped = Math.round(angle / 15) * 15;
        return { ...t, rotation: snapped };
      }));
    }
  };
  const onMouseUp = () => { dragRef.current = null; setGuides({}); };

  const selected = draft.filter(d => d.selected && !d._deleted)[0];

  return (
    <div className="p-4 space-y-3">
      {/* Toolbar */}
      <div className="flex items-center gap-2">
        <Button variant="outline" onClick={onAddTable}><Plus className="h-4 w-4 mr-1" />Add table</Button>
        <Button variant="outline" onClick={onDelete}><Trash2 className="h-4 w-4 mr-1" />Delete</Button>
        <Separator orientation="vertical" className="mx-2" />
        <Button variant="outline" onClick={() => setZoom(0.5)}>50%</Button>
        <Button variant="outline" onClick={() => setZoom(0.75)}>75%</Button>
        <Button variant="outline" onClick={() => setZoom(1)}>100%</Button>
        <Button variant="outline" onClick={() => setZoom(1.25)}>125%</Button>
        <Button variant="outline" onClick={fitToContent}>Fit</Button>
        <Separator orientation="vertical" className="mx-2" />
        <Button variant="outline" onClick={onUndo} disabled={undoStack.length === 0}><Undo2 className="h-4 w-4" /></Button>
        <Button variant="outline" onClick={onRedo} disabled={redoStack.length === 0}><Redo2 className="h-4 w-4" /></Button>
      </div>

      <div className="grid grid-cols-12 gap-4">
        {/* Canvas */}
        <div className="col-span-8">
          <div
            ref={wrapRef}
            onMouseMove={onMouseMove}
            onMouseUp={onMouseUp}
            onWheel={(e) => {
              if (e.ctrlKey || e.metaKey) {
                e.preventDefault();
                const dz = e.deltaY < 0 ? 0.1 : -0.1;
                setZoom(z => Math.max(0.25, Math.min(2, +(z + dz).toFixed(2))));
              }
            }}
            className="relative aspect-[16/10] max-h-[70vh] rounded-lg border overflow-hidden bg-[linear-gradient(90deg,rgba(0,0,0,.05)_1px,transparent_1px),linear-gradient(180deg,rgba(0,0,0,.05)_1px,transparent_1px)]"
            style={{ backgroundSize: `${GRID}px ${GRID}px` }}
          >
            <div className="absolute inset-0" style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`, transformOrigin: "0 0" }}>
              {draft.filter(d => !d._deleted).map((t) => (
                <div
                  key={t.id}
                  className={`absolute rounded-md border shadow-sm cursor-move ${t.selected ? "ring-2 ring-primary" : ""}`}
                  style={{ left: t.position.x, top: t.position.y, width: t.size.width, height: t.size.height, transform: `rotate(${t.rotation ?? 0}deg)` }}
                  onMouseDown={(e) => onMouseDown(e, t.id)}
                >
                  <div className="text-[10px] px-1 py-0.5 opacity-70">{t.section || "Section"}</div>
                  <div className="px-1 text-sm font-medium">#{t.number}</div>
                  <div className="px-1 text-[10px]">{t.seats} seats</div>
                  {t.isNew && <div className="absolute -top-2 -right-2 bg-amber-500 text-white text-[10px] px-1 rounded">new</div>}
                  {t._deleted && <div className="absolute inset-0 bg-red-500/10" />}

                  {/* Resize handles on selection */}
                  {t.selected && (
                    <>
                      {/* corners */}
                      <div className="absolute -left-1 -top-1 w-2 h-2 bg-primary rounded-sm cursor-nw-resize"
                        onMouseDown={(e) => { e.stopPropagation(); const rect = wrapRef.current!.getBoundingClientRect(); const cx = (t.position.x + t.size.width / 2); const cy = (t.position.y + t.size.height / 2); dragRef.current = { type: "resize", id: t.id, edge: "nw", ox: 0, oy: 0, start: { ...t } }; }} />
                      <div className="absolute -right-1 -top-1 w-2 h-2 bg-primary rounded-sm cursor-ne-resize"
                        onMouseDown={(e) => { e.stopPropagation(); dragRef.current = { type: "resize", id: t.id, edge: "ne", ox: 0, oy: 0, start: { ...t } }; }} />
                      <div className="absolute -right-1 -bottom-1 w-2 h-2 bg-primary rounded-sm cursor-se-resize"
                        onMouseDown={(e) => { e.stopPropagation(); dragRef.current = { type: "resize", id: t.id, edge: "se", ox: 0, oy: 0, start: { ...t } }; }} />
                      <div className="absolute -left-1 -bottom-1 w-2 h-2 bg-primary rounded-sm cursor-sw-resize"
                        onMouseDown={(e) => { e.stopPropagation(); dragRef.current = { type: "resize", id: t.id, edge: "sw", ox: 0, oy: 0, start: { ...t } }; }} />
                      {/* rotation handle */}
                      <div className="absolute left-1/2 -top-4 -translate-x-1/2 w-3 h-3 bg-primary rounded-full cursor-crosshair"
                        onMouseDown={(e) => { e.stopPropagation(); const cx = t.position.x + t.size.width / 2; const cy = t.position.y + t.size.height / 2; dragRef.current = { type: "rotate", id: t.id, cx, cy }; }} />
                    </>
                  )}
                </div>
              ))}
              {/* Guides */}
              {guides.vx?.map((x, i) => (
                <div key={`vx-${i}`} className="absolute top-0 bottom-0 w-px bg-primary/50" style={{ left: x }} />
              ))}
              {guides.hy?.map((y, i) => (
                <div key={`hy-${i}`} className="absolute left-0 right-0 h-px bg-primary/50" style={{ top: y }} />
              ))}
            </div>
          </div>
        </div>

        {/* Inspector */}
        <div className="col-span-4">
          <Card>
            <CardHeader>
              <CardTitle>Inspector</CardTitle>
              <CardDescription>Edit selected table properties</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {!selected ? (
                <div className="text-sm text-muted-foreground">Select a table to edit</div>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs">Number</label>
                      <Input value={selected.number} onChange={(e) => mutateTable(selected.id, t => ({ ...t, number: e.target.value }))} />
                    </div>
                    <div>
                      <label className="text-xs">Seats</label>
                      <Input type="number" min={1} value={selected.seats} onChange={(e) => mutateTable(selected.id, t => ({ ...t, seats: Math.max(1, parseInt(e.target.value || "1")) }))} />
                    </div>
                    <div>
                      <label className="text-xs">Section</label>
                      <Input value={selected.section ?? ""} onChange={(e) => mutateTable(selected.id, t => ({ ...t, section: e.target.value || null }))} />
                    </div>
                    <div>
                      <label className="text-xs">Shape</label>
                      <Select value={selected.shape} onValueChange={(v) => mutateTable(selected.id, t => ({ ...t, shape: v }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="rectangle">Rectangle</SelectItem>
                          <SelectItem value="square">Square</SelectItem>
                          <SelectItem value="circle">Circle</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <Separator />
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="text-xs">X</label>
                      <Input type="number" value={selected.position.x} onChange={(e) => mutateTable(selected.id, t => ({ ...t, position: { ...t.position, x: snap(parseInt(e.target.value || "0")) } }))} />
                    </div>
                    <div>
                      <label className="text-xs">Y</label>
                      <Input type="number" value={selected.position.y} onChange={(e) => mutateTable(selected.id, t => ({ ...t, position: { ...t.position, y: snap(parseInt(e.target.value || "0")) } }))} />
                    </div>
                    <div>
                      <label className="text-xs">Rotation</label>
                      <Input type="number" value={selected.rotation ?? 0} onChange={(e) => mutateTable(selected.id, t => ({ ...t, rotation: Math.round((parseInt(e.target.value || "0") / 15)) * 15 }))} />
                    </div>
                    <div>
                      <label className="text-xs">Width</label>
                      <Input type="number" value={selected.size.width} onChange={(e) => mutateTable(selected.id, t => ({ ...t, size: { ...t.size, width: snap(Math.max(16, parseInt(e.target.value || "16"))) } }))} />
                    </div>
                    <div>
                      <label className="text-xs">Height</label>
                      <Input type="number" value={selected.size.height} onChange={(e) => mutateTable(selected.id, t => ({ ...t, size: { ...t.size, height: snap(Math.max(16, parseInt(e.target.value || "16"))) } }))} />
                    </div>
                  </div>
                  <Separator />
                  <div className="text-xs text-muted-foreground">Status preview: {selected.status}</div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Footer bar */}
      <div className="flex items-center justify-between border rounded-md p-2">
        <div className="text-xs text-muted-foreground">Draft mode. Changes are local until Publish.</div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={onDiscard}>Discard</Button>
          <Button variant="outline" onClick={onSaveDraft}><Save className="h-4 w-4 mr-1" />Save Draft</Button>
          <Button onClick={() => setPublishOpen(true)} disabled={!savedDraft || !canPublish}><UploadCloud className="h-4 w-4 mr-1" />Publish</Button>
          <Button variant="outline" onClick={onExit}><Play className="h-4 w-4 mr-1" />Exit</Button>
        </div>
      </div>

      {/* Join/Split */}
      <div className="mt-2 flex items-center gap-2">
        <JoinSplitControls selectedIds={selectedIds} onJoin={(label) => joinMut.mutate({ tableIds: selectedIds, groupLabel: label }, { onSuccess: () => toast.success("Joined tables") })}
          onSplit={() => splitMut.mutate({ groupId: "" }, { onSuccess: () => toast.success("Split tables") })} />
      </div>

      {/* Conflict modal */}
      <Dialog open={conflictOpen} onOpenChange={setConflictOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Version conflict</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">The floor plan was changed on the server. Reload or try publishing again.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => { qc.invalidateQueries({ queryKey: tableKeys.all }); setConflictOpen(false); toast("Reloaded from server"); }}>{"Reload"}</Button>
            <Button onClick={() => setConflictOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Publish confirm */}
      <Dialog open={publishOpen} onOpenChange={setPublishOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Publish layout</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Publishing updates the live POS floor. Proceed?</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPublishOpen(false)}>Cancel</Button>
            <Button onClick={() => { setPublishOpen(false); onPublish(); }}>Publish</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function JoinSplitControls({ selectedIds, onJoin, onSplit }: { selectedIds: string[]; onJoin: (label?: string) => void; onSplit: () => void }) {
  const [open, setOpen] = useState(false);
  const [label, setLabel] = useState("");
  const canJoin = selectedIds.length >= 2;
  return (
    <>
      <Button variant="outline" disabled={!canJoin} onClick={() => setOpen(true)}>Join</Button>
      <Button variant="outline" disabled title="Split requires selecting a grouped table">Split</Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Join tables</DialogTitle></DialogHeader>
          <div className="space-y-2">
            <label className="text-xs">Group label (optional)</label>
            <Input value={label} onChange={(e) => setLabel(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={() => { setOpen(false); onJoin(label || undefined); }}>Join</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
