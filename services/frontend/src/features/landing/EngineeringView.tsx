import { useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
    ArrowLeft, ArrowRight, ArrowDown, ExternalLink, Home, Users, UtensilsCrossed, ShoppingCart, CreditCard,
    TestTube, GitBranch, Server,
} from "lucide-react";
import { GithubIcon } from "@/components/brand-icons/github-icon";
import { AppFooter } from "@/components/AppFooter";
import { SystemTopologyDiagram } from "@/features/landing/components/SystemTopologyDiagram";
import {
    OrderSagaDiagram, ReadModelDiagram, TenancyDiagram,
} from "@/features/landing/components/NarrativeDiagrams";
import { PaymentWorkflowDiagram } from "@/features/landing/components/PaymentWorkflowDiagram";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";

const GITHUB_URL = "https://github.com/basnets24/restaurant.pos";
const PORTFOLIO_URL = "https://snehabasnet.com";

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

const TRADEOFFS = [
    {
        title: "Introduce a gateway as the system grows",
        detail: "Direct HTTPS is simpler for four services today. With more services and shared edge concerns, I'd introduce a gateway or BFF.",
    },
    {
        title: "Payment needs durable reconciliation",
        detail: "The current client-confirm/server-verify flow is intentionally simple. Commercially, I'd add Stripe webhooks, idempotent processing, retries, and persisted reconciliation state.",
    },
    {
        title: "Observability should survive redeploys",
        detail: "Traces and dashboards currently reset on deploy. A production setup would persist telemetry across releases so incidents can be investigated afterward.",
    },
];

interface NarrativeSectionProps {
    index: string;
    label: string;
    title: string;
    lede?: ReactNode;
    /** Let the title/lede run the section's full width instead of the default
     * max-w-2xl reading column — for a section whose lede is short enough that
     * the narrow column reads as an unintentionally small block, not a deliberate
     * one. Off by default so the rest of the article keeps its narrower rhythm. */
    wide?: boolean;
    /** Vertical rhythm tier: "major" (01-02, the core engineering work) keeps the
     * page's most generous spacing; "compact" (03-06, faster supporting beats)
     * cuts it by roughly a third; "medium" (07-08, closing beats) sits between
     * the two. Default is "major" so existing full-weight sections need no change. */
    weight?: "major" | "compact" | "medium";
    children: ReactNode;
}

const SECTION_PADDING: Record<NonNullable<NarrativeSectionProps["weight"]>, string> = {
    major: "py-12 lg:py-16",
    medium: "py-10 lg:py-14",
    compact: "py-8 lg:py-10",
};

/** One numbered beat of the article: "01 / THE SYSTEM" eyebrow, a single-sentence
 * question-style claim, optional supporting line, then whatever proves it
 * (a diagram, a list, evidence). Every section answers one new question — this
 * wrapper is what keeps that rhythm consistent without repeating markup. */
function NarrativeSection({ index, label, title, lede, wide, weight = "major", children }: NarrativeSectionProps) {
    const measure = wide ? "" : "max-w-2xl";
    return (
        <section className={`max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 ${SECTION_PADDING[weight]}`}>
            <span className="block text-xs font-medium tracking-wide uppercase text-brand-strong mb-3">
                {index} / {label}
            </span>
            <h2 className={`font-display text-2xl sm:text-3xl text-foreground leading-tight mb-3 ${measure}`}>
                {title}
            </h2>
            <div className="h-0.5 w-10 bg-border mb-4" />
            {lede && <p className={`text-lg text-muted-foreground leading-relaxed mb-6 ${measure}`}>{lede}</p>}
            {!lede && <div className="mb-6" />}
            {children}
        </section>
    );
}

/** Strong "keep reading" beat — reserved for Hero -> 01 and 01 -> 02, the two
 * transitions into and within the page's major beats. */
function ScrollConnector() {
    return (
        <div className="flex justify-center border-t border-border">
            <ArrowDown className="w-4 h-4 text-muted-foreground/50 -mt-2 bg-background" />
        </div>
    );
}

/** Subtle boundary for every other section transition (02 through 08) — a plain
 * rule scoped to the reading column rather than a full-bleed line with an arrow,
 * so supporting beats don't each get the same "chapter break" treatment as 01/02. */
function SectionRule() {
    return (
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="border-t border-border/60" />
        </div>
    );
}

/** New editorial section pattern being rolled out section by section: a mono
 * numbered eyebrow, a larger display headline, a 40px ochre rule, one
 * plain-language intro paragraph, the main visual, then a short
 * interpretation. Only Section 03 uses this today — the rest of the page
 * still uses NarrativeSection above until they're redone in turn. */
function EngineeringSection({ id, number, eyebrow, headline, intro, children, interpretation, tone = "cream" }: {
    id: string; number: string; eyebrow: string; headline: string; intro?: ReactNode; children: ReactNode;
    interpretation?: ReactNode; tone?: "cream" | "parchment";
}) {
    return (
        <section
            id={id}
            className={`scroll-mt-16 py-8 sm:py-10 lg:py-12 ${tone === "parchment" ? "bg-[var(--surface-sunken)]/50" : "bg-background"}`}
        >
            <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
                <span className="mb-3 block font-mono text-[13px] uppercase tracking-[0.08em] text-brand-strong sm:text-sm">
                    {number} / {eyebrow}
                </span>
                <h2 className="max-w-3xl font-display text-[32px] leading-[1.1] text-foreground sm:text-[42px]">
                    {headline}
                </h2>
                <div className="mb-4 mt-3 h-[3px] w-10" style={{ background: "var(--ochre-500)" }} />
                {intro && (
                    <p className="mb-6 max-w-[760px] text-[20px] leading-relaxed text-muted-foreground sm:text-[22px]">
                        {intro}
                    </p>
                )}
                {children}
                {interpretation && <div className="mt-7 max-w-[760px] sm:mt-9">{interpretation}</div>}
            </div>
        </section>
    );
}

export default function EngineeringView() {
    useDocumentTitle("Engineering · Spoontab");
    const [hoveredService, setHoveredService] = useState<string | null>(null);

    return (
        <div className="min-h-screen bg-background">
            {/* Hero — brand + back link live in the hero itself, not a sticky bar,
                matching Landing's dropped nav-bar treatment. */}
            <section className="relative overflow-hidden bg-background texture-paper">
                <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-16 sm:pt-8 lg:pb-20">
                    <div className="flex items-center justify-between mb-16">
                        <Link to="/" className="font-display text-3xl text-foreground">Spoontab</Link>
                        <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
                            <ArrowLeft className="h-3.5 w-3.5" />
                            Back to site
                        </Link>
                    </div>

                    <div className="max-w-3xl">
                        <span className="block text-xs font-medium tracking-wide uppercase text-muted-foreground mb-3">
                            Engineering Spoontab
                        </span>
                        <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl text-foreground leading-tight mb-3">
                            Behind the ticket.
                        </h1>
                        <div className="h-0.5 w-10 bg-border mb-5" />
                        <p className="text-xl text-muted-foreground leading-relaxed mb-4">
                            How Spoontab handles service boundaries, asynchronous fulfillment, tenant-scoped data, payment, and observability in a deployed restaurant system.
                        </p>
                        <p className="text-sm font-medium tracking-wide text-muted-foreground mb-8">
                            Event-driven · Multi-tenant · Observable · Deployed
                        </p>
                        <div className="flex flex-wrap gap-4">
                            <Button size="lg" asChild className="text-lg px-8 py-5 rounded-none shadow-md hover:shadow-lg transition-all duration-200">
                                <a href="#system">
                                    Read the architecture
                                    <ArrowDown className="ml-2 h-5 w-5" />
                                </a>
                            </Button>
                            <Button
                                variant="outline"
                                size="lg"
                                asChild
                                className="text-lg px-8 py-5 rounded-none hover:bg-brand-strong hover:border-brand-strong hover:text-white transition-colors"
                            >
                                <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer">
                                    View source
                                    <ExternalLink className="ml-2 h-5 w-5" />
                                </a>
                            </Button>
                        </div>
                    </div>
                </div>
            </section>

            <ScrollConnector />

            {/* 01 — THE SYSTEM. Hovering a service box pops its detail card open right
                under it, so the diagram itself is the way into what each service owns. */}
            <section id="system" className="scroll-mt-8">
                <NarrativeSection index="01" label="The System" title="Four services, four ownership boundaries." wide>
                    <SystemTopologyDiagram services={SERVICES} hovered={hoveredService} onHoverChange={setHoveredService} />
                    <div className="mt-6 border-l-2 border-brand/40 pl-4">
                        <span className="block text-[11px] font-medium tracking-wide uppercase text-brand-strong/80 mb-1">
                            Architectural Rule
                        </span>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                            A service may consume another service's events, but it never reaches into another service's schema.
                        </p>
                    </div>
                </NarrativeSection>
            </section>

            <ScrollConnector />

            {/* 02 — THE ORDER */}
            <NarrativeSection
                index="02"
                label="The Order"
                title={'"Fire to Kitchen" starts the distributed workflow.'}
                lede={<><code>OrderSubmitted</code> starts a MassTransit saga that asks Catalog to reserve inventory before fulfillment can proceed.</>}
                wide
            >
                <OrderSagaDiagram />

                <p className="mt-6 text-sm text-muted-foreground leading-relaxed">
                    The saga has one job: resolve inventory reservation to <code>Confirmed</code> or <code>Rejected</code>. Payment is not part of its state machine.
                </p>
            </NarrativeSection>

            <SectionRule />

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
            </EngineeringSection>

            <SectionRule />

            {/* 04 — DATA */}
            <NarrativeSection
                index="04"
                label="Data"
                title="Order reads locally, Catalog stays decoupled."
                lede="Catalog publishes updates. Order keeps a local read model for the staff POS, so it doesn't need to call Catalog during every interaction."
                wide
                weight="compact"
            >
                <ReadModelDiagram />
            </NarrativeSection>

            <SectionRule />

            {/* 05 — TENANCY */}
            <NarrativeSection
                index="05"
                label="Tenancy"
                title="Tenant context travels with every request."
                lede="Restaurant and location context is resolved once, then carried through application and messaging layers so data stays scoped to the correct tenant."
                wide
                weight="compact"
            >
                <TenancyDiagram />
                <p className="mt-6 text-sm text-muted-foreground leading-relaxed">
                    Nothing downstream re-derives the tenant. Every hop reads the same context the request arrived with.
                </p>
            </NarrativeSection>

            <SectionRule />

            {/* 06 — OPERATIONS */}
            <NarrativeSection
                index="06"
                label="Operations"
                title="Every cross-service workflow is traceable."
                lede="OpenTelemetry connects traces, metrics, and structured logs across service boundaries so failures can be followed from request to event to consumer."
                wide
                weight="compact"
            >
                <div className="flex flex-wrap items-center gap-3 text-sm font-medium text-foreground">
                    <span className="rounded border border-border bg-card px-3 py-1.5">Request</span>
                    <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0" />
                    <span className="rounded border border-border bg-card px-3 py-1.5">Trace</span>
                    <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0" />
                    <span className="rounded border border-brand bg-brand-soft px-3 py-1.5 text-brand-strong">Service / Event / Consumer</span>
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
                    <a href="https://jaeger.spoontab.com" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-medium text-foreground underline underline-offset-2 hover:text-brand-strong">
                        Jaeger<ExternalLink className="w-3 h-3" />
                    </a>
                    <span aria-hidden="true">·</span>
                    <a href="https://prometheus.spoontab.com" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-medium text-foreground underline underline-offset-2 hover:text-brand-strong">
                        Prometheus<ExternalLink className="w-3 h-3" />
                    </a>
                    /
                    <a href="https://grafana.spoontab.com" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-medium text-foreground underline underline-offset-2 hover:text-brand-strong">
                        Grafana<ExternalLink className="w-3 h-3" />
                    </a>
                    <span aria-hidden="true">·</span>
                    <span className="font-medium text-foreground">Seq</span>
                </div>

                <p className="mt-4 text-sm text-muted-foreground leading-relaxed">
                    The demo stack is observable in production, though telemetry storage is intentionally non-persistent.
                </p>
            </NarrativeSection>

            <SectionRule />

            {/* 07 — PRODUCTION */}
            <NarrativeSection
                index="07"
                label="Production"
                title="Tested, automated, and deployed."
                wide
                weight="medium"
            >
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                    <Card size="lg" className="p-5 gap-0 border-border bg-card">
                        <TestTube className="w-5 h-5 text-brand-strong mb-3" />
                        <h3 className="text-sm font-semibold text-foreground mb-1">Testing</h3>
                        <p className="text-sm text-muted-foreground leading-relaxed">Backend unit tests cover identity and user behavior, with Playwright covering critical staff and customer flows end to end.</p>
                    </Card>
                    <Card size="lg" className="p-5 gap-0 border-border bg-card">
                        <GitBranch className="w-5 h-5 text-brand-strong mb-3" />
                        <h3 className="text-sm font-semibold text-foreground mb-1">CI/CD</h3>
                        <p className="text-sm text-muted-foreground leading-relaxed">Every change runs through an automated build pipeline, with images built and deployed automatically on merge to main.</p>
                    </Card>
                    <Card size="lg" className="p-5 gap-0 border-border bg-card">
                        <Server className="w-5 h-5 text-brand-strong mb-3" />
                        <h3 className="text-sm font-semibold text-foreground mb-1">Deployment</h3>
                        <p className="text-sm text-muted-foreground leading-relaxed">The frontend and .NET services are containerized and deployed on DigitalOcean behind Caddy, with RabbitMQ and the observability stack alongside them and Postgres managed via Supabase.</p>
                    </Card>
                </div>
            </NarrativeSection>

            <SectionRule />

            {/* 08 — TRADEOFFS. Editorial rows rather than §07's card grid — this section
                closes the piece, so it should read as reflective rather than another
                feature-card beat. */}
            <NarrativeSection
                index="08"
                label="Tradeoffs"
                title="What I'd change at commercial scale."
                lede="The architecture above fits a solo-built, portfolio-scale system. Here's what I'd revisit first."
                wide
                weight="medium"
            >
                <div className="divide-y divide-border">
                    {TRADEOFFS.map((t, i) => (
                        <div key={t.title} className="py-5 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-baseline gap-1.5 sm:gap-6">
                            <span className="font-numeric text-sm sm:w-6 shrink-0 text-muted-foreground">{i + 1}</span>
                            <div>
                                <h3 className="text-sm font-semibold mb-1 text-foreground">{t.title}</h3>
                                <p className="text-sm text-muted-foreground leading-relaxed">{t.detail}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </NarrativeSection>

            {/* CTA */}
            <section className="border-t border-border py-10 lg:py-14 relative overflow-hidden">
                <div className="relative max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8 space-y-6">
                    <h2 className="font-display text-3xl sm:text-4xl text-foreground leading-tight">See how it was built.</h2>
                    <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                        Explore the full source on GitHub, or see more of my work.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
                        <Button size="lg" asChild className="text-lg px-10 py-4 rounded-none shadow-md hover:shadow-lg transition-all duration-200">
                            <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer">
                                <GithubIcon className="mr-2 h-5 w-5" />
                                View on GitHub
                            </a>
                        </Button>
                        <Button variant="outline" size="lg" asChild className="text-lg px-10 py-4 rounded-none border-2 hover:bg-accent">
                            <Link to="/">
                                <Home className="mr-2 h-5 w-5" />
                                Home
                            </Link>
                        </Button>
                        <Button
                            variant="outline"
                            size="lg"
                            asChild
                            className="text-lg px-10 py-4 rounded-none border-2 border-fig-base text-fig-base hover:bg-fig-strong hover:border-fig-strong hover:text-white transition-colors"
                        >
                            <a href={PORTFOLIO_URL} target="_blank" rel="noopener noreferrer">
                                See more projects
                                <ArrowRight className="ml-2 h-5 w-5" />
                            </a>
                        </Button>
                    </div>
                </div>
            </section>

            <AppFooter />
        </div>
    );
}
