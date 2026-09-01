import { useState } from "react";
import { ArrowDown, ArrowRight, ArrowUpRight } from "lucide-react";
import { cn } from "@/components/ui/utils";
import { SectionHeader } from "@/components/primitives/SectionHeader";

// ─────────────────────────────────────────────────────────────────────────────
// Wired into LandingView between the Demos and Problem sections. Each `src`
// below doesn't exist yet in public/screenshots/ — ScreenshotFrame falls back
// to a plain labeled placeholder (not a fabricated mockup) until the real
// file is dropped in with this exact filename, at which point it swaps in
// automatically with no code change needed.
//
// Two tracks, not one flat sequence: staff run dine-in service end to end
// (floor → ticket → tab), customers place pickup orders through the separate
// guest surface (browse/customize → checkout). Mirrors the Staff Demo /
// Customer Demo choice already on the homepage. Rendered side by side on
// large screens (lg:grid-cols-2) rather than stacked — this section follows
// two full desktop hero compositions plus the mobile pair, so it needs to
// stay compact rather than add another long scroll. Each moment gets one
// screenshot; the before/after two-shot comparison is reserved for the diner
// pair, which is the one place readers specifically responded well to it.
// One annotation per moment, at most, and only for engineering behavior the
// screenshot itself can't show — not a callout diagram.
// ─────────────────────────────────────────────────────────────────────────────

type Moment = {
    step: string;
    title: string;
    subhead: string;
    service: string;
    annotation?: string;
    src: string;
    alt: string;
    aspect: string;
    frameMaxWidth?: string;
};

const STAFF_MOMENTS: Moment[] = [
    {
        step: "01",
        title: "Open the floor",
        subhead: "Manage tables and service from a live floor plan.",
        service: "order service",
        src: "/screenshots/floor-plan.png",
        alt: "Staff floor plan designer showing table layout and live status",
        aspect: "aspect-[16/9]",
    },
    {
        step: "02",
        title: "Fire the ticket",
        subhead: "A ticket is built, then fired to the kitchen. That's the moment it commits.",
        service: "order + catalog services",
        annotation: "Saga begins when ticket is fired",
        src: "/screenshots/order-fired.png",
        alt: "Order ticket after firing, showing Fired confirmation",
        aspect: "aspect-[16/9]",
    },
    {
        step: "03",
        title: "Close the tab",
        subhead: "An embedded Stripe checkout settles the dine-in tab without leaving the staff workflow.",
        service: "payment service",
        annotation: "Payment stays outside the order saga",
        src: "/screenshots/checkout-payment.png",
        alt: "Checkout dialog with embedded Stripe payment element",
        aspect: "aspect-[16/9]",
    },
];

const CUSTOMER_MOMENTS = [
    {
        step: "01",
        title: "Browse & customize",
        subhead: "Customers browse the same restaurant catalog without an account, customize items, and place an order for pickup.",
        service: "catalog service",
        aspect: "aspect-[9/19.5]",
        frameMaxWidth: "max-w-[220px]",
        shots: [
            {
                src: "/screenshots/diner-menu.png",
                alt: "Customer-facing menu on a mobile device",
                label: "Browse the menu",
            },
            {
                src: "/screenshots/diner-customize.png",
                alt: "Item customization screen with modifiers on a mobile device",
                label: "Customize item",
            },
        ],
    },
    {
        step: "02",
        title: "Checkout & pay",
        subhead: "Placing the order reserves inventory and starts fulfillment without a staff hand-off. Payment follows through the same embedded Stripe flow used for dine-in tabs.",
        service: "order + payment services",
        aspect: "aspect-[9/19.5]",
        frameMaxWidth: "max-w-[220px]",
        shots: [
            {
                src: "/screenshots/diner-order-status.png",
                alt: "Diner order status screen showing the order sent to the kitchen",
                label: "Order status",
            },
            {
                src: "/screenshots/diner-payment.png",
                alt: "Diner checkout with embedded Stripe payment element",
                label: "Pay",
            },
        ],
    },
];

function ScreenshotFrame({
    src,
    alt,
    aspect,
    annotation,
    accent = "primary",
}: {
    src: string;
    alt: string;
    aspect: string;
    annotation?: string;
    accent?: "primary" | "fig";
}) {
    const [failed, setFailed] = useState(false);

    return (
        <div className={cn(
            "w-full rounded-xl border p-1.5 shadow-lg shadow-black/10",
            accent === "fig" ? "border-fig-medium/50 bg-fig-base" : "border-[var(--sand-400)]/50 bg-primary",
        )}>
            <div
                className={cn(
                    "relative w-full overflow-hidden rounded-lg bg-muted/40",
                    aspect,
                    failed ? "border border-dashed border-border-strong" : "border border-border",
                )}
            >
                {!failed && (
                    <img
                        src={src}
                        alt={alt}
                        className="w-full h-full object-cover"
                        onError={() => setFailed(true)}
                    />
                )}
                {failed && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 px-6 text-center">
                        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                            Screenshot placeholder
                        </span>
                        <span className="text-xs text-muted-foreground/70 max-w-xs">{alt}</span>
                    </div>
                )}
                {annotation && (
                    <div className="absolute bottom-2 left-2 flex items-center gap-1 rounded-full border border-border bg-card/90 backdrop-blur px-2.5 py-1 text-[11px] font-medium text-foreground shadow-sm">
                        {annotation}
                        <ArrowUpRight className="w-3 h-3 text-primary shrink-0" />
                    </div>
                )}
            </div>
        </div>
    );
}

/** `accent="fig"` is a PROTOTYPE path (see brand.css) used only by the Customer/Pickup
 * track below, so the service label there can be compared directly against the
 * Staff/Dine-in track's olive --primary without touching the shared token. */
function MomentHeading({ m, accent = "primary" }: { m: Pick<Moment, "step" | "title" | "subhead" | "service">; accent?: "primary" | "fig" }) {
    return (
        <div>
            <span className={cn(
                "text-[11px] font-mono",
                accent === "fig" ? "text-fig-medium" : "text-muted-foreground/70",
            )}>
                {m.step} / {m.title.toUpperCase()}
            </span>
            <h3 className="text-base text-foreground mt-1 mb-1.5 leading-snug">{m.subhead}</h3>
            <span className={cn(
                "inline-block text-[11px] font-medium uppercase tracking-wide",
                accent === "fig" ? "text-fig-strong" : "text-primary",
            )}>
                {m.service}
            </span>
        </div>
    );
}

function StaffMoment({ m }: { m: Moment }) {
    return (
        <div>
            <MomentHeading m={m} />
            <div className="mt-3">
                <ScreenshotFrame src={m.src} alt={m.alt} aspect={m.aspect} annotation={m.annotation} />
            </div>
        </div>
    );
}

function CustomerMoment({ m }: { m: (typeof CUSTOMER_MOMENTS)[number] }) {
    return (
        <div>
            <MomentHeading m={m} accent="fig" />
            <div className="mt-3 flex items-center justify-center gap-3">
                {m.shots.map((shot, i) => (
                    <div key={shot.src} className="contents">
                        <div className={cn("w-full flex-1", m.frameMaxWidth)}>
                            <ScreenshotFrame src={shot.src} alt={shot.alt} aspect={m.aspect} accent="fig" />
                            {/* PROTOTYPE: small fig badge in place of the staff track's plain
                                caption text, per the "small badges" accent request — brand.css */}
                            <p className="mt-1.5 flex justify-center">
                                <span className="rounded-full bg-fig-soft px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide text-fig-strong">
                                    {shot.label}
                                </span>
                            </p>
                        </div>
                        {i === 0 && <ArrowRight className="w-4 h-4 text-fig-medium shrink-0" />}
                    </div>
                ))}
            </div>
        </div>
    );
}

function StepConnector({ accent = "primary" }: { accent?: "primary" | "fig" }) {
    return (
        <ArrowDown className={cn(
            "w-3.5 h-3.5 ml-0.5",
            accent === "fig" ? "text-fig-medium/70" : "text-muted-foreground/40",
        )} />
    );
}

export function ProductScreenshots() {
    return (
        <section id="screenshots" className="py-10 lg:py-14 border-t border-border">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
                <SectionHeader
                    variant="editorial"
                    eyebrow="Two Ordering Flows, One Backend"
                    title="Dine in or pick up. One restaurant underneath."
                    description="Staff manage tables, tickets, kitchen fulfillment, and payment for dine-in service. Customers browse the same catalog and place pickup orders through a separate guest experience."
                    className="mb-8"
                    wide
                />

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-0 lg:divide-x lg:divide-border">
                    <div className="lg:pr-8">
                        <span className="block text-xs font-medium tracking-wide uppercase text-primary mb-4">
                            Staff / Dine-in
                        </span>
                        <div className="space-y-3">
                            {STAFF_MOMENTS.map((m, i) => (
                                <div key={m.step}>
                                    {i > 0 && <StepConnector />}
                                    <StaffMoment m={m} />
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* PROTOTYPE: subtle pale-fig panel behind the whole Customer/Pickup
                        subsection, plus fig accents on its labels/arrows/badges below —
                        see brand.css. Kept to a soft tint, not a solid fill, per the "not
                        a full-width section color" guidance from the earlier accent review. */}
                    <div className="rounded-xl bg-fig-soft/40 p-4 sm:p-6 lg:pt-6 lg:pb-6 lg:pr-6 lg:pl-10">
                        <span className="block text-xs font-medium tracking-wide uppercase text-fig-strong mb-4">
                            Customer / Pickup
                        </span>
                        <div className="space-y-3">
                            {CUSTOMER_MOMENTS.map((m, i) => (
                                <div key={m.step}>
                                    {i > 0 && <StepConnector accent="fig" />}
                                    <CustomerMoment m={m} />
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
