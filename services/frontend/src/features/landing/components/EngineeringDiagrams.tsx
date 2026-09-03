/** Diagrams and supporting visuals for the Engineering page's redesigned
 * sections 02-05. Deliberately separate from NarrativeDiagrams.tsx / the
 * System Design diagram (SystemTopologyDiagram.tsx) — that component and its
 * container are locked, so nothing here touches or reuses its internals; a
 * new, lighter parchment field (DiagramField below) replaces the white-card
 * treatment for these smaller, single-claim figures instead. */

import { type CSSProperties, type ReactNode } from "react";
import { useInViewOnce } from "@/hooks/useInViewOnce";

/** Sets the --len custom property a connector-draw path reads its dash length
 * from (see index.css) — typed as CSSProperties since React's style type
 * doesn't otherwise allow arbitrary custom-property keys. */
const dashVar = (len: number): CSSProperties => ({ "--len": len } as CSSProperties);

/** Parchment presentation field for a section's main visual — a step down in
 * contrast from a white --card surface, so the diagram reads as part of the
 * page rather than a floating white panel. Horizontally scrollable on narrow
 * viewports rather than shrunk past legibility. */
export function DiagramField({ children, animated = false }: { children: ReactNode; animated?: boolean }) {
    const { ref, inView } = useInViewOnce<HTMLDivElement>();
    return (
        <div
            ref={animated ? ref : undefined}
            className={`w-full overflow-x-auto rounded-lg border border-border bg-[var(--surface-sunken)]/60 p-5 sm:p-8 ${animated ? "diagram-animated" : ""} ${inView ? "in-view" : ""}`}
        >
            {children}
        </div>
    );
}

/** Narrow monospaced strip beneath a diagram — the full event/transport/state
 * detail moved out of the visual itself so the diagram can stay readable at a
 * glance (see SECTION 02 spec: "don't let infrastructure dominate the
 * workflow"). */
export function AnnotationBar({ rows }: { rows: { label: string; value: string }[] }) {
    return (
        <div className="mt-4 rounded-lg border border-border/70 bg-background/60 px-4 py-3 font-mono text-[12px] leading-relaxed text-muted-foreground sm:text-[13px]">
            {rows.map((r) => (
                <div key={r.label} className="flex flex-col gap-1 sm:flex-row sm:gap-2">
                    <span className="shrink-0 text-foreground/70">{r.label}:</span>
                    <span className="break-words">{r.value}</span>
                </div>
            ))}
        </div>
    );
}

/** Editorial callout with a thin olive left border — for the one architectural
 * statement a section wants to land after its diagram. */
export function Callout({ children }: { children: ReactNode }) {
    return (
        <blockquote className="mt-6 border-l-2 border-brand pl-4 sm:pl-5">
            <p className="font-display text-lg italic leading-snug text-foreground sm:text-xl">{children}</p>
        </blockquote>
    );
}

const arrowDefs = (idPrefix: string) => (
    <defs>
        <marker id={`${idPrefix}-olive`} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto-start-reverse">
            <path d="M0,0 L10,5 L0,10 z" fill="var(--brand)" />
        </marker>
        <marker id={`${idPrefix}-rust`} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto-start-reverse">
            <path d="M0,0 L10,5 L0,10 z" fill="var(--rust-500)" />
        </marker>
        <marker id={`${idPrefix}-muted`} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto-start-reverse">
            <path d="M0,0 L10,5 L0,10 z" fill="var(--muted-foreground)" />
        </marker>
    </defs>
);

interface StageBoxProps {
    x: number; y: number; w: number; h: number;
    title: string; subtitle?: string;
    tone?: "default" | "brand" | "success" | "danger";
}
const STAGE_FILL: Record<NonNullable<StageBoxProps["tone"]>, string> = {
    default: "var(--card)",
    brand: "var(--brand-soft)",
    success: "var(--status-available-soft)",
    danger: "var(--status-occupied-soft)",
};
const STAGE_STROKE: Record<NonNullable<StageBoxProps["tone"]>, string> = {
    default: "var(--fig-base)",
    brand: "var(--brand)",
    success: "var(--status-available)",
    danger: "var(--status-occupied)",
};
const STAGE_TEXT: Record<NonNullable<StageBoxProps["tone"]>, string> = {
    default: "var(--foreground)",
    brand: "var(--brand-strong)",
    success: "var(--forest-600)",
    danger: "var(--rust-600)",
};

function StageBox({ x, y, w, h, title, subtitle, tone = "default" }: StageBoxProps) {
    const cx = x + w / 2;
    return (
        <g>
            <rect x={x} y={y} width={w} height={h} rx="10" fill={STAGE_FILL[tone]} stroke={STAGE_STROKE[tone]} strokeWidth={tone === "default" ? 1 : 1.5} />
            <text x={cx} y={y + h / 2 + (subtitle ? -4 : 5)} textAnchor="middle" fontSize="15" fontWeight="600" fill={STAGE_TEXT[tone]}>
                {title}
            </text>
            {subtitle && (
                <text x={cx} y={y + h / 2 + 15} textAnchor="middle" fontSize="12.5" fill="var(--muted-foreground)">
                    {subtitle}
                </text>
            )}
        </g>
    );
}

function StepNumber({ x, y, text }: { x: number; y: number; text: string }) {
    return (
        <text x={x} y={y} fontSize="12.5" fontWeight="600" fill="var(--muted-foreground)" letterSpacing="0.5" className="font-mono">
            {text}
        </text>
    );
}

function EventLabel({ x, y, text, tone = "brand", size = 11.5 }: { x: number; y: number; text: string; tone?: "brand" | "danger"; size?: number }) {
    const w = text.length * (size * 0.53) + 14;
    return (
        <g>
            <rect x={x - w / 2} y={y - 12} width={w} height={16} fill="var(--surface-sunken)" opacity="0.85" />
            <text x={x} y={y} textAnchor="middle" fontSize={size} fontWeight="500" fill={tone === "danger" ? "var(--rust-600)" : "var(--forest-600)"} className="font-mono">
                {text}
            </text>
        </g>
    );
}

/* -------------------------------------------------------------------------
 * SECTION 02 — Order: Submit -> Reserve -> Confirm/Reject
 * ---------------------------------------------------------------------- */

export function OrderWorkflowDiagram() {
    return (
        <DiagramField animated>
            {/* Desktop / tablet: left-to-right with a branch on the last stage. */}
            <svg
                viewBox="0 0 920 220"
                role="img"
                aria-label="Order Saga submits the order, Catalog reserves inventory, then the saga resolves to Confirmed (fulfillment can proceed) or Rejected (stock is restored)."
                className="hidden w-full min-w-[640px] sm:block"
            >
                {arrowDefs("order-d")}
                <StepNumber x={20} y={30} text="1 — SUBMIT" />
                <StageBox x={20} y={72} w={230} h={80} title="Order Saga" subtitle="Initial" tone="brand" />

                <StepNumber x={345} y={30} text="2 — RESERVE" />
                <StageBox x={345} y={72} w={230} h={80} title="Catalog" subtitle="Reserve inventory" />

                <StepNumber x={670} y={12} text="3 — CONFIRM / REJECT" />

                <line className="connector-draw" style={dashVar(120)} x1={250} y1={112} x2={343} y2={112} stroke="var(--brand)" strokeWidth="2" markerEnd="url(#order-d-olive)" />
                <EventLabel x={297} y={100} text="ReserveInventory" />

                <line className="connector-draw" style={dashVar(160)} x1={575} y1={95} x2={668} y2={58} stroke="var(--brand)" strokeWidth="2" markerEnd="url(#order-d-olive)" />
                <EventLabel x={630} y={68} text="InventoryReserved" />
                <StageBox x={670} y={30} w={230} h={68} title="Confirmed" subtitle="Fulfillment can proceed" tone="success" />

                <line className="connector-draw" style={dashVar(160)} x1={575} y1={129} x2={668} y2={166} stroke="var(--rust-500)" strokeWidth="2" markerEnd="url(#order-d-rust)" />
                <EventLabel x={630} y={155} text="InventoryReserveFaulted" tone="danger" />
                <StageBox x={670} y={138} w={230} h={68} title="Rejected" subtitle="Restore stock" tone="danger" />
            </svg>

            {/* Mobile: same stages, vertical, branches preserved side by side. */}
            <svg
                viewBox="0 0 340 480"
                role="img"
                aria-label="Order Saga submits the order, Catalog reserves inventory, then the saga resolves to Confirmed (fulfillment can proceed) or Rejected (stock is restored)."
                className="w-full sm:hidden"
            >
                {arrowDefs("order-m")}
                <StepNumber x={10} y={20} text="1 — SUBMIT" />
                <StageBox x={10} y={30} w={320} h={68} title="Order Saga" subtitle="Initial" tone="brand" />

                <line className="connector-draw" style={dashVar(60)} x1={170} y1={98} x2={170} y2={148} stroke="var(--brand)" strokeWidth="2" markerEnd="url(#order-m-olive)" />
                <EventLabel x={170} y={126} text="ReserveInventory" />

                <StepNumber x={10} y={170} text="2 — RESERVE" />
                <StageBox x={10} y={180} w={320} h={68} title="Catalog" subtitle="Reserve inventory" />

                <StepNumber x={10} y={278} text="3 — CONFIRM / REJECT" />

                <line className="connector-draw" style={dashVar(60)} x1={110} y1={248} x2={110} y2={296} stroke="var(--brand)" strokeWidth="2" markerEnd="url(#order-m-olive)" />
                <EventLabel x={110} y={274} text="InventoryReserved" size={10} />
                <StageBox x={10} y={300} w={150} h={90} title="Confirmed" subtitle="Fulfillment can proceed" tone="success" />

                <line className="connector-draw" style={dashVar(60)} x1={230} y1={248} x2={230} y2={296} stroke="var(--rust-500)" strokeWidth="2" markerEnd="url(#order-m-rust)" />
                <EventLabel x={230} y={274} text="ReserveFaulted" tone="danger" size={10} />
                <StageBox x={180} y={300} w={150} h={90} title="Rejected" subtitle="Restore stock" tone="danger" />
            </svg>
        </DiagramField>
    );
}

/* -------------------------------------------------------------------------
 * SECTION 03 — Payment: Request -> Checkout -> Verify -> Record
 * ---------------------------------------------------------------------- */

export function PaymentWorkflowDiagram() {
    const stages = [
        { n: "1", label: "REQUEST", title: "Request", subtitle: "PaymentRequested" },
        { n: "2", label: "CHECKOUT", title: "Checkout", subtitle: "Confirmed via Stripe PaymentElement" },
        { n: "3", label: "VERIFY", title: "Verify", subtitle: "Re-checked with Stripe's API" },
        { n: "4", label: "RECORD", title: "Record", subtitle: "PaymentSucceeded / Failed" },
    ];
    return (
        <DiagramField animated>
            <svg
                viewBox="0 0 940 220"
                role="img"
                aria-label="Payment is requested, the diner confirms it in-browser via Stripe's embedded PaymentElement, Spoontab verifies the result directly with Stripe's API (synchronously, not via a webhook), then records PaymentSucceeded or, on a muted failure path, PaymentFailed."
                className="hidden w-full min-w-[700px] sm:block"
            >
                {arrowDefs("pay-d")}
                {stages.map((s, i) => {
                    const x = 20 + i * 232;
                    return (
                        <g key={s.n}>
                            <StepNumber x={x} y={26} text={`${s.n} — ${s.label}`} />
                            <StageBox x={x} y={40} w={196} h={72} title={s.title} subtitle={s.subtitle} tone={i === 3 ? "success" : i === 0 ? "brand" : "default"} />
                            {i < stages.length - 1 && (
                                <line className="connector-draw" style={dashVar(40)} x1={x + 196} y1={76} x2={x + 232} y2={76} stroke="var(--brand)" strokeWidth="2" markerEnd="url(#pay-d-olive)" />
                            )}
                        </g>
                    );
                })}

                <line className="connector-draw" style={dashVar(90)} x1={484} y1={112} x2={484 + 30} y2={168} stroke="var(--rust-500)" strokeWidth="2" markerEnd="url(#pay-d-rust)" />
                <EventLabel x={560} y={158} text="PaymentFailed" tone="danger" />
                <StageBox x={514} y={150} w={196} h={56} title="Not completed" subtitle="Recorded as failed" tone="danger" />
            </svg>

            <svg
                viewBox="0 0 340 620"
                role="img"
                aria-label="Payment is requested, the diner confirms it in-browser via Stripe's embedded PaymentElement, Spoontab verifies the result directly with Stripe's API (synchronously, not via a webhook), then records PaymentSucceeded or, on a muted failure path, PaymentFailed."
                className="w-full sm:hidden"
            >
                {arrowDefs("pay-m")}
                {stages.map((s, i) => {
                    const y = 10 + i * 130;
                    return (
                        <g key={s.n}>
                            <StepNumber x={10} y={y} text={`${s.n} — ${s.label}`} />
                            <StageBox x={10} y={y + 10} w={320} h={72} title={s.title} subtitle={s.subtitle} tone={i === 3 ? "success" : i === 0 ? "brand" : "default"} />
                            {i < stages.length - 1 && (
                                <line className="connector-draw" style={dashVar(40)} x1={170} y1={y + 82} x2={170} y2={y + 122} stroke="var(--brand)" strokeWidth="2" markerEnd="url(#pay-m-olive)" />
                            )}
                            {i === 2 && (
                                <>
                                    <line className="connector-draw" style={dashVar(50)} x1={280} y1={y + 60} x2={310} y2={y + 60} stroke="var(--rust-500)" strokeWidth="1.5" strokeDasharray="4 3" />
                                </>
                            )}
                        </g>
                    );
                })}
                <StageBox x={10} y={540} w={320} h={56} title="Not completed" subtitle="Recorded as failed" tone="danger" />
                <EventLabel x={170} y={528} text="PaymentFailed" tone="danger" />
            </svg>
        </DiagramField>
    );
}

/* -------------------------------------------------------------------------
 * SECTION 04 — Tenancy: containment, not a service network.
 * ---------------------------------------------------------------------- */

const CONTAINMENT_LEVELS = [
    { label: "Tenant", detail: "acme-bistro" },
    { label: "Restaurant", detail: "restaurant record" },
    { label: "Location", detail: "sjc-01" },
    { label: "User request", detail: "identity claims + tenant headers" },
    { label: "Service data", detail: "tenant-scoped query" },
];

export function TenancyContainment() {
    return (
        <div className="w-full rounded-lg border border-border bg-[var(--surface-sunken)]/60 p-5 sm:p-8">
            <div className="mx-auto flex max-w-md flex-col gap-0" role="img" aria-label="Tenant contains Restaurant, which contains Location, which contains the authenticated user request, which resolves to tenant-scoped service data.">
                {CONTAINMENT_LEVELS.map((level, i) => (
                    <div
                        key={level.label}
                        className="rounded-lg border"
                        style={{
                            marginTop: i === 0 ? 0 : -1,
                            padding: `${16 + i * 2}px ${20}px`,
                            borderColor: i === CONTAINMENT_LEVELS.length - 1 ? "var(--brand)" : "var(--border-strong)",
                            background: i === CONTAINMENT_LEVELS.length - 1 ? "var(--brand-soft)" : `color-mix(in srgb, var(--surface) ${100 - i * 12}%, var(--surface-sunken))`,
                            zIndex: CONTAINMENT_LEVELS.length - i,
                            position: "relative",
                        }}
                    >
                        <div className="flex items-baseline justify-between gap-3">
                            <span className={`text-sm font-semibold ${i === CONTAINMENT_LEVELS.length - 1 ? "text-brand-strong" : "text-foreground"}`}>
                                {level.label}
                            </span>
                            <span className="font-mono text-[11px] text-muted-foreground">{level.detail}</span>
                        </div>
                        {i === 0 && <div className="h-2" />}
                    </div>
                ))}
            </div>

            <div className="mt-6 flex flex-wrap items-center justify-center gap-3 font-mono text-[12px]">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-brand/40 bg-brand-soft px-3 py-1 text-brand-strong">
                    <span className="h-1.5 w-1.5 rounded-full bg-brand" aria-hidden="true" />
                    Accepted — tenant matches
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1" style={{ borderColor: "color-mix(in srgb, var(--rust-500) 40%, transparent)", color: "var(--rust-600)" }}>
                    <span className="h-1.5 w-1.5 rounded-full" style={{ background: "var(--rust-500)" }} aria-hidden="true" />
                    Rejected — tenant mismatch
                </span>
            </div>
        </div>
    );
}

/* -------------------------------------------------------------------------
 * SECTION 05 — Operations: one trace across five hops.
 * ---------------------------------------------------------------------- */

const TRACE_HOPS = [
    { label: "Frontend request", span: "12ms" },
    { label: "Order service", span: "34ms" },
    { label: "Event bus", span: "8ms" },
    { label: "Catalog service", span: "21ms" },
    { label: "Order confirmation", span: "6ms" },
];

export function OpsTraceTimeline() {
    return (
        <DiagramField animated>
            <div className="mb-4 font-mono text-[11px] text-muted-foreground sm:text-[12px]">
                trace_id=<span className="text-foreground">4bf92f3577b34da6a3ce929d0e0e4736</span>
            </div>
            <svg
                viewBox="0 0 940 140"
                role="img"
                aria-label="One trace ID continues across five hops: frontend request, order service, event bus, catalog service, order confirmation."
                className="hidden w-full min-w-[700px] sm:block"
            >
                <line x1={30} y1={40} x2={910} y2={40} stroke="var(--border-strong)" strokeWidth="1.5" />
                {TRACE_HOPS.map((hop, i) => {
                    const x = 30 + i * (880 / (TRACE_HOPS.length - 1));
                    return (
                        <g key={hop.label}>
                            <circle cx={x} cy={40} r="6" fill="var(--brand)" />
                            <text x={x} y={22} textAnchor="middle" fontSize="14" fontWeight="600" fill="var(--foreground)">{hop.label}</text>
                            <text x={x} y={64} textAnchor="middle" fontSize="12" fill="var(--muted-foreground)" className="font-mono">{hop.span}</text>
                        </g>
                    );
                })}
            </svg>
            <div className="flex flex-col gap-4 sm:hidden">
                {TRACE_HOPS.map((hop) => (
                    <div key={hop.label} className="flex items-center gap-3">
                        <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-brand" aria-hidden="true" />
                        <span className="flex-1 text-sm font-semibold text-foreground">{hop.label}</span>
                        <span className="font-mono text-xs text-muted-foreground">{hop.span}</span>
                    </div>
                ))}
            </div>
        </DiagramField>
    );
}
