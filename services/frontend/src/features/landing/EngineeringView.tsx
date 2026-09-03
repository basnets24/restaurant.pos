import { useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
    ArrowLeft, ArrowRight, ExternalLink, Users, UtensilsCrossed, ShoppingCart, CreditCard,
    Layers, ShieldCheck, Activity, RotateCw, Zap, KeyRound, Repeat2, Link as LinkIcon,
} from "lucide-react";
import { GithubIcon } from "@/components/brand-icons/github-icon";
import { AppFooter } from "@/components/AppFooter";
import { SystemTopologyDiagram } from "@/features/landing/components/SystemTopologyDiagram";
import { ChapterNav, type Chapter } from "@/features/landing/components/ChapterNav";
import { HeroReceipt } from "@/features/landing/components/HeroReceipt";
import {
    OrderWorkflowDiagram, PaymentWorkflowDiagram, TenancyContainment, OpsTraceTimeline,
    AnnotationBar, Callout,
} from "@/features/landing/components/EngineeringDiagrams";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";

const GITHUB_URL = "https://github.com/basnets24/restaurant.pos";

const SERVICES = [
    {
        icon: Users, name: "Identity", tags: ["Duende IdentityServer", "OAuth2/OIDC"],
        description: "Authentication, roles, restaurant/location membership, tenant context.",
    },
    {
        icon: UtensilsCrossed, name: "Catalog", tags: ["EF Core", "Event publisher"],
        description: "Menu, modifiers, inventory, and published catalog events.",
    },
    {
        icon: ShoppingCart, name: "Order", tags: ["MassTransit saga", "SignalR"],
        description: "Dine-in tables, carts, fulfillment saga, POS read model, SignalR state.",
    },
    {
        icon: CreditCard, name: "Payment", tags: ["Stripe PaymentIntents"],
        description: "Stripe PaymentIntents and payment verification.",
    },
];

const CHAPTERS: Chapter[] = [
    { id: "system", number: "01", label: "System" },
    { id: "order", number: "02", label: "Order" },
    { id: "payment", number: "03", label: "Payment" },
    { id: "tenancy", number: "04", label: "Tenancy" },
    { id: "operations", number: "05", label: "Operations" },
];

const EVIDENCE = [
    { icon: Layers, title: "4 independently deployed services", copy: "Each service owns its schema and release cadence." },
    { icon: ShieldCheck, title: "Tenant-scoped data", copy: "Restaurant and location context is enforced throughout the request." },
    { icon: Activity, title: "OpenTelemetry traces", copy: "Requests and events remain visible across service boundaries." },
    { icon: RotateCw, title: "Idempotent consumers", copy: "Repeated delivery can be processed safely." },
];

const OPS_PROOF = [
    { title: "Structured logs", copy: "Searchable events with consistent context." },
    { title: "Distributed traces", copy: "End-to-end visibility across service boundaries." },
    { title: "Health checks", copy: "Deployment and dependency readiness." },
    { title: "Correlated events", copy: "Requests and asynchronous messages share trace context." },
];

const PAYMENT_ANNOTATIONS = [
    { icon: KeyRound, text: "Server re-verifies with Stripe, never trusts the browser" },
    { icon: Repeat2, text: "Idempotent PaymentRequested handling" },
    { icon: ShieldCheck, text: "Payment state owned by the Payment service" },
    { icon: Zap, text: "Synchronous confirmation, no webhook" },
];

/** Small "#id" permalink that appears on hover/focus of its heading — an
 * unobtrusive way to satisfy "add anchor links to section headings" without
 * hiding the link behind hover as the *only* way to reach it: it's a real
 * anchor in the DOM, just visually quiet until you're near it. */
function AnchorHeading({ id, children, className }: { id: string; children: ReactNode; className: string }) {
    return (
        <h2 id={id} className={`group scroll-mt-24 ${className}`}>
            <a href={`#${id}`} className="inline-flex items-center gap-2 no-underline hover:no-underline">
                {children}
                <LinkIcon
                    aria-hidden="true"
                    className="h-[0.55em] w-[0.55em] shrink-0 self-center text-muted-foreground opacity-0 transition-opacity duration-150 group-hover:opacity-60 group-focus-visible:opacity-60"
                />
            </a>
        </h2>
    );
}

interface SectionIntroProps {
    id: string;
    number: string;
    eyebrow: string;
    headline: string;
    intro?: ReactNode;
    children: ReactNode;
    interpretation?: ReactNode;
    tone?: "cream" | "parchment";
}

/** Every engineering section shares one opening structure — numbered eyebrow,
 * headline, 40px rule, one plain-language paragraph, the main visual, then a
 * short interpretation — so a reader can predict where the "why" sits before
 * they even reach the diagram. */
function EngineeringSection({ id, number, eyebrow, headline, intro, children, interpretation, tone = "cream" }: SectionIntroProps) {
    return (
        <section
            id={id}
            className={`scroll-mt-16 py-14 sm:py-[72px] lg:py-24 ${tone === "parchment" ? "bg-[var(--surface-sunken)]/50" : "bg-background"}`}
        >
            <div className="mx-auto max-w-[1200px] px-5 sm:px-8 lg:px-16">
                <span className="mb-4 block font-mono text-[13px] uppercase tracking-[0.08em] text-brand-strong sm:text-sm">
                    {number} / {eyebrow}
                </span>
                <AnchorHeading id={`${id}-heading`} className="max-w-3xl font-display text-[32px] leading-[1.1] text-foreground sm:text-[42px] lg:text-[52px]">
                    {headline}
                </AnchorHeading>
                <div className="mb-6 mt-4 h-[3px] w-10" style={{ background: "var(--ochre-500)" }} />
                {intro && (
                    <p className="mb-9 max-w-[760px] text-[20px] leading-relaxed text-muted-foreground sm:text-[22px] sm:mb-10">
                        {intro}
                    </p>
                )}
                {children}
                {interpretation && (
                    <div className="mt-7 max-w-[760px] sm:mt-9">
                        {interpretation}
                    </div>
                )}
            </div>
        </section>
    );
}

export default function EngineeringView() {
    useDocumentTitle("Engineering · Spoontab");
    const [hoveredService, setHoveredService] = useState<string | null>(null);

    return (
        <div className="min-h-screen bg-background">
            {/* HERO */}
            <section className="relative overflow-hidden bg-background texture-paper">
                <div className="relative mx-auto max-w-[1200px] px-5 pb-14 pt-6 sm:px-8 sm:pt-8 lg:px-16">
                    <div className="mb-10 flex items-center justify-between lg:mb-14">
                        <Link to="/" className="font-display text-2xl text-foreground sm:text-3xl">Spoontab</Link>
                        <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground">
                            <ArrowLeft className="h-3.5 w-3.5" />
                            Back to site
                        </Link>
                    </div>

                    <div className="grid items-center gap-10 lg:grid-cols-12 lg:gap-8 lg:min-h-[560px]">
                        <div className="lg:col-span-7">
                            <span className="mb-4 block font-mono text-[13px] uppercase tracking-[0.08em] text-muted-foreground sm:text-sm">
                                Engineering Spoontab
                            </span>
                            <h1 className="mb-4 font-display text-[44px] leading-[1.02] text-foreground sm:text-[64px] lg:text-[88px]">
                                Behind the ticket.
                            </h1>
                            <div className="mb-6 h-[3px] w-10" style={{ background: "var(--ochre-500)" }} />
                            <p className="mb-4 max-w-[650px] text-[22px] leading-relaxed text-muted-foreground sm:text-[24px]">
                                How Spoontab coordinates ordering, fulfillment, payment, and tenant-scoped data across four independently deployed services.
                            </p>
                            <p className="mb-9 font-mono text-sm tracking-wide text-muted-foreground">
                                Event-driven · Multi-tenant · Observable · Deployed
                            </p>
                            <div className="flex flex-wrap gap-4">
                                <Button size="lg" asChild className="h-auto rounded-md px-7 py-3.5 text-base transition-colors duration-150">
                                    <a href="#system">Read the architecture</a>
                                </Button>
                                <Button
                                    variant="outline"
                                    size="lg"
                                    asChild
                                    className="h-auto rounded-md border px-7 py-3.5 text-base text-foreground transition-colors duration-150 hover:bg-transparent hover:border-brand hover:text-brand-strong"
                                >
                                    <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer">
                                        View source
                                        <ExternalLink className="ml-1 h-4 w-4" />
                                    </a>
                                </Button>
                            </div>
                        </div>

                        <div className="lg:col-span-5">
                            <HeroReceipt />
                        </div>
                    </div>
                </div>
            </section>

            <ChapterNav chapters={CHAPTERS} />

            {/* 01 — SYSTEM. Locked component: SystemTopologyDiagram and its surrounding
                DiagramScrollArea are left completely untouched below, including their
                interactions, colors, and responsive behavior. Only the outer section
                chrome (spacing, eyebrow/heading treatment) follows the shared pattern. */}
            <EngineeringSection
                id="system"
                number="01"
                eyebrow="The System"
                headline="Four services, four ownership boundaries."
                interpretation={
                    <div className="border-l-2 border-brand/40 pl-4">
                        <span className="mb-1 block font-mono text-[11px] uppercase tracking-wide text-brand-strong/80">
                            Architectural Rule
                        </span>
                        <p className="text-sm leading-relaxed text-muted-foreground">
                            A service may consume another service's events, but it never reaches into another service's schema.
                        </p>
                    </div>
                }
            >
                <SystemTopologyDiagram services={SERVICES} hovered={hoveredService} onHoverChange={setHoveredService} />
            </EngineeringSection>

            {/* 02 — ORDER */}
            <EngineeringSection
                id="order"
                number="02"
                eyebrow="The Order"
                headline="One ticket. Three possible outcomes."
                intro={<><code>OrderSubmitted</code> begins the fulfillment workflow. Catalog reserves inventory before the order can be confirmed.</>}
                tone="parchment"
                interpretation={
                    <p className="text-[15px] leading-relaxed text-muted-foreground sm:text-base">
                        The saga has one job: resolve inventory reservation to <code>Confirmed</code> or <code>Rejected</code>. Payment is not part of its state machine.
                    </p>
                }
            >
                <OrderWorkflowDiagram />
                <AnnotationBar
                    rows={[
                        { label: "Events", value: "OrderSubmitted · ReserveInventory · InventoryReserved · InventoryReserveFaulted" },
                        { label: "Transport", value: "RabbitMQ" },
                        { label: "State", value: "MassTransit saga" },
                    ]}
                />
            </EngineeringSection>

            {/* EVIDENCE STRIP */}
            <section className="border-y border-border bg-background py-10 sm:py-12">
                <div className="mx-auto max-w-[1200px] px-5 sm:px-8 lg:px-16">
                    <div className="grid grid-cols-1 divide-y divide-border sm:grid-cols-2 sm:divide-y-0 sm:divide-x lg:grid-cols-4">
                        {EVIDENCE.map((e) => (
                            <div key={e.title} className="flex flex-col gap-2 py-6 first:pt-0 sm:px-6 sm:py-0 sm:first:pl-0">
                                <e.icon className="h-4 w-4 text-brand-strong" aria-hidden="true" />
                                <h3 className="text-sm font-semibold text-foreground">{e.title}</h3>
                                <p className="text-[13px] leading-relaxed text-muted-foreground">{e.copy}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* 03 — PAYMENT */}
            <EngineeringSection
                id="payment"
                number="03"
                eyebrow="Payment"
                headline="Payment completes outside the order saga."
                intro="After fulfillment is confirmed, Spoontab requests payment, then verifies the result with Stripe once the browser confirms."
                tone="parchment"
            >
                <PaymentWorkflowDiagram />
                <div className="mt-5 flex flex-wrap gap-x-6 gap-y-3">
                    {PAYMENT_ANNOTATIONS.map((a) => (
                        <span key={a.text} className="inline-flex items-center gap-1.5 font-mono text-[12px] text-muted-foreground sm:text-[13px]">
                            <a.icon className="h-3.5 w-3.5 text-brand-strong/70" aria-hidden="true" />
                            {a.text}
                        </span>
                    ))}
                </div>
                <Callout>Spoontab verifies the outcome with Stripe, and records it exactly once.</Callout>
            </EngineeringSection>

            {/* 04 — TENANCY */}
            <EngineeringSection
                id="tenancy"
                number="04"
                eyebrow="Tenancy"
                headline="One system. Every restaurant isolated."
                intro="Identity establishes the tenant context, and every service independently enforces it before accessing restaurant data."
            >
                <TenancyContainment />
                <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2">
                    <p className="font-display text-xl italic leading-snug text-foreground">
                        “Identity establishes the tenant context.”
                    </p>
                    <p className="font-display text-xl italic leading-snug text-foreground">
                        “Every service independently enforces it.”
                    </p>
                </div>
            </EngineeringSection>

            {/* 05 — OPERATIONS */}
            <EngineeringSection
                id="operations"
                number="05"
                eyebrow="Operations"
                headline="Every ticket leaves a trace."
                intro="Logs, metrics, and traces preserve the same request context as work moves between services and asynchronous events."
                tone="parchment"
            >
                <OpsTraceTimeline />
                <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
                    {OPS_PROOF.map((p) => (
                        <div key={p.title}>
                            <h3 className="mb-1 text-sm font-semibold text-foreground">{p.title}</h3>
                            <p className="text-[13px] leading-relaxed text-muted-foreground">{p.copy}</p>
                        </div>
                    ))}
                </div>
            </EngineeringSection>

            {/* CONCLUSION */}
            <section className="border-t border-border bg-brand-soft/60 py-14 sm:py-[72px] lg:py-24">
                <div className="mx-auto max-w-[1200px] px-5 text-center sm:px-8 lg:px-16">
                    <span className="mb-4 block font-mono text-[13px] uppercase tracking-[0.08em] text-brand-strong sm:text-sm">
                        The Result
                    </span>
                    <h2 className="mx-auto mb-5 max-w-3xl font-display text-[32px] leading-[1.1] text-foreground sm:text-[42px] lg:text-[52px]">
                        Built around the way a restaurant actually moves.
                    </h2>
                    <p className="mx-auto mb-9 max-w-[650px] text-lg leading-relaxed text-muted-foreground sm:text-xl">
                        Spoontab keeps identity, ordering, inventory, fulfillment, and payment independently owned while allowing the complete restaurant workflow to operate as one system.
                    </p>
                    <div className="flex flex-wrap items-center justify-center gap-4">
                        <Button size="lg" asChild className="h-auto rounded-md px-7 py-3.5 text-base transition-colors duration-150">
                            <Link to="/">
                                Explore the live system
                                <ArrowRight className="ml-1 h-4 w-4" />
                            </Link>
                        </Button>
                        <Button
                            variant="outline"
                            size="lg"
                            asChild
                            className="h-auto rounded-md border bg-transparent px-7 py-3.5 text-base text-foreground transition-colors duration-150 hover:border-brand hover:text-brand-strong"
                        >
                            <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer">
                                <GithubIcon className="mr-1 h-4 w-4" />
                                View the source
                            </a>
                        </Button>
                    </div>
                </div>
            </section>

            <AppFooter />
        </div>
    );
}
