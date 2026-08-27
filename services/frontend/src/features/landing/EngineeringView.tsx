import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
    ArrowLeft, ArrowRight, Code2, Users, UtensilsCrossed, ShoppingCart, CreditCard,
    Workflow, ShieldCheck, Database, Activity, CheckCircle2, XCircle,
} from "lucide-react";
import { GithubIcon } from "@/components/brand-icons/github-icon";
import { AppFooter } from "@/components/AppFooter";
import { useAuth } from "@/api-authorization/AuthProvider";
import { AuthorizationPaths, QueryParameterNames } from "@/api-authorization/ApiAuthorizationConstants";

const GITHUB_URL = "https://github.com/basnets24/restaurant.pos";

const SERVICES = [
    {
        icon: Users, name: "Identity", tags: ["Duende IdentityServer", "OAuth2/OIDC"],
        description: "OAuth2/OIDC via Duende IdentityServer. Also owns restaurant/location tenancy — onboarding and membership management, absorbed from a former standalone tenant service.",
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
        description: "Creates a Stripe PaymentIntent per order, confirmed client-side via an embedded Payment Element, then server-verified — no webhook endpoint in the loop.",
    },
];

const HIGHLIGHTS = [
    {
        icon: Workflow, title: "Saga-Orchestrated Order Flow",
        description: "The order lifecycle is a MassTransit state machine, not a call chain: checkout reserves inventory, requests payment with a 2-minute timeout, and compensates with a rollback on failure or timeout — no distributed transaction, no partial state.",
    },
    {
        icon: ShieldCheck, title: "Real Multi-Tenancy",
        description: "Every request carries restaurant/location headers through an AsyncLocal context, MassTransit filters, and EF query filters. Each tenant gets its own cached EF model via a custom model-cache-key factory, so one tenant's schema quirks never leak into another's queries.",
    },
    {
        icon: Database, title: "Event-Folded Read Model",
        description: "The POS screen isn't a live join across four services — a dedicated projector consumes catalog and inventory events and upserts a single Postgres read model, computing availability at write time so ordering never blocks on a service call.",
    },
    {
        icon: Activity, title: "Full Observability Stack",
        description: "OpenTelemetry traces flow into Jaeger, metrics into Prometheus/Grafana, and structured logs into Seq — wired into every service from day one, not bolted on after the fact.",
    },
];

const SAGA_STEPS = [
    { title: "Checkout", detail: "Cart submits → OrderSubmitted" },
    { title: "Reserve Inventory", detail: "Saga calls catalog's inventory consumer" },
    { title: "Payment Requested", detail: "2-minute timeout scheduled" },
    { title: "Stripe Confirms", detail: "Embedded Payment Element, client-side" },
    { title: "Server Verifies", detail: "Publishes PaymentSucceeded/Failed" },
];

const STACK_GROUPS = [
    { label: "Backend", items: [".NET 8", "ASP.NET Core", "EF Core", "MassTransit", "Duende IdentityServer", "xUnit + Moq"] },
    { label: "Frontend", items: ["React 19", "TypeScript", "TanStack Query", "Tailwind v4", "Vite", "Playwright"] },
    { label: "Data & Messaging", items: ["PostgreSQL", "Supabase / Supavisor", "RabbitMQ", "Azure Service Bus"] },
    { label: "Infra & Observability", items: ["Docker Compose", "Kubernetes (AKS)", "Emissary Ingress", "cert-manager", "Helm", "OpenTelemetry", "Jaeger", "Prometheus", "Grafana", "Seq"] },
];

export default function EngineeringView() {
    const navigate = useNavigate();
    const { isAuthenticated } = useAuth();
    const go = () => {
        if (isAuthenticated) return navigate("/join");
        const returnUrl = `${window.location.origin}/join`;
        navigate(`${AuthorizationPaths.Register}?${QueryParameterNames.ReturnUrl}=${encodeURIComponent(returnUrl)}`);
    };

    return (
        <div className="min-h-screen bg-background">
            <header
                className="sticky top-0 z-40 border-b border-border"
                style={{
                    background: "color-mix(in srgb, var(--olive-300) 90%, transparent)",
                    backdropFilter: "blur(8px)",
                    WebkitBackdropFilter: "blur(8px)",
                }}
            >
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between gap-3">
                    <Link to="/" className="flex items-center gap-3">
                        <div className="w-9 h-9 shrink-0 bg-primary rounded-[10px] flex items-center justify-center">
                            <span className="text-primary-foreground font-bold text-xs">RMS</span>
                        </div>
                        <span className="text-lg font-semibold text-foreground">Spoontab</span>
                    </Link>
                    <div className="flex items-center gap-5">
                        <a
                            href={GITHUB_URL} target="_blank" rel="noopener noreferrer"
                            className="hidden sm:flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground"
                        >
                            <GithubIcon className="w-4 h-4" />
                            GitHub
                        </a>
                        <Link to="/" className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground">
                            <ArrowLeft className="w-4 h-4" />
                            Back to site
                        </Link>
                    </div>
                </div>
            </header>

            {/* Hero */}
            <section className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-12">
                <Badge className="bg-primary/10 text-primary border-primary/20 px-4 py-2 mb-4">
                    <Code2 className="w-4 h-4 mr-2" />
                    Engineering
                </Badge>
                <h1 className="text-3xl sm:text-4xl text-foreground leading-tight mb-3">A Real Microservices Restaurant Platform</h1>
                <p className="text-lg text-muted-foreground leading-relaxed max-w-2xl">
                    Independently deployable services, event-driven messaging between them, and full observability — built the way production systems are actually built, not a monolith with a POS skin on top.
                </p>
                <div className="flex flex-wrap gap-3 mt-6">
                    <Button asChild className="shadow-md">
                        <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer">
                            <GithubIcon className="mr-2 h-4 w-4" />
                            View on GitHub
                        </a>
                    </Button>
                    <Button variant="outline" onClick={go}>
                        Explore the Live Demo
                        <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                </div>
            </section>

            {/* Services */}
            <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
                <h2 className="text-xl font-semibold text-foreground mb-5">Services</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                    {SERVICES.map((s) => (
                        <Card key={s.name} className="p-5 border-border bg-card">
                            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mb-3">
                                <s.icon className="w-5 h-5 text-primary" />
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
            <section className="bg-muted/30 py-16">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <h2 className="text-xl font-semibold text-foreground mb-5">Architecture Highlights</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        {HIGHLIGHTS.map((h) => (
                            <Card key={h.title} className="p-6 border-border bg-card flex gap-4">
                                <div className="w-11 h-11 shrink-0 rounded-xl bg-primary/10 flex items-center justify-center">
                                    <h.icon className="w-5 h-5 text-primary" />
                                </div>
                                <div>
                                    <h3 className="text-base font-semibold text-foreground mb-1.5">{h.title}</h3>
                                    <p className="text-sm text-muted-foreground leading-relaxed">{h.description}</p>
                                </div>
                            </Card>
                        ))}
                    </div>
                </div>
            </section>

            {/* Order saga walkthrough */}
            <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
                <h2 className="text-xl font-semibold text-foreground mb-2">The Order Saga, Step by Step</h2>
                <p className="text-sm text-muted-foreground mb-8 max-w-2xl">
                    Order fulfillment is coordinated by a MassTransit state machine — every step below is a real event on the bus, with an explicit compensating path if payment fails or times out.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                    {SAGA_STEPS.map((step, i) => (
                        <div key={step.title} className="relative">
                            <Card className="p-4 border-border bg-card h-full">
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
                    <Card className="p-4 border-status-available/30 bg-status-available-soft flex items-center gap-3">
                        <CheckCircle2 className="w-5 h-5 text-status-available shrink-0" />
                        <div>
                            <h3 className="text-sm font-semibold text-foreground">Payment Succeeded</h3>
                            <p className="text-xs text-muted-foreground">Order applied, saga completes.</p>
                        </div>
                    </Card>
                    <Card className="p-4 border-destructive/30 bg-destructive/10 flex items-center gap-3">
                        <XCircle className="w-5 h-5 text-destructive shrink-0" />
                        <div>
                            <h3 className="text-sm font-semibold text-foreground">Failed or Timed Out</h3>
                            <p className="text-xs text-muted-foreground">Saga compensates: ReleaseInventory, order Rejected.</p>
                        </div>
                    </Card>
                </div>
            </section>

            {/* Tech stack */}
            <section className="bg-muted/30 py-16">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <h2 className="text-xl font-semibold text-foreground mb-5">Tech Stack</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                        {STACK_GROUPS.map((g) => (
                            <Card key={g.label} className="p-5 border-border bg-card">
                                <h3 className="text-sm font-semibold text-foreground mb-3">{g.label}</h3>
                                <div className="flex flex-wrap gap-1.5">
                                    {g.items.map((t) => (
                                        <Badge key={t} variant="outline" className="text-xs">{t}</Badge>
                                    ))}
                                </div>
                            </Card>
                        ))}
                    </div>
                </div>
            </section>

            {/* CTA */}
            <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
                <Card className="p-6 border-border bg-card flex items-center justify-between flex-wrap gap-4">
                    <div>
                        <h3 className="text-base font-semibold text-foreground mb-1">See the code, or see it running</h3>
                        <p className="text-sm text-muted-foreground">Full source is on GitHub — or try the live demo to see every service above in action.</p>
                    </div>
                    <div className="flex flex-wrap gap-3">
                        <Button variant="outline" asChild>
                            <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer">
                                <GithubIcon className="mr-2 h-4 w-4" />
                                View on GitHub
                            </a>
                        </Button>
                        <Button onClick={go}>
                            Explore the Live Demo
                            <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                    </div>
                </Card>
            </section>

            <AppFooter onCta={go} />
        </div>
    );
}
