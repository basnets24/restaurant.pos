/** Small, single-claim diagrams for the Engineering page's narrative sections (02-06).
 * Each is a linear flow at a fixed viewBox, styled consistently with
 * SystemTopologyDiagram (currentColor-free, CSS-var themed, arrow marker, halo
 * labels only where text sits on top of a line). Kept intentionally simple —
 * one mechanism per figure, not a restatement of the whole system. */

import { useEffect, useRef, useState, type ReactNode } from "react";
import { ArrowRight } from "lucide-react";

/** Horizontal-scroll wrapper for diagrams too wide to shrink to a legible size on
 * a narrow viewport (see the min-width floors below). Shows a right-edge fade +
 * arrow hint only while there's more to scroll to — native scrollbars are
 * invisible by default on iOS/touch until mid-drag, so without this a clipped
 * diagram gives no sign it's scrollable at all. Shared with SystemTopologyDiagram. */
export function DiagramScrollArea({ children }: { children: ReactNode }) {
    const scrollRef = useRef<HTMLDivElement>(null);
    const [canScroll, setCanScroll] = useState(false);

    useEffect(() => {
        const el = scrollRef.current;
        if (!el) return;
        const update = () => setCanScroll(el.scrollWidth - el.clientWidth - el.scrollLeft > 4);
        update();
        el.addEventListener("scroll", update);
        const ro = new ResizeObserver(update);
        ro.observe(el);
        return () => {
            el.removeEventListener("scroll", update);
            ro.disconnect();
        };
    }, []);

    return (
        <div className="relative mx-auto w-full max-w-3xl rounded-lg border border-border bg-card">
            <div ref={scrollRef} className="overflow-x-auto p-4 sm:p-6">
                {children}
            </div>
            {canScroll && (
                <div
                    className="pointer-events-none absolute inset-y-0 right-0 w-10 flex items-center justify-end rounded-r-lg bg-gradient-to-l from-card to-transparent"
                    aria-hidden="true"
                >
                    <ArrowRight className="w-3.5 h-3.5 text-muted-foreground mr-1" />
                </div>
            )}
        </div>
    );
}

interface Box {
    x: number;
    y: number;
    w: number;
    h: number;
    title: string;
    subtitle?: string;
    tone?: "default" | "brand" | "success" | "danger" | "fig";
}

/** "fig" (--fig-strong/base/soft, brand.css) marks diner/customer-facing steps,
 * used only by PaymentTriggerDiagram below — everywhere else in these diagrams
 * (OrderSagaDiagram, etc) is staff/system-side and stays on the brand tone. */
const TONE_FILL: Record<NonNullable<Box["tone"]>, string> = {
    default: "var(--card)",
    brand: "var(--brand-soft)",
    success: "var(--status-available-soft)",
    danger: "var(--status-occupied-soft)",
    fig: "var(--fig-soft)",
};
const TONE_STROKE: Record<NonNullable<Box["tone"]>, string> = {
    default: "var(--fig-base)",
    brand: "var(--brand)",
    success: "var(--status-available)",
    danger: "var(--status-occupied)",
    fig: "var(--fig-base)",
};
const TONE_TEXT: Record<NonNullable<Box["tone"]>, string> = {
    default: "var(--foreground)",
    brand: "var(--brand-strong)",
    success: "var(--forest-600)",
    danger: "var(--rust-600)",
    fig: "var(--fig-strong)",
};

function FlowBox({ x, y, w, h, title, subtitle, tone = "default" }: Box) {
    const cx = x + w / 2;
    return (
        <g>
            <rect x={x} y={y} width={w} height={h} rx="8" fill={TONE_FILL[tone]} stroke={TONE_STROKE[tone]} strokeWidth={tone === "default" ? 1 : 1.5} />
            <text x={cx} y={y + h / 2 + (subtitle ? -3 : 4)} textAnchor="middle" fontSize="12.5" fontWeight="600" fill={TONE_TEXT[tone]}>
                {title}
            </text>
            {subtitle && (
                <text x={cx} y={y + h / 2 + 13} textAnchor="middle" fontSize="10" fill="var(--muted-foreground)">
                    {subtitle}
                </text>
            )}
        </g>
    );
}

const defs = (
    <defs>
        <marker id="narr-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M0,0 L10,5 L0,10 z" fill="var(--muted-foreground)" />
        </marker>
    </defs>
);

/** Text with an opaque background rect, so an event-name label can sit directly on
 * top of a crossing line without the line visually running through the letters —
 * same trick as SystemTopologyDiagram's HaloLabel, kept local since only the
 * cross-service diagrams here need it. */
function HaloLabel({ x, y, text, anchor = "middle", fill = "var(--muted-foreground)", weight = 500, size = 10.5 }: {
    x: number; y: number; text: string; anchor?: "start" | "middle" | "end"; fill?: string; weight?: number; size?: number;
}) {
    const w = text.length * 6 + 14;
    const h = size + 7;
    const rectX = anchor === "middle" ? x - w / 2 : anchor === "end" ? x - w : x;
    return (
        <g>
            <rect x={rectX} y={y - h + 3} width={w} height={h} fill="var(--background)" />
            <text x={x} y={y} textAnchor={anchor} fontSize={size} fontWeight={weight} fill={fill}>{text}</text>
        </g>
    );
}

/** 02 — Order and Catalog straddle the same RabbitMQ/MassTransit band from the
 * system diagram: ReserveInventory crosses right, InventoryReserved/Faulted cross
 * back, and the saga's own state sits in the left column next to it. */
export function OrderSagaDiagram() {
    const busX1 = 380, busX2 = 520;
    return (
        <figure className="m-0">
          <DiagramScrollArea>
            <svg viewBox="0 0 900 330" role="img" aria-label="The order saga sends ReserveInventory across the RabbitMQ bus to catalog, which decrements stock and returns either InventoryReserved or InventoryReserveFaulted; the saga resolves to Confirmed or Rejected accordingly." className="w-full h-auto min-w-[640px]">
                {defs}

                <text x="20" y="20" fontSize="10.5" fontWeight="700" letterSpacing="1" fill="var(--muted-foreground)">ORDER</text>
                <text x="880" y="20" textAnchor="end" fontSize="10.5" fontWeight="700" letterSpacing="1" fill="var(--muted-foreground)">CATALOG</text>

                {/* forward + return lines, drawn before the bus band so it occludes the crossing segment */}
                <line x1={210} y1={58} x2={690} y2={58} stroke="var(--muted-foreground)" strokeWidth="1.5" markerEnd="url(#narr-arrow)" />
                <line x1={670} y1={170} x2={210} y2={200} stroke="var(--status-available)" strokeWidth="1.5" markerEnd="url(#narr-arrow)" />
                <line x1={670} y1={234} x2={210} y2={210} stroke="var(--status-occupied)" strokeWidth="1.5" markerEnd="url(#narr-arrow)" />

                <rect x={busX1} y="10" width={busX2 - busX1} height="300" rx="16" fill="var(--brand-soft)" stroke="var(--brand)" strokeWidth="2" />
                <text x={(busX1 + busX2) / 2} y="150" textAnchor="middle" fontSize="11.5" fontWeight="700" fill="var(--brand-strong)">RabbitMQ</text>
                <text x={(busX1 + busX2) / 2} y="165" textAnchor="middle" fontSize="9" fontWeight="600" letterSpacing="1" fill="var(--brand-strong)">MASSTRANSIT</text>
                <circle cx={busX1} cy={58} r="4" fill="var(--card)" stroke="var(--brand)" strokeWidth="2" />
                <circle cx={busX2} cy={58} r="4" fill="var(--card)" stroke="var(--brand)" strokeWidth="2" />

                <HaloLabel x={295} y={48} text="ReserveInventory" />
                <HaloLabel x={295} y={188} text="InventoryReserved" fill="var(--forest-600)" />
                <HaloLabel x={295} y={222} text="InventoryReserveFaulted" fill="var(--rust-600)" />

                {/* order column */}
                <FlowBox x={20} y={30} w={190} h={56} title="Order Saga" subtitle="Initial" tone="brand" />
                <FlowBox x={20} y={175} w={190} h={56} title="Order Saga" subtitle="InventoryPending" tone="brand" />
                <line x1={115} y1={231} x2={57} y2={260} stroke="var(--muted-foreground)" strokeWidth="1.5" markerEnd="url(#narr-arrow)" />
                <line x1={115} y1={231} x2={162} y2={260} stroke="var(--muted-foreground)" strokeWidth="1.5" markerEnd="url(#narr-arrow)" />
                <FlowBox x={10} y={264} w={95} h={44} title="Confirmed" tone="success" />
                <FlowBox x={115} y={264} w={95} h={44} title="Rejected" tone="danger" />

                {/* catalog column */}
                <FlowBox x={690} y={30} w={190} h={56} title="Reserve inventory" />
                <line x1={785} y1={86} x2={785} y2={148} stroke="var(--muted-foreground)" strokeWidth="1.5" markerEnd="url(#narr-arrow)" />
                <FlowBox x={670} y={150} w={230} h={40} title="success" tone="success" />
                <FlowBox x={670} y={214} w={230} h={40} title="failure → restore stock" tone="danger" />
            </svg>
          </DiagramScrollArea>
        </figure>
    );
}

/** 03 — deliberately tiny: this section isn't the centerpiece, so the diagram is
 * just the one fact that matters — two triggers, one shared path from there on. */
export function PaymentTriggerDiagram() {
    return (
        <figure className="m-0">
          <DiagramScrollArea>
            <svg viewBox="0 0 900 160" role="img" aria-label="Pickup and dine-in both feed the same PaymentRequested event, which goes to the Payment service and then Stripe." className="w-full h-auto min-w-[640px]">
                {defs}
                {/* fig marks the customer/diner-only step (Pickup), matching the fig=customer
                 * / olive=staff split used on the landing page's Customer Demo card and
                 * walkthrough. Dine-in is staff-triggered, so it keeps the brand tone;
                 * PaymentRequested is the shared merge point both flows feed into, so it
                 * stays neutral rather than reading as customer-only. */}
                <FlowBox x={20} y={20} w={150} h={44} title="Pickup" tone="fig" />
                <FlowBox x={20} y={96} w={150} h={44} title="Dine-in" tone="brand" />
                <line x1={170} y1={42} x2={230} y2={80} stroke="var(--muted-foreground)" strokeWidth="1.5" />
                <line x1={170} y1={118} x2={230} y2={80} stroke="var(--muted-foreground)" strokeWidth="1.5" />
                <line x1={230} y1={80} x2={260} y2={80} stroke="var(--muted-foreground)" strokeWidth="1.5" markerEnd="url(#narr-arrow)" />

                <FlowBox x={262} y={58} w={210} h={44} title="PaymentRequested" tone="default" />
                <line x1={472} y1={80} x2={508} y2={80} stroke="var(--muted-foreground)" strokeWidth="1.5" markerEnd="url(#narr-arrow)" />
                <FlowBox x={510} y={58} w={180} h={44} title="Payment Service" />
                <line x1={690} y1={80} x2={726} y2={80} stroke="var(--muted-foreground)" strokeWidth="1.5" markerEnd="url(#narr-arrow)" />
                <FlowBox x={728} y={58} w={150} h={44} title="Stripe" />
            </svg>
          </DiagramScrollArea>
        </figure>
    );
}

/** 04 — the POS reads a folded projection instead of calling catalog live. */
export function ReadModelDiagram() {
    return (
        <figure className="m-0">
          <DiagramScrollArea>
            <svg viewBox="0 0 900 200" role="img" aria-label="MenuItemUpdated and InventoryItemUpdated events feed a projector that upserts a Postgres read model at write time; the POS screen reads that local table directly, with no live call to catalog." className="w-full h-auto min-w-[640px]">
                {defs}
                <FlowBox x={30} y={10} w={210} h={50} title="MenuItemUpdated" subtitle="catalog event" />
                <FlowBox x={30} y={78} w={210} h={50} title="InventoryItemUpdated" subtitle="catalog event" />
                <FlowBox x={340} y={44} w={210} h={56} title="ORDER READ MODEL" subtitle="menu + availability" tone="brand" />
                <FlowBox x={650} y={44} w={220} h={56} title="Postgres read model" subtitle="one row per menu item" />
                <line x1={240} y1={35} x2={338} y2={62} stroke="var(--muted-foreground)" strokeWidth="1.5" markerEnd="url(#narr-arrow)" />
                <line x1={240} y1={103} x2={338} y2={76} stroke="var(--muted-foreground)" strokeWidth="1.5" markerEnd="url(#narr-arrow)" />
                <line x1={550} y1={72} x2={648} y2={72} stroke="var(--muted-foreground)" strokeWidth="1.5" markerEnd="url(#narr-arrow)" />
                <line x1={760} y1={100} x2={760} y2={150} stroke="var(--brand)" strokeWidth="1.5" markerEnd="url(#narr-arrow)" />
                <text x="760" y="168" textAnchor="middle" fontSize="11" fill="var(--brand-strong)" fontWeight="600">POS reads this table</text>
                <text x="760" y="184" textAnchor="middle" fontSize="10" fill="var(--muted-foreground)">no live call to catalog</text>
            </svg>
          </DiagramScrollArea>
        </figure>
    );
}
