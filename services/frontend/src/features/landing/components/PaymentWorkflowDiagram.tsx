/** Section 03 (Payment) visual — a left-to-right Request -> Checkout -> Verify
 * -> Record sequence with a muted failure branch. Deliberately separate from
 * NarrativeDiagrams.tsx / SystemTopologyDiagram.tsx (the System Design
 * diagram, locked and untouched) rather than extending either: this is a new,
 * lighter "parchment field" presentation being rolled out section by section,
 * not a restyle of the existing diagram set. */

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

function EventLabel({ x, y, text, tone = "brand" }: { x: number; y: number; text: string; tone?: "brand" | "danger" }) {
    const w = text.length * 6.1 + 14;
    return (
        <g>
            <rect x={x - w / 2} y={y - 12} width={w} height={16} fill="var(--surface-sunken)" opacity="0.85" />
            <text x={x} y={y} textAnchor="middle" fontSize="11.5" fontWeight="500" fill={tone === "danger" ? "var(--rust-600)" : "var(--forest-600)"} className="font-mono">
                {text}
            </text>
        </g>
    );
}

const STAGES = [
    { n: "1", label: "REQUEST", title: "Request", subtitle: "PaymentRequested" },
    { n: "2", label: "CHECKOUT", title: "Checkout", subtitle: "Confirmed in-browser" },
    { n: "3", label: "VERIFY", title: "Verify", subtitle: "Verified with Stripe" },
    { n: "4", label: "RECORD", title: "Record", subtitle: "Succeeded / Failed" },
];

const ARIA_LABEL = "Payment is requested, the diner confirms it in-browser via Stripe's embedded PaymentElement, Spoontab verifies the result directly with Stripe's API (synchronously, not via a webhook), then records PaymentSucceeded or, on a muted failure path, PaymentFailed.";

export function PaymentWorkflowDiagram() {
    return (
        <DiagramField animated>
            {/* Desktop / tablet: left-to-right. */}
            <svg
                viewBox="0 0 940 220"
                role="img"
                aria-label={ARIA_LABEL}
                className="hidden w-full min-w-[700px] sm:block"
            >
                {arrowDefs("pay-d")}
                {STAGES.map((s, i) => {
                    const x = 20 + i * 232;
                    return (
                        <g key={s.n}>
                            <StepNumber x={x} y={26} text={`${s.n} — ${s.label}`} />
                            <StageBox x={x} y={40} w={196} h={72} title={s.title} subtitle={s.subtitle} tone={i === 3 ? "success" : i === 0 ? "brand" : "default"} />
                            {i < STAGES.length - 1 && (
                                <line className="connector-draw" style={dashVar(40)} x1={x + 196} y1={76} x2={x + 232} y2={76} stroke="var(--brand)" strokeWidth="2" markerEnd="url(#pay-d-olive)" />
                            )}
                        </g>
                    );
                })}

                <line className="connector-draw" style={dashVar(90)} x1={484} y1={112} x2={514} y2={168} stroke="var(--rust-500)" strokeWidth="2" markerEnd="url(#pay-d-rust)" />
                <EventLabel x={560} y={158} text="PaymentFailed" tone="danger" />
                <StageBox x={514} y={150} w={196} h={56} title="Not completed" subtitle="Recorded as failed" tone="danger" />
            </svg>

            {/* Mobile: same stages, vertical. */}
            <svg
                viewBox="0 0 340 620"
                role="img"
                aria-label={ARIA_LABEL}
                className="w-full sm:hidden"
            >
                {arrowDefs("pay-m")}
                {STAGES.map((s, i) => {
                    const y = 10 + i * 130;
                    return (
                        <g key={s.n}>
                            <StepNumber x={10} y={y} text={`${s.n} — ${s.label}`} />
                            <StageBox x={10} y={y + 10} w={320} h={72} title={s.title} subtitle={s.subtitle} tone={i === 3 ? "success" : i === 0 ? "brand" : "default"} />
                            {i < STAGES.length - 1 && (
                                <line className="connector-draw" style={dashVar(40)} x1={170} y1={y + 82} x2={170} y2={y + 122} stroke="var(--brand)" strokeWidth="2" markerEnd="url(#pay-m-olive)" />
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
