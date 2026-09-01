import type { LucideIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface Label {
    x: number;
    y: number;
    text: string;
    /** Halo rect width in px — sized to the text so it can sit on top of a line/box edge without visually merging into it. */
    w: number;
    anchor?: "start" | "middle" | "end";
    fill?: string;
    weight?: number;
    size?: number;
}

/** Text with an opaque background rect behind it, so a label can sit directly on a
 * line, junction, or box edge (as arrow/edge labels have to) without the line
 * visually running through the letters. */
function HaloLabel({ x, y, text, w, anchor = "middle", fill = "var(--muted-foreground)", weight = 400, size = 11 }: Label) {
    const h = size + 7;
    const rectX = anchor === "middle" ? x - w / 2 : anchor === "end" ? x - w : x;
    return (
        <g>
            <rect x={rectX} y={y - h + 3} width={w} height={h} fill="var(--background)" />
            <text x={x} y={y} textAnchor={anchor} fontSize={size} fontWeight={weight} fill={fill}>{text}</text>
        </g>
    );
}

const SERVICE_COLS = [
    { x: 40, center: 130, name: "Identity" },
    { x: 280, center: 370, name: "Catalog" },
    { x: 520, center: 610, name: "Order" },
    { x: 760, center: 850, name: "Payment" },
];

/** Catalog, Order, and Payment tap into one RabbitMQ rail; Identity does not — it
 * publishes no events, so it gets no tap and no event label. */
const BUS_COLS = SERVICE_COLS.slice(1);

/** One or two representative message names per service, not an exhaustive list —
 * real MassTransit contract names (shared/Messaging.Contracts), not paraphrased
 * categories, so "Reserve · PaymentRequested" can't read as one combined message. */
const BUS_MESSAGES = [
    { center: 370, name: "Catalog", messages: ["MenuItemUpdated", "InventoryItemUpdated"] },
    { center: 610, name: "Order", messages: ["ReserveInventory", "PaymentRequested"] },
    { center: 850, name: "Payment", messages: ["PaymentSucceeded", "PaymentFailed"] },
];

/** Rough halo width for a label at ~10px font — generous enough to never clip,
 * cheap enough that a slightly-oversized background patch is invisible. */
const labelWidth = (text: string) => text.length * 6.3 + 16;

export interface TopologyService {
    name: string;
    icon: LucideIcon;
    description: string;
    tags: string[];
}

export interface SystemTopologyDiagramProps {
    services: TopologyService[];
    /** Name of the currently-hovered service — hovering its box opens that service's
     * detail as a card anchored right under the box, instead of a separate cards
     * section the reader has to scroll to and match up themselves. */
    hovered?: string | null;
    onHoverChange?: (name: string | null) => void;
}

/** viewBox-space -> percentage, so the popover card lands under the right box
 * regardless of how wide the SVG is actually rendered (it scales via viewBox). */
const toPct = (v: number, total: number) => (v / total) * 100;

/** Whole-system topology: the one diagram on the Engineering page that shows how a
 * request actually moves — client to service over HTTP, service to service over the
 * RabbitMQ/MassTransit bus (drawn as a rail with junction taps, not a mesh of
 * diagonals, so no two lines cross), and each service down into its own Postgres
 * schema. The SignalR floor hub is drawn as a separate dashed, one-way push since
 * it's a live broadcast, not a request/response or a bus event — conflating it with
 * either would misrepresent how it actually works. Hovering a service box pops that
 * service's detail card open right under it. */
export function SystemTopologyDiagram({ services = [], hovered, onHoverChange }: SystemTopologyDiagramProps) {
    const hoveredIdx = SERVICE_COLS.findIndex((s) => s.name === hovered);
    const hoveredCol = hoveredIdx >= 0 ? SERVICE_COLS[hoveredIdx] : null;
    const hoveredService = hovered ? services.find((s) => s.name === hovered) : undefined;

    return (
        <figure className="m-0 relative">
            <svg
                viewBox="0 0 980 490"
                role="img"
                aria-label="System topology: the frontend calls all four services over HTTPS; Catalog, Order, and Payment additionally publish and consume events through a RabbitMQ/MassTransit bus while Identity does not; every service writes to its own schema in one PostgreSQL instance; Order also pushes live floor state to the frontend directly over SignalR."
                className="w-full h-auto"
                onClick={() => onHoverChange?.(null)}
            >
                <defs>
                    <marker id="topo-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto-start-reverse">
                        <path d="M0,0 L10,5 L0,10 z" fill="var(--muted-foreground)" />
                    </marker>
                </defs>

                {/* Frontend */}
                <rect x="340" y="16" width="300" height="56" rx="8" fill="var(--card)" stroke="var(--border)" />
                <text x="490" y="40" textAnchor="middle" fontSize="13" fontWeight="600" fill="var(--foreground)">Frontend, React SPA</text>
                <text x="490" y="58" textAnchor="middle" fontSize="11" fill="var(--muted-foreground)">staff POS + pickup ordering</text>

                {/* Fan-out: frontend -> each service, one shared label broken over the lines */}
                {SERVICE_COLS.map((s) => (
                    <line
                        key={s.name}
                        x1={490} y1={74} x2={s.center} y2={138}
                        stroke="var(--muted-foreground)" strokeWidth="1.5"
                        markerEnd="url(#topo-arrow)"
                    />
                ))}
                <HaloLabel x={490} y={106} text="HTTPS · bearer JWT + tenant headers" w={232} />

                {/* Service boxes — hoverable AND tappable/keyboard-focusable, linked to the
                    detail cards rendered below via the same hovered/onHoverChange state, so
                    all three input modes act as one unit. Mouse hover opens on enter, closes
                    on leave; touch/keyboard have no hover, so a click or Enter/Space toggles
                    it open or closed, and clicking anywhere else in the diagram (bubbling up
                    to the svg's own onClick) closes it. */}
                {SERVICE_COLS.map((s) => {
                    const active = hovered === s.name;
                    const service = services.find((sv) => sv.name === s.name);
                    const toggle = () => onHoverChange?.(active ? null : s.name);
                    return (
                        <g
                            key={s.name}
                            role="button"
                            tabIndex={0}
                            aria-expanded={active}
                            aria-label={service ? `${s.name}: ${service.description}` : s.name}
                            onMouseEnter={() => onHoverChange?.(s.name)}
                            onMouseLeave={() => onHoverChange?.(null)}
                            onFocus={() => onHoverChange?.(s.name)}
                            onBlur={() => onHoverChange?.(null)}
                            onClick={(e) => {
                                e.stopPropagation();
                                toggle();
                            }}
                            onKeyDown={(e) => {
                                if (e.key === "Enter" || e.key === " ") {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    toggle();
                                }
                            }}
                            className="cursor-pointer"
                        >
                            {/* Invisible hit area, padded beyond the visible box so the tap
                                target clears ~44px on mobile without enlarging the box itself. */}
                            <rect
                                x={s.x - 8} y={140 - 34} width={196} height={132}
                                fill="transparent" pointerEvents="all"
                            />
                            <rect
                                x={s.x} y="140" width="180" height="64" rx="8"
                                fill={active ? "var(--brand-soft)" : "var(--card)"}
                                stroke={active ? "var(--brand)" : "var(--border)"}
                                strokeWidth={active ? 2 : 1}
                                style={{ transition: "fill 150ms, stroke 150ms" }}
                            />
                            <text x={s.center} y="177" textAnchor="middle" fontSize="14" fontWeight="600" fill={active ? "var(--brand-strong)" : "var(--foreground)"}>{s.name}</text>
                        </g>
                    );
                })}

                {/* Service -> Postgres, drawn first so the bus rail and its junction dots sit on top where they cross */}
                {SERVICE_COLS.map((s) => (
                    <line
                        key={s.name}
                        x1={s.center} y1={204} x2={s.center} y2={418}
                        stroke={hovered === s.name ? "var(--brand)" : "var(--muted-foreground)"}
                        strokeWidth={hovered === s.name ? 2 : 1.5}
                        markerEnd="url(#topo-arrow)"
                        style={{ transition: "stroke 150ms" }}
                    />
                ))}

                {/* RabbitMQ: a solid, labeled component the Catalog/Order/Payment lines visibly
                    pass through — not a bare rail, which read as a shared data line rather
                    than a broker. The box's own fill occludes the line segment behind it, so
                    each line appears to enter the bus and exit the other side toward Postgres,
                    with a port dot marking exactly where it taps in. Identity has no dot: it
                    publishes no events. */}
                <rect x="330" y="248" width="560" height="46" rx="23" fill="var(--brand-soft)" stroke="var(--brand)" strokeWidth="2" />
                <text x={610} y={266} textAnchor="middle" fontSize="13" fontWeight="700" fill="var(--brand-strong)">RabbitMQ · MassTransit</text>
                <text x={610} y={282} textAnchor="middle" fontSize="9.5" fontWeight="600" letterSpacing="1" fill="var(--brand-strong)">EVENT BUS</text>
                {BUS_COLS.map((s) => (
                    <circle key={s.name} cx={s.center} cy="248" r={hovered === s.name ? 6 : 4.5} fill="var(--card)" stroke="var(--brand)" strokeWidth="2" style={{ transition: "r 150ms" }} />
                ))}

                {/* Real contract names, not paraphrased categories, tethered to the bus by a
                    short stub off each port dot's own connector — so the message group
                    reads as hanging off that tap, not as a caption floating nearby. No
                    per-column service name here: it's directly under that service's own
                    box already, repeating it would be redundant. */}
                {BUS_MESSAGES.map((b) => (
                    <g key={b.center}>
                        <line x1={b.center} y1={294} x2={b.center} y2={310} stroke="var(--brand)" strokeWidth="2" />
                        {b.messages.map((msg, i) => (
                            <HaloLabel key={msg} x={b.center} y={326 + i * 20} text={msg} w={labelWidth(msg)} size={10} weight={500} />
                        ))}
                    </g>
                ))}

                {/* Postgres */}
                <rect x="40" y="420" width="900" height="50" rx="8" fill="var(--card)" stroke="var(--border)" />
                <text x="490" y="441" textAnchor="middle" fontSize="13" fontWeight="600" fill="var(--foreground)">PostgreSQL</text>
                <text x="490" y="457" textAnchor="middle" fontSize="11" fill="var(--muted-foreground)">one instance, a separate schema per service</text>

                {/* SignalR: Order pushes live floor state straight to the frontend, bypassing the bus entirely */}
                <path
                    d="M 690 148 C 810 95, 700 42, 646 46"
                    fill="none" stroke="var(--brand-accent)" strokeWidth="1.5" strokeDasharray="5 4"
                    markerEnd="url(#topo-arrow)"
                />
                <HaloLabel x={800} y={88} text="SignalR · live floor state" w={labelWidth("SignalR · live floor state")} fill="var(--clay-600)" />
            </svg>

            {hoveredCol && hoveredService && (
                <div
                    className="absolute z-10 w-72 rounded-lg border border-brand bg-card shadow-lg p-4 pointer-events-none"
                    style={{
                        left: `${toPct(hoveredCol.center, 980)}%`,
                        top: `${toPct(204, 490)}%`,
                        transform:
                            hoveredIdx === 0 ? "translate(0%, 10px)"
                                : hoveredIdx === SERVICE_COLS.length - 1 ? "translate(-100%, 10px)"
                                    : "translate(-50%, 10px)",
                    }}
                >
                    <div className="flex items-center gap-2.5 mb-2">
                        <div className="w-8 h-8 shrink-0 rounded-md bg-brand-soft flex items-center justify-center">
                            <hoveredService.icon className="w-4 h-4 text-brand-strong" />
                        </div>
                        <h3 className="text-sm font-semibold text-foreground">{hoveredService.name}</h3>
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed mb-3">{hoveredService.description}</p>
                    <div className="flex flex-wrap gap-1.5">
                        {hoveredService.tags.map((t) => (
                            <Badge key={t} variant="outline" className="text-xs">{t}</Badge>
                        ))}
                    </div>
                </div>
            )}

            <figcaption className="mt-3 text-sm text-muted-foreground leading-relaxed">
                Service boundaries follow domain ownership rather than request flow. Catalog owns what can be ordered, Order owns fulfillment, Payment owns Stripe state, and Identity establishes who is acting and for which restaurant.
            </figcaption>
        </figure>
    );
}
