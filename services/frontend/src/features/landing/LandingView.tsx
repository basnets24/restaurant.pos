import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
    Star, ArrowRight, CheckCircle2, Zap, Users, Menu as MenuIcon,
    ShoppingCart, CreditCard, Code2, PlayCircle,
} from "lucide-react";
import { GithubIcon } from "@/components/brand-icons/github-icon";
import { AppFooter } from "@/components/AppFooter";
import { useAuth } from "@/api-authorization/AuthProvider";
import { AuthorizationPaths, QueryParameterNames } from "@/api-authorization/ApiAuthorizationConstants";
import { DinerAuth } from "@/features/diner/auth/dinerAuth";
import { DEMO_DINER_EMAIL, DEMO_DINER_PASSWORD } from "@/features/landing/demoCredentials";

// Matches the restaurant/location tenant IDs scripts/seed-demo.sh creates.
const DEMO_RESTAURANT_ID = "momo-and-burger";
const DEMO_LOCATION_ID = "main";

const SERVICES = [
    { icon: Users, name: "Identity", highlight: "OAuth2 · multi-tenant" },
    { icon: MenuIcon, name: "Catalog", highlight: "Event-published inventory" },
    { icon: ShoppingCart, name: "Order", highlight: "Saga-orchestrated" },
    { icon: CreditCard, name: "Payment", highlight: "Stripe, no webhooks" },
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

const EYEBROW = "bg-primary/10 text-primary border-primary/20 px-4 py-2";

function scrollToId(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

export default function LandingView() {
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
            {/* No full nav bar on this page - just a small, unobtrusive Log In link so real
                staff (not the one-click demo flows below) can still reach the sign-in page.
                pointer-events-none on the wrapper keeps it from blocking hero content it
                overlaps; pointer-events-auto on the button opts back in. */}
            <div className="sticky top-0 z-40 flex justify-end px-4 sm:px-6 lg:px-8 py-3 pointer-events-none">
                <Button variant="outline" size="sm" onClick={logIn} className="pointer-events-auto">Log In</Button>
            </div>

            {/* 1. Hero — honest, project-focused */}
            <section className="relative overflow-hidden">
                <div className="absolute inset-0 bg-brand-soft/30" />
                <div className="relative max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-28 text-center">
                    <Badge className={`${EYEBROW} mb-6`}>
                        <Star className="w-4 h-4 mr-2" />
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
            <section id="demos" className="py-20 lg:py-28 bg-muted/30">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center max-w-2xl mx-auto space-y-4 mb-12">
                        <Badge className={EYEBROW}>
                            <Zap className="w-4 h-4 mr-2" />
                            Live Demos
                        </Badge>
                        <h2 className="text-3xl sm:text-4xl text-foreground leading-tight">Two Views Into the Same System</h2>
                        <p className="text-lg text-muted-foreground">
                            Same four services underneath — pick the side you want to see.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
                        <Card className="p-6 border-border bg-card flex flex-col gap-4">
                            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
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

                        <Card className="p-6 border-border bg-card flex flex-col gap-4">
                            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
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

            {/* 3. Real product workflow screenshots — staged as <ProductScreenshots />
                (src/features/landing/ProductScreenshots.tsx), not yet wired in here.
                Drop images into public/screenshots/ matching the filenames in that
                component, then import and render it right below this comment. */}

            {/* 4. The problem this solves */}
            <section id="problem" className="py-20 lg:py-28">
                <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="max-w-2xl space-y-4 mb-12">
                        <Badge className={EYEBROW}>
                            <Zap className="w-4 h-4 mr-2" />
                            The Problem
                        </Badge>
                        <h2 className="text-3xl sm:text-4xl text-foreground leading-tight">Restaurant Software Is Usually a Patchwork</h2>
                        <p className="text-lg text-muted-foreground leading-relaxed">
                            A floor-plan app that doesn't know about the menu. A POS that doesn't know about inventory. A payment
                            processor bolted on after the fact. Spoontab is one event-driven system spanning floor management,
                            ordering, kitchen fulfillment, and payment — built to show what that actually looks like end to end,
                            including the parts most demos skip.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                        {PROBLEM_POINTS.map((p) => (
                            <div key={p.title} className="space-y-1.5">
                                <h3 className="text-base font-semibold text-foreground">{p.title}</h3>
                                <p className="text-sm text-muted-foreground leading-relaxed">{p.description}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* 5. Architecture and engineering decisions */}
            <section id="architecture" className="py-20 lg:py-28 bg-muted/30">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center max-w-2xl mx-auto space-y-4 mb-12">
                        <Badge className={EYEBROW}>
                            <Code2 className="w-4 h-4 mr-2" />
                            Under the Hood
                        </Badge>
                        <h2 className="text-3xl sm:text-4xl text-foreground leading-tight">Built on a Real Microservices Architecture</h2>
                        <p className="text-lg text-muted-foreground">
                            Four independently deployable .NET services, a MassTransit saga coordinating order fulfillment, and
                            observability wired in — the way production restaurant systems actually get built.
                        </p>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        {SERVICES.map((s) => (
                            <Card key={s.name} className="p-5 text-center flex flex-col items-center gap-2 border-border bg-card">
                                <s.icon className="w-5 h-5 text-primary" />
                                <span className="text-sm font-medium text-foreground">{s.name}</span>
                                <span className="text-xs text-muted-foreground">{s.highlight}</span>
                            </Card>
                        ))}
                    </div>

                    <div className="flex justify-center mt-10">
                        <Button variant="outline" size="lg" asChild className="text-lg px-8 py-4 border-2 hover:bg-accent">
                            <Link to="/engineering">
                                View the Architecture
                                <ArrowRight className="ml-2 h-5 w-5" />
                            </Link>
                        </Button>
                    </div>
                </div>
            </section>

            {/* 6. GitHub / project CTA */}
            <section id="cta" className="py-20 lg:py-28 bg-brand-soft/30 relative overflow-hidden">
                <div className="relative max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
                    <div className="space-y-8">
                        <Badge className="bg-primary/20 text-primary border-primary/30 px-4 py-2">
                            <PlayCircle className="w-4 h-4 mr-2" />
                            Explore Further
                        </Badge>
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
