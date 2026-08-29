import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
    ArrowRight, CheckCircle2, Users, ShoppingCart,
} from "lucide-react";
import { GithubIcon } from "@/components/brand-icons/github-icon";
import { AppFooter } from "@/components/AppFooter";
import { SectionHeader } from "@/components/primitives/SectionHeader";
import { IconTextRow } from "@/components/primitives/IconTextRow";
import { ServiceFlowDiagram } from "@/features/landing/components/ServiceFlowDiagram";
import { ProductScreenshots } from "@/features/landing/ProductScreenshots";
import { useAuth } from "@/api-authorization/AuthProvider";
import { AuthorizationPaths, QueryParameterNames } from "@/api-authorization/ApiAuthorizationConstants";
import { DinerAuth } from "@/features/diner/auth/dinerAuth";
import { DEMO_DINER_EMAIL, DEMO_DINER_PASSWORD } from "@/features/landing/demoCredentials";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";

// Matches the restaurant/location tenant IDs scripts/seed-demo.sh creates.
const DEMO_RESTAURANT_ID = "momo-and-burger";
const DEMO_LOCATION_ID = "main";

const SERVICES = [
    { name: "Identity", highlight: "OAuth2 · multi-tenant" },
    { name: "Catalog", highlight: "Event-published inventory" },
    { name: "Order", highlight: "Saga-orchestrated" },
    { name: "Payment", highlight: "Stripe, no webhooks" },
];

const PROBLEM_POINTS = [
    {
        title: "One data model, not five",
        description: "Menu, inventory, and orders share one event-driven backbone instead of syncing across disconnected tools that each have their own idea of what's in stock.",
    },
    {
        title: "Multi-tenant from day one",
        description: "Every request is scoped to a restaurant and location, enforced at the database layer via EF query filters — not bolted on later as a client-side check.",
    },
    {
        title: "Payment kept deliberately separate",
        description: "A small, understandable order saga hands off to payment as its own flow, rather than one sprawling state machine trying to own every outcome.",
    },
];

const GITHUB_URL = "https://github.com/basnets24/restaurant.pos";

function scrollToId(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

export default function LandingView() {
    useDocumentTitle("Spoontab");
    const navigate = useNavigate();
    const { isAuthenticated, signInDemoAdmin } = useAuth();
    const [adminDemoLoading, setAdminDemoLoading] = useState(false);
    const [customerDemoLoading, setCustomerDemoLoading] = useState(false);

    const register = () => {
        const returnUrl = `${window.location.origin}/join`;
        navigate(`${AuthorizationPaths.Register}?${QueryParameterNames.ReturnUrl}=${encodeURIComponent(returnUrl)}`);
    };
    const go = () => (isAuthenticated ? navigate("/join") : register());
    const logIn = () => {
        if (isAuthenticated) return navigate("/home");
        const returnUrl = `${window.location.origin}/home`;
        navigate(`${AuthorizationPaths.Login}?${QueryParameterNames.ReturnUrl}=${encodeURIComponent(returnUrl)}`);
    };

    const goAdminDemo = async () => {
        setAdminDemoLoading(true);
        try {
            await signInDemoAdmin(`${window.location.origin}/home`);
        } catch {
            toast.error("Could not start the admin demo. Please try again.");
            setAdminDemoLoading(false);
        }
    };

    const goCustomerDemo = async () => {
        setCustomerDemoLoading(true);
        try {
            const session = await DinerAuth.signIn(DEMO_DINER_EMAIL, DEMO_DINER_PASSWORD);
            DinerAuth.save(session);
            navigate(`/order/${DEMO_RESTAURANT_ID}/${DEMO_LOCATION_ID}`);
        } catch {
            toast.error("Could not start the customer demo. Please try again.");
        } finally {
            setCustomerDemoLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-background">
            {/* No full nav bar on this page - just the brand mark and a small, unobtrusive
                Log In link so real staff (not the one-click demo flows below) can still reach
                the sign-in page. Plain, no tint - section separation on this page comes from
                hairline borders, not color washes (see the border-t on each section below). */}
            <div className="sticky top-0 z-40 flex items-center justify-between px-4 sm:px-6 lg:px-8 py-3 bg-background border-b border-border">
                <span className="text-sm font-medium text-foreground">Spoontab</span>
                <button type="button" onClick={logIn} className="text-sm font-medium text-muted-foreground hover:text-foreground">
                    Log In
                </button>
            </div>

            {/* 1. Hero — honest, project-focused */}
            <section className="relative overflow-hidden">
                <div className="relative max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-28 text-center">
                    <Badge className="bg-primary/10 text-primary border-primary/20 px-4 py-2 mb-6">
                        Portfolio Project
                    </Badge>
                    <h1 className="text-4xl sm:text-5xl lg:text-6xl text-foreground leading-tight mb-4">
                        Run the Floor
                        <span className="block italic text-brand-strong">Without the Chaos</span>
                    </h1>
                    <p className="text-xl text-muted-foreground leading-relaxed max-w-xl mx-auto mb-8">
                        Explore a full restaurant workflow, from floor planning and ordering to kitchen fulfillment and payment, built on an observable .NET microservices architecture.
                    </p>

                    <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-4 mb-8">
                        <Button
                            size="lg"
                            onClick={() => scrollToId("demos")}
                            className="text-lg px-8 py-4 shadow-md hover:shadow-lg transition-all duration-200"
                        >
                            See the Live Demos
                            <ArrowRight className="ml-2 h-5 w-5" />
                        </Button>
                        <Link
                            to="/engineering"
                            className="inline-flex items-center text-base font-medium text-muted-foreground hover:text-foreground"
                        >
                            View Engineering Details
                            <ArrowRight className="ml-1.5 h-4 w-4" />
                        </Link>
                    </div>

                    <div className="flex flex-wrap items-center justify-center gap-6">
                        <div className="flex items-center gap-2">
                            <CheckCircle2 className="w-5 h-5 text-primary" />
                            <span className="text-muted-foreground">Live, deployed system</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <CheckCircle2 className="w-5 h-5 text-primary" />
                            <span className="text-muted-foreground">No sign-up needed to explore</span>
                        </div>
                    </div>
                </div>
            </section>

            {/* 2. Two clearly labeled live demos */}
            <section id="demos" className="py-16 lg:py-24 border-t border-border">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <p className="text-lg text-muted-foreground max-w-4xl mx-auto mb-8">
                        Same four services underneath — pick the side you want to see.
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
                        <Card size="lg" className="p-6 border-border bg-card flex flex-col gap-4">
                            <div className="w-12 h-12 rounded-md bg-primary/10 flex items-center justify-center">
                                <Users className="w-6 h-6 text-primary" />
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold text-foreground mb-1">Staff / Admin Demo</h3>
                                <p className="text-sm text-muted-foreground leading-relaxed">
                                    The employee side: design a floor plan, seat and manage tables, fire orders to the kitchen, then take payment.
                                </p>
                            </div>
                            <ul className="text-sm text-muted-foreground space-y-1.5 flex-1">
                                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-primary shrink-0" />Drag-and-drop floor plan</li>
                                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-primary shrink-0" />Live table status</li>
                                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-primary shrink-0" />Fire to Kitchen, then Pay</li>
                            </ul>
                            <Button
                                size="lg"
                                onClick={goAdminDemo}
                                disabled={adminDemoLoading}
                                className="w-full shadow-md hover:shadow-lg transition-all duration-200"
                            >
                                {adminDemoLoading ? "Signing in…" : "Explore Admin Demo"}
                                <ArrowRight className="ml-2 h-4 w-4" />
                            </Button>
                        </Card>

                        <Card size="lg" className="p-6 border-border bg-card flex flex-col gap-4">
                            <div className="w-12 h-12 rounded-md bg-primary/10 flex items-center justify-center">
                                <ShoppingCart className="w-6 h-6 text-primary" />
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold text-foreground mb-1">Customer Demo</h3>
                                <p className="text-sm text-muted-foreground leading-relaxed">
                                    The guest side: browse Momo &amp; Burger's menu, customize an item, and check out as a diner.
                                </p>
                            </div>
                            <ul className="text-sm text-muted-foreground space-y-1.5 flex-1">
                                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-primary shrink-0" />Browse and customize the menu</li>
                                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-primary shrink-0" />Guest checkout, no account needed</li>
                                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-primary shrink-0" />Embedded Stripe test payment</li>
                            </ul>
                            <Button
                                variant="outline"
                                size="lg"
                                onClick={goCustomerDemo}
                                disabled={customerDemoLoading}
                                className="w-full border-2 hover:bg-accent"
                            >
                                {customerDemoLoading ? "Signing in…" : "Try Customer Experience"}
                            </Button>
                        </Card>
                    </div>
                </div>
            </section>

            {/* 3. Real product workflow screenshots — placeholders until real files land
                in public/screenshots/ with the filenames ProductScreenshots.tsx expects;
                each swaps in automatically once its file exists, no code change needed. */}
            <ProductScreenshots />

            {/* 4. The problem this solves */}
            <section id="problem" className="py-16 lg:py-24 border-t border-border">
                <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-start">
                        <div className="space-y-4">
                            <h2 className="text-3xl sm:text-4xl text-foreground leading-tight">Restaurant Software Is Usually a Patchwork</h2>
                            <p className="text-lg text-muted-foreground leading-relaxed">
                                A floor-plan app that doesn't know about the menu. A POS that doesn't know about inventory. A payment
                                processor bolted on after the fact. Spoontab is one event-driven system spanning floor management,
                                ordering, kitchen fulfillment, and payment — built to show what that actually looks like end to end,
                                including the parts most demos skip.
                            </p>
                        </div>

                        <div>
                            {PROBLEM_POINTS.map((p) => (
                                <IconTextRow key={p.title} title={p.title} description={p.description} />
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* 5. Architecture and engineering decisions */}
            <section id="architecture" className="py-16 lg:py-24 border-t border-border">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <SectionHeader
                        variant="technical"
                        eyebrow="Under the Hood"
                        title="Built on a Real Microservices Architecture"
                        description="Four independently deployable .NET services, a MassTransit saga coordinating order fulfillment, and observability wired in — the way production restaurant systems actually get built."
                        className="mb-12"
                    />

                    <ServiceFlowDiagram services={SERVICES} className="max-w-4xl" />

                    <div className="flex justify-center mt-10">
                        <Button variant="outline" size="lg" asChild className="text-lg px-8 py-4 border-2 hover:bg-accent">
                            <Link to="/engineering">
                                View Engineering Details
                                <ArrowRight className="ml-2 h-5 w-5" />
                            </Link>
                        </Button>
                    </div>
                </div>
            </section>

            {/* 6. GitHub / project CTA */}
            <section id="cta" className="py-16 lg:py-20 border-t border-border relative overflow-hidden">
                <div className="relative max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
                    <div className="space-y-8">
                        <h2 className="text-3xl sm:text-4xl lg:text-5xl text-foreground leading-tight">See the Full Picture</h2>
                        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                            Full source is on GitHub — every service, migration, and workflow described above is really there.
                        </p>

                        <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
                            <Button size="lg" asChild className="text-lg px-10 py-4 shadow-md hover:shadow-lg transition-all duration-200">
                                <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer">
                                    <GithubIcon className="mr-2 h-5 w-5" />
                                    View on GitHub
                                </a>
                            </Button>
                            <Button variant="outline" size="lg" onClick={() => scrollToId("demos")} className="text-lg px-10 py-4 border-2 hover:bg-accent">
                                Back to the Demos
                            </Button>
                        </div>

                        <a href="mailto:snehabasnet224@gmail.com?subject=Let%27s%20Talk" className="inline-block text-base font-medium text-muted-foreground hover:text-foreground">
                            Or get in touch to talk through the engineering decisions
                        </a>
                    </div>
                </div>
            </section>

            {/* 7. Developer attribution */}
            <AppFooter onCta={go} />
        </div>
    );
}
