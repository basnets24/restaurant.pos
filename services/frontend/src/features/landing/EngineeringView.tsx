import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
    ArrowLeft, ArrowRight, Users, UtensilsCrossed, ShoppingCart, CreditCard,
    Workflow, ShieldCheck, Database, Activity, CheckCircle2, XCircle,
} from "lucide-react";
import { GithubIcon } from "@/components/brand-icons/github-icon";
import { AppFooter } from "@/components/AppFooter";
import { SectionHeader } from "@/components/primitives/SectionHeader";
import { IconTextRow } from "@/components/primitives/IconTextRow";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";

const GITHUB_URL = "https://github.com/basnets24/restaurant.pos";

const SERVICES = [
    {
        icon: Users, name: "Identity", tags: ["Duende IdentityServer", "OAuth2/OIDC"],
        description: "OAuth2/OIDC via Duende IdentityServer. Also owns restaurant/location tenancy: onboarding and membership management, absorbed from a former standalone tenant service.",
    },
    {
        icon: UtensilsCrossed, name: "Catalog", tags: ["EF Core", "Event publisher"],
        description: "Menu items and inventory in one schema. Publishes MenuItemCreated/Updated/Deleted and InventoryItem events that downstream services fold into their own read models.",
    },
    {
        icon: ShoppingCart, name: "Order", tags: ["MassTransit saga", "SignalR"],
        description: "Cart, checkout, dining tables, and the order fulfillment saga. Drives a Postgres-backed POS read model and a SignalR floor-plan hub for live table status.",
    },
    {
        icon: CreditCard, name: "Payment", tags: ["Stripe PaymentIntents"],
        description: "Creates a Stripe PaymentIntent per order, confirmed client-side via an embedded Payment Element, then server-verified. No webhook endpoint in the loop.",
    },
];

const HIGHLIGHTS = [
    {
        icon: Workflow, title: "A Deliberately Small Saga",
        description: "The order lifecycle is a MassTransit state machine, deliberately kept small: it reserves inventory and resolves straight to Confirmed or Rejected, then hands payment off as a separate flow it doesn't own.",
    },
    {
        icon: ShieldCheck, title: "Real Multi-Tenancy",
        description: "Every request carries restaurant/location headers through an AsyncLocal context, MassTransit filters, and EF query filters. Each tenant gets its own cached EF model via a custom model-cache-key factory, so one tenant's schema quirks never leak into another's queries.",
    },
    {
        icon: Database, title: "Event-Folded Read Model",
        description: "A dedicated projector consumes catalog and inventory events and upserts a single Postgres read model for the POS screen, computing availability at write time so ordering never blocks on a service call.",
    },
    {
        icon: Activity, title: "Observability Stack",
        description: "OpenTelemetry traces flow into Jaeger, metrics into Prometheus/Grafana, and structured logs into Seq, deployed alongside the services for demo purposes. No persistent volumes, so dashboards reset on every redeploy.",
    },
];

const SAGA_STEPS = [
    { title: "Fire to Kitchen", detail: "Cart checkout → OrderSubmitted" },
    { title: "Reserve Inventory", detail: "Saga calls catalog's inventory consumer" },
    { title: "Confirmed or Rejected", detail: "Inventory reserved or faulted resolves the saga; its involvement ends here" },
];

const STACK_GROUPS = [
    { label: "Backend", items: [".NET 8 & 10", "ASP.NET Core", "EF Core", "MassTransit", "Duende IdentityServer", "xUnit + Moq"] },
    { label: "Frontend", items: ["React 19", "TypeScript", "TanStack Query", "Tailwind v4", "Vite", "Playwright"] },
    { label: "Data & Messaging", items: ["PostgreSQL", "Supabase / Supavisor", "RabbitMQ"] },
    { label: "Infra & Observability", items: ["Docker Compose", "Caddy", "DigitalOcean", "OpenTelemetry", "Jaeger", "Prometheus", "Grafana", "Seq"] },
];

export default function EngineeringView() {
    useDocumentTitle("Engineering · Spoontab");
    const navigate = useNavigate();
    // The two demos are one-click, no-login links that only exist on the landing page's
    // #demos section - this just gets the visitor there instead of into real registration.
    const goToDemos = () => navigate("/#demos");

    return (
        <div className="min-h-screen bg-background">
            {/* Hero — brand + back link live in the hero itself, not a sticky bar,
                matching Landing's dropped nav-bar treatment. */}
            <section className="relative overflow-hidden bg-background texture-paper">
                <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-16 sm:pt-8 lg:pb-20">
                    <div className="flex items-center justify-between mb-16">
                        <Link to="/" className="font-display text-3xl text-foreground">Spoontab</Link>
                        <Button variant="outline" size="lg" asChild className="text-lg px-6 py-5 rounded-none">
                            <Link to="/">
                                <ArrowLeft className="mr-2 h-4 w-4" />
                                Back to site
                            </Link>
                        </Button>
                    </div>

                    <div className="max-w-2xl">
                        <span className="block text-xs font-medium tracking-wide uppercase text-muted-foreground mb-3">
                            Engineering
                        </span>
                        <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl text-foreground leading-tight mb-4">
                            A Real Microservices
                            <br />
                            Restaurant Platform
                        </h1>
                        <p className="text-xl text-muted-foreground leading-relaxed max-w-xl mb-8">
                            Independently deployable services, event-driven messaging between them, and full observability built in from the start.
                        </p>
                        <div className="flex flex-wrap gap-4">
                            <Button size="lg" asChild className="text-lg px-8 py-5 rounded-none shadow-md hover:shadow-lg transition-all duration-200">
                                <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer">
                                    <GithubIcon className="mr-2 h-5 w-5" />
                                    View on GitHub
                                </a>
                            </Button>
                            <Button variant="outline" size="lg" onClick={goToDemos} className="text-lg px-8 py-5 rounded-none">
                                See the Live Demos
                                <ArrowRight className="ml-2 h-5 w-5" />
                            </Button>
                        </div>
                    </div>
                </div>
            </section>

            {/* Services */}
            <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16 border-t border-border">
                <SectionHeader variant="technical" eyebrow="The Services" title="Four Independent Services" className="mb-10" />
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                    {SERVICES.map((s) => (
                        <Card key={s.name} size="lg" className="p-5 border-border bg-card">
                            <div className="w-10 h-10 rounded-md bg-brand-soft flex items-center justify-center mb-3">
                                <s.icon className="w-5 h-5 text-brand-strong" />
                            </div>
                            <h3 className="text-base font-semibold text-foreground mb-1">{s.name}</h3>
                            <p className="text-sm text-muted-foreground leading-relaxed mb-3">{s.description}</p>
                            <div className="flex flex-wrap gap-1.5">
                                {s.tags.map((t) => (
                                    <Badge key={t} variant="outline" className="text-xs">{t}</Badge>
                                ))}
                            </div>
                        </Card>
                    ))}
                </div>
            </section>

            {/* Architecture highlights */}
            <section className="border-t border-border py-12 lg:py-16">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <SectionHeader variant="technical" eyebrow="Under the Hood" title="Architecture Highlights" className="mb-10" />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10">
                        <div>
                            {HIGHLIGHTS.slice(0, 2).map((h) => (
                                <IconTextRow key={h.title} icon={h.icon} title={h.title} description={h.description} />
                            ))}
                        </div>
                        <div>
                            {HIGHLIGHTS.slice(2).map((h) => (
                                <IconTextRow key={h.title} icon={h.icon} title={h.title} description={h.description} />
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* Order saga walkthrough */}
            <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16 border-t border-border">
                <SectionHeader
                    variant="technical"
                    eyebrow="Order Fulfillment"
                    title="The Order Saga, Step by Step"
                    description="Order fulfillment is coordinated by a MassTransit state machine, deliberately scoped to inventory reservation, not payment. Every step below is a real event on the bus."
                    className="mb-10"
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                    {SAGA_STEPS.map((step, i) => (
                        <div key={step.title} className="relative">
                            <Card size="lg" className="p-4 border-border bg-card h-full">
                                <div className="w-7 h-7 rounded-full bg-primary text-primary-foreground text-sm font-numeric flex items-center justify-center mb-3">
                                    {i + 1}
                                </div>
                                <h3 className="text-sm font-semibold text-foreground mb-1">{step.title}</h3>
                                <p className="text-xs text-muted-foreground leading-relaxed">{step.detail}</p>
                            </Card>
                        </div>
                    ))}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                    <Card size="lg" className="p-4 border-status-available/30 bg-status-available-soft flex items-center gap-3">
                        <CheckCircle2 className="w-5 h-5 text-status-available shrink-0" />
                        <div>
                            <h3 className="text-sm font-semibold text-foreground">Inventory Reserved</h3>
                            <p className="text-xs text-muted-foreground">Saga transitions to Confirmed.</p>
                        </div>
                    </Card>
                    <Card size="lg" className="p-4 border-destructive/30 bg-destructive/10 flex items-center gap-3">
                        <XCircle className="w-5 h-5 text-destructive shrink-0" />
                        <div>
                            <h3 className="text-sm font-semibold text-foreground">Reservation Failed</h3>
                            <p className="text-xs text-muted-foreground">Saga transitions to Rejected. There was nothing reserved to release.</p>
                        </div>
                    </Card>
                </div>

                <Card size="lg" className="p-5 border-border bg-muted/30 mt-4 flex gap-4">
                    <div className="w-11 h-11 shrink-0 rounded-md bg-brand-soft flex items-center justify-center">
                        <CreditCard className="w-5 h-5 text-brand-strong" />
                    </div>
                    <div>
                        <h3 className="text-sm font-semibold text-foreground mb-1">Payment is a separate flow, on purpose</h3>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                            Once an order is Confirmed, staff trigger payment on their own; the saga's involvement is already over. That request publishes <code>PaymentRequested</code> directly, no saga step watching for it. Payment service creates a Stripe PaymentIntent; the frontend confirms it client-side via an embedded Payment Element, then a server call verifies it with Stripe and applies <code>PaymentSucceeded</code>/<code>PaymentFailed</code> straight to the order, synchronously, no webhook in the loop.
                        </p>
                    </div>
                </Card>
            </section>

            {/* Tech stack */}
            <section className="border-t border-border py-12 lg:py-16">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <SectionHeader variant="technical" eyebrow="What It Runs On" title="Tech Stack" className="mb-10" />
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
                        {STACK_GROUPS.map((g) => (
                            <div key={g.label}>
                                <h3 className="text-sm font-semibold text-foreground mb-3">{g.label}</h3>
                                <div className="flex flex-wrap gap-1.5">
                                    {g.items.map((t) => (
                                        <Badge key={t} variant="outline" className="text-xs">{t}</Badge>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* CTA */}
            <section className="border-t border-border py-12 lg:py-16 relative overflow-hidden">
                <div className="relative max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8 space-y-8">
                    <h2 className="font-display text-3xl sm:text-4xl text-foreground leading-tight">See the Code, or See It Running</h2>
                    <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                        Full source is on GitHub, or see the live demos to watch every service above in action.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
                        <Button size="lg" asChild className="text-lg px-10 py-4 shadow-md hover:shadow-lg transition-all duration-200">
                            <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer">
                                <GithubIcon className="mr-2 h-5 w-5" />
                                View on GitHub
                            </a>
                        </Button>
                        <Button variant="outline" size="lg" onClick={goToDemos} className="text-lg px-10 py-4 border-2 hover:bg-accent">
                            See the Live Demos
                            <ArrowRight className="ml-2 h-5 w-5" />
                        </Button>
                    </div>
                </div>
            </section>

            <AppFooter />
        </div>
    );
}
