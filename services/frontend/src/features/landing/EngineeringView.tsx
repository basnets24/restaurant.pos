import { useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
    ArrowLeft, ArrowRight, ArrowDown, ExternalLink, Home, Users, UtensilsCrossed, ShoppingCart, CreditCard,
    TestTube, GitBranch, Server,
} from "lucide-react";
import { GithubIcon } from "@/components/brand-icons/github-icon";
import { AppFooter } from "@/components/AppFooter";
import { SystemTopologyDiagram } from "@/features/landing/components/SystemTopologyDiagram";
import {
    OrderSagaDiagram, ReadModelDiagram,
} from "@/features/landing/components/NarrativeDiagrams";
import { PaymentWorkflowDiagram } from "@/features/landing/components/PaymentWorkflowDiagram";
import { TenancyContainment } from "@/features/landing/components/TenancyContainment";
import { HeroReceipt } from "@/features/landing/components/HeroReceipt";
import { OpsTraceTimeline } from "@/features/landing/components/OpsTraceTimeline";
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

const PRODUCTION = [
    {
        icon: TestTube, title: "Testing", stack: "xUnit · Playwright",
        detail: "Backend unit tests cover identity and user behavior, with Playwright covering critical staff and customer flows end to end.",
    },
    {
        icon: GitBranch, title: "CI/CD", stack: "GitHub Actions",
        detail: "Every change runs through an automated build pipeline, with images built and deployed automatically on merge to main.",
    },
    {
        icon: Server, title: "Deployment", stack: "DigitalOcean · Caddy",
        detail: "The frontend and .NET services are containerized and deployed on DigitalOcean behind Caddy, with RabbitMQ and the observability stack alongside them and Postgres managed via Supabase.",
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

/** Subtle boundary between numbered sections — a plain rule scoped to the
 * reading column, so section breaks stay quiet rather than each reading as
 * its own chapter-break event. */
function SectionRule() {
    return (
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="border-t border-border/60" />
        </div>
    );
}

/** Shared editorial section pattern for every numbered beat of the article: a
 * mono numbered eyebrow, a display headline, a 40px ochre rule, one
 * plain-language intro paragraph, the main visual, then a short
 * interpretation. Alternates "cream"/"parchment" backgrounds across sections
 * to establish rhythm without every section becoming a white card. */
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
                <h2 className="max-w-3xl font-display text-2xl leading-tight text-foreground sm:text-3xl">
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

                    <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_300px] lg:items-center lg:gap-8">
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

                        <div>
                            <HeroReceipt />
                        </div>
                    </div>
                </div>
            </section>

            <SectionRule />

            {/* 01 — THE SYSTEM. Locked component below: SystemTopologyDiagram and its
                surrounding DiagramScrollArea are untouched, including their
                interactions, colors, and responsive behavior — hovering a service box
                pops its detail card open right under it. Only the outer section chrome
                (spacing, eyebrow/heading treatment) follows the shared pattern. */}
            <EngineeringSection
                id="system"
                number="01"
                eyebrow="The System"
                headline="Four services, four ownership boundaries."
                tone="parchment"
                interpretation={
                    <div className="border-l-2 border-brand/40 pl-4">
                        <span className="block text-[11px] font-medium tracking-wide uppercase text-brand-strong/80 mb-1">
                            Architectural Rule
                        </span>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                            A service may consume another service's events, but it never reaches into another service's schema.
                        </p>
                    </div>
                }
            >
                <SystemTopologyDiagram services={SERVICES} hovered={hoveredService} onHoverChange={setHoveredService} />
            </EngineeringSection>

            <SectionRule />

            {/* 02 — THE ORDER */}
            <EngineeringSection
                id="order"
                number="02"
                eyebrow="The Order"
                headline={'"Fire to Kitchen" starts the distributed workflow.'}
                intro={<><code>OrderSubmitted</code> starts a MassTransit saga that asks Catalog to reserve inventory before fulfillment can proceed.</>}
                interpretation={
                    <p className="text-sm text-muted-foreground leading-relaxed">
                        The saga has one job: resolve inventory reservation to <code>Confirmed</code> or <code>Rejected</code>. Payment is not part of its state machine.
                    </p>
                }
            >
                <OrderSagaDiagram />
            </EngineeringSection>

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
            <EngineeringSection
                id="data"
                number="04"
                eyebrow="Data"
                headline="Order reads locally, Catalog stays decoupled."
                intro="Catalog publishes updates. Order keeps a local read model for the staff POS, so it doesn't need to call Catalog during every interaction."
            >
                <ReadModelDiagram />
            </EngineeringSection>

            <SectionRule />

            {/* 05 — TENANCY */}
            <EngineeringSection
                id="tenancy"
                number="05"
                eyebrow="Tenancy"
                headline="Tenant context travels with every request."
                intro="Restaurant and location context is resolved once, then carried through application and messaging layers so data stays scoped to the correct tenant."
                interpretation={
                    <p className="text-sm text-muted-foreground leading-relaxed">
                        Nothing downstream re-derives the tenant. Every hop reads the same context the request arrived with.
                    </p>
                }
            >
                <TenancyContainment />
            </EngineeringSection>

            <SectionRule />

            {/* 06 — OPERATIONS */}
            <EngineeringSection
                id="operations"
                number="06"
                eyebrow="Operations"
                headline="Every cross-service workflow is traceable."
                intro="OpenTelemetry connects traces, metrics, and structured logs across service boundaries so failures can be followed from request to event to consumer."
                tone="parchment"
            >
                <OpsTraceTimeline />

                <div className="mt-5 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
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
            </EngineeringSection>

            <SectionRule />

            {/* 07 — PRODUCTION */}
            <EngineeringSection
                id="production"
                number="07"
                eyebrow="Production"
                headline="Tested, automated, and deployed."
            >
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 sm:gap-6">
                    {PRODUCTION.map((p) => (
                        <div key={p.title} className="rounded-lg border border-border bg-card p-5">
                            <p.icon className="mb-3 h-5 w-5 text-brand-strong" />
                            <h3 className="mb-1 text-sm font-semibold text-foreground">{p.title}</h3>
                            <p className="mb-2 font-mono text-[11px] uppercase tracking-wide text-brand-strong/80">{p.stack}</p>
                            <p className="text-sm leading-relaxed text-muted-foreground">{p.detail}</p>
                        </div>
                    ))}
                </div>
            </EngineeringSection>

            <SectionRule />

            {/* 08 — TRADEOFFS. Editorial rows rather than §07's card grid — this section
                closes the piece, so it should read as reflective rather than another
                feature-card beat. */}
            <EngineeringSection
                id="tradeoffs"
                number="08"
                eyebrow="Tradeoffs"
                headline="What I'd change at commercial scale."
                intro="The architecture above fits a solo-built, portfolio-scale system. Here's what I'd revisit first."
                tone="parchment"
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
            </EngineeringSection>

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
