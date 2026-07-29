// Shared floor-canvas visuals used by both the admin floor plan designer
// (features/admin/pages/FloorPlanDesigner.tsx) and the live POS floor
// (features/pos/routes/TablesPage.tsx), so the two views stay in sync
// rather than re-implementing shape/signage logic twice.
import { useMemo } from "react";
import { BarSignIcon, PatioSignIcon } from "@/components/brand-icons/signage-icons";
import type { TableStatus } from "@/domain/tables/types";

// "circle" is a legacy stored value from before the shape picker settled on the
// backend's round|square|rectangle vocabulary (DiningTable.Shape) — still rendered as round.
export const shapeRadiusClass = (shape: string) => (shape === "round" || shape === "circle" ? "rounded-full" : "rounded-2xl");

export const STATUS_STYLE: Record<TableStatus, { bg: string; border: string; dot: string; label: string }> = {
  available: { bg: "bg-status-available-soft", border: "border-table-available-border", dot: "bg-status-available", label: "Available" },
  occupied: { bg: "bg-status-occupied-soft", border: "border-table-occupied-border", dot: "bg-status-occupied", label: "Occupied" },
  reserved: { bg: "bg-status-reserved-soft", border: "border-table-reserved-border", dot: "bg-status-reserved", label: "Reserved" },
  dirty: { bg: "bg-status-dirty-soft", border: "border-table-dirty-border", dot: "bg-status-dirty", label: "Needs Cleaning" },
};

export function StatusLegend({ counts }: { counts: Record<string, number> }) {
  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
      {(Object.entries(STATUS_STYLE) as [TableStatus, typeof STATUS_STYLE.available][]).map(([key, s]) => (
        <div key={key} className="flex items-center gap-2">
          <span className={`h-2.5 w-2.5 rounded-sm shrink-0 ${s.dot}`} />
          <span className="text-sm text-muted-foreground">{s.label}</span>
          <span className="font-numeric text-sm font-semibold text-foreground">{counts[key] ?? 0}</span>
        </div>
      ))}
    </div>
  );
}

export function countByStatus(tables: { status: string }[]) {
  const res: Record<string, number> = { available: 0, occupied: 0, reserved: 0, dirty: 0 };
  tables.forEach(t => { res[t.status] = (res[t.status] ?? 0) + 1; });
  return res;
}

// Only "bar"/"patio" have a sign illustration (the design handoff bakes that
// text into the SVG) — other section names (e.g. "Main") render no sign.
const SIGN_ICON: Record<string, typeof BarSignIcon> = {
  bar: BarSignIcon,
  patio: PatioSignIcon,
};

export type SignableTable = { position: { x: number; y: number }; size: { width: number; height: number }; section: string | null };
type SectionSign = { key: string; Icon: typeof BarSignIcon; x: number; y: number };

// Tables sharing a section name aren't necessarily one physical zone (two
// separate "Bar" areas on opposite ends of the floor shouldn't share a sign),
// so cluster by proximity within each section name via union-find before
// placing a sign per cluster.
const CLUSTER_GAP = 150;
const SIGN_SIZE = 56; // matches the h-14/w-14 icon below, in canvas units
const SIGN_GAP = 10;

function bboxGap(a: SignableTable, b: SignableTable) {
  const ax2 = a.position.x + a.size.width, ay2 = a.position.y + a.size.height;
  const bx2 = b.position.x + b.size.width, by2 = b.position.y + b.size.height;
  const dx = Math.max(a.position.x - bx2, b.position.x - ax2, 0);
  const dy = Math.max(a.position.y - by2, b.position.y - ay2, 0);
  return Math.hypot(dx, dy);
}

export function computeSectionSigns(tables: SignableTable[]): SectionSign[] {
  const bySection = new Map<string, SignableTable[]>();
  for (const t of tables) {
    const key = (t.section ?? "").trim().toLowerCase();
    if (!SIGN_ICON[key]) continue;
    (bySection.get(key) ?? bySection.set(key, []).get(key)!).push(t);
  }

  const signs: SectionSign[] = [];
  for (const [key, group] of bySection) {
    const parent = group.map((_, i) => i);
    const find = (i: number): number => (parent[i] === i ? i : (parent[i] = find(parent[i])));
    for (let i = 0; i < group.length; i++) {
      for (let j = i + 1; j < group.length; j++) {
        if (bboxGap(group[i], group[j]) <= CLUSTER_GAP) {
          const ri = find(i), rj = find(j);
          if (ri !== rj) parent[ri] = rj;
        }
      }
    }
    const clusters = new Map<number, SignableTable[]>();
    group.forEach((t, i) => {
      const root = find(i);
      (clusters.get(root) ?? clusters.set(root, []).get(root)!).push(t);
    });
    for (const members of clusters.values()) {
      const minX = Math.min(...members.map(t => t.position.x));
      const maxX = Math.max(...members.map(t => t.position.x + t.size.width));
      const minY = Math.min(...members.map(t => t.position.y));
      // Anchor above the cluster, but clamp to the canvas top edge so a
      // section pinned to the top wall doesn't clip its sign off-screen —
      // it overlaps the tables slightly instead.
      signs.push({ key, Icon: SIGN_ICON[key], x: (minX + maxX) / 2, y: Math.max(0, minY - SIGN_SIZE - SIGN_GAP) });
    }
  }
  return signs;
}

export function SectionSigns({ tables }: { tables: SignableTable[] }) {
  const signs = useMemo(() => computeSectionSigns(tables), [tables]);
  return (
    <>
      {signs.map((s, i) => (
        <div
          key={`${s.key}-${i}`}
          className="absolute pointer-events-none drop-shadow-sm"
          style={{ left: s.x, top: s.y, transform: "translateX(-50%)" }}
        >
          <s.Icon className="h-14 w-14" />
        </div>
      ))}
    </>
  );
}
