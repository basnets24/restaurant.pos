/** Section 06 (Operations) visual — one trace ID continuing across five hops
 * of the fire-to-kitchen workflow: the checkout request through the order
 * saga, across the RabbitMQ bus, into catalog's inventory reservation, back
 * to the order confirmation. Same parchment-field presentation as Payment's
 * diagram (DiagramField), kept in its own file since the node shape (a
 * timeline, not boxes-and-arrows) doesn't share markup with the workflow
 * diagrams.
 *
 * The first hop is deliberately labeled "Checkout request" rather than
 * "Frontend request" — the browser sends no traceparent header (no
 * OpenTelemetry in the frontend), so the trace's root span is created
 * server-side the moment Order service receives the request, not carried
 * from the browser. Verified against a live trace in Jaeger: a real
 * `carts/{id}/checkout` trace shows exactly this shape (18 spans across
 * Order + Catalog, one trace ID, root span = the incoming HTTP request). */

import { DiagramField } from "@/features/landing/components/DiagramField";
import { dashVar } from "@/features/landing/components/dashVar";

const HOPS = [
    { label: "Checkout request", detail: "Trace root" },
    { label: "Order service", detail: "OrderSubmitted" },
    { label: "Event bus", detail: "RabbitMQ · MassTransit" },
    { label: "Catalog service", detail: "ReserveInventory" },
    { label: "Order confirmation", detail: "InventoryReserved" },
];

const TRACE_ID = "4bf92f3577b34da6a3ce929d0e0e4736";

const ARIA_LABEL = "One trace ID continues across five hops: the checkout request (trace root, created on Order service), order service, event bus, catalog service, order confirmation.";

export function OpsTraceTimeline() {
    return (
        <DiagramField animated>
            <div className="mb-5 font-mono text-[11px] text-muted-foreground sm:text-[12px]">
                trace_id=<span className="text-foreground">{TRACE_ID}</span>
            </div>

            {/* Desktop / tablet: one horizontal rail. */}
            <svg viewBox="0 0 940 120" role="img" aria-label={ARIA_LABEL} className="hidden w-full min-w-[700px] sm:block">
                <line className="connector-draw" style={dashVar(780)} x1={80} y1={40} x2={860} y2={40} stroke="var(--border-strong)" strokeWidth="1.5" />
                {HOPS.map((hop, i) => {
                    const x = 80 + i * (780 / (HOPS.length - 1));
                    return (
                        <g key={hop.label}>
                            <circle cx={x} cy={40} r="6" fill="var(--brand)" />
                            <text x={x} y={20} textAnchor="middle" fontSize="14" fontWeight="600" fill="var(--foreground)">{hop.label}</text>
                            <text x={x} y={64} textAnchor="middle" fontSize="11.5" fill="var(--muted-foreground)" className="font-mono">{hop.detail}</text>
                        </g>
                    );
                })}
            </svg>

            {/* Mobile: vertical, same trace order top to bottom. */}
            <div className="flex flex-col gap-4 sm:hidden" role="img" aria-label={ARIA_LABEL}>
                {HOPS.map((hop, i) => (
                    <div key={hop.label} className="flex items-start gap-3">
                        <div className="flex flex-col items-center pt-1">
                            <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-brand" aria-hidden="true" />
                            {i < HOPS.length - 1 && <span className="mt-1 h-8 w-px bg-[var(--border-strong)]" aria-hidden="true" />}
                        </div>
                        <div>
                            <div className="text-sm font-semibold text-foreground">{hop.label}</div>
                            <div className="font-mono text-xs text-muted-foreground">{hop.detail}</div>
                        </div>
                    </div>
                ))}
            </div>
        </DiagramField>
    );
}
