import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
    ArrowRight, CheckCircle2, Users, ShoppingCart,
} from "lucide-react";
import { GithubIcon } from "@/components/brand-icons/github-icon";
import { AppFooter } from "@/components/AppFooter";
import { SectionHeader } from "@/components/primitives/SectionHeader";
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
    { name: "Identity", highlight: "Accounts · roles · tenant context" },
    { name: "Catalog", highlight: "Menu · modifiers · inventory" },
    { name: "Order", highlight: "Tickets · fulfillment · saga" },
    { name: "Payment", highlight: "Checkout · Stripe" },
];

const ARCHITECTURE_DECISIONS = [
    {
        title: "Tenant scoping",
        description: "Restaurant and location scope is enforced at the database layer via EF Core query filters.",
    },
    {
        title: "Event-driven fulfillment",
        description: "MassTransit events connect inventory and ordering while the order saga owns long-running fulfillment state.",
    },
    {
        title: "Payment boundary",
        description: "Checkout runs as a separate workflow, keeping payment state and failures out of order fulfillment.",
    },
];

const GITHUB_URL = "https://github.com/basnets24/restaurant.pos";

function scrollToId(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

export default function LandingView() {
    useDocumentTitle("Spoontab");
    const navigate = useNavigate();
    const location = useLocation();
    const { isAuthenticated, signInDemoAdmin } = useAuth();
    const [adminDemoLoading, setAdminDemoLoading] = useState(false);
    const [customerDemoLoading, setCustomerDemoLoading] = useState(false);

    // Lets other pages (e.g. Engineering's "See the Live Demos") link straight to
    // /#demos instead of duplicating the two one-click demo triggers below.
    useEffect(() => {
        if (location.hash === "#demos") scrollToId("demos");
    }, [location.hash]);

    const logIn = () => {
        if (isAuthenticated) return navigate("/home");
        const returnUrl = `${window.location.origin}/home`;
        navigate(`${AuthorizationPaths.Login}?${QueryParameterNames.ReturnUrl}=${encodeURIComponent(returnUrl)}`);
    };

    const goAdminDemo = async () => {
        setAdminDemoLoading(true);
        try {
            await signInDemoAdmin();
            navigate("/home");
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
            {/* 1. Hero — honest, project-focused */}
            <section className="relative overflow-hidden lg:min-h-[92vh] lg:flex lg:flex-col bg-background texture-paper">
                <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-20 sm:pt-8 lg:pb-16 lg:flex lg:flex-col lg:flex-1 w-full">
                    {/* Not a nav bar - just the brand mark and a small, unobtrusive Log In link
                        so real staff (not the one-click demo flows below) can still reach the
                        sign-in page. Lives in the hero, not sticky, no dividing line. */}
                    <div className="flex items-center justify-between mb-16 lg:mb-0">
                        <span className="font-display text-3xl text-foreground">Spoontab</span>
                        <Button type="button" variant="outline" size="lg" onClick={logIn} className="text-lg px-6 py-5 rounded-none">
                            Log In
                        </Button>
                    </div>

                    <div className="relative flex flex-col items-center lg:flex-1 lg:items-stretch lg:justify-center">
                        <img
                            src="/cutlery.png"
                            alt=""
                            className="w-72 sm:w-96 lg:hidden order-first mx-auto"
                        />
                        <img
                            src="/cutlery.png"
                            alt=""
                            className="hidden lg:block absolute left-0 top-1/2 -translate-x-1/4 translate-y-[calc(-50%+8rem)] w-[70%] max-w-4xl pointer-events-none select-none"
                        />

                        <div className="text-center lg:text-left lg:ml-[44%]">
                            <h1 className="text-4xl sm:text-5xl lg:text-7xl text-foreground leading-[1.05] mb-6">
                                Open the floor.
                                <br />
                                Fire the ticket.
                                <br />
                                Close the tab.
                            </h1>
                            <p className="text-xl text-muted-foreground leading-relaxed max-w-xl mx-auto lg:mx-0 mb-8">
                                A working restaurant operations system for managing the floor, orders, kitchen fulfillment, and checkout. Explore it as staff or place an order as a guest.
                            </p>

                            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-4 mb-6">
                                <Button
                                    size="lg"
                                    onClick={goAdminDemo}
                                    disabled={adminDemoLoading}
                                    className="text-xl px-10 py-6 rounded-none shadow-md hover:shadow-lg transition-all duration-200"
                                >
                                    {adminDemoLoading ? "Signing in…" : "Explore staff demo"}
                                </Button>
                                {/* PROTOTYPE: fig accent, matching the Guest Demo card below —
                                    this is the same action ("order as a guest") appearing twice
                                    on the page, so it should carry the same accent — see brand.css */}
                                <Button
                                    size="lg"
                                    onClick={goCustomerDemo}
                                    disabled={customerDemoLoading}
                                    className="text-xl px-10 py-6 rounded-none shadow-md hover:shadow-lg transition-all duration-200 bg-fig-base text-white hover:bg-fig-strong"
                                >
                                    {customerDemoLoading ? "Signing in…" : "Order as a guest"}
                                </Button>
                            </div>

                            <p className="mt-10">
                                <Link
                                    to="/engineering"
                                    className="font-display italic text-xl text-[var(--rust-600)] hover:text-foreground transition-colors"
                                >
                                    Read the engineering case study{" "}
                                    <ArrowRight className="inline h-5 w-5 -mt-1" />
                                </Link>
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* 2. Two clearly labeled live demos */}
            <section id="demos" className="py-12 lg:py-16 border-t border-border">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <p className="text-lg text-muted-foreground max-w-4xl mx-auto mb-8">
                        Two experiences. One restaurant system underneath. Pick the side you want to see.
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
                        <Card size="lg" className="p-6 border-border bg-card flex flex-col gap-4">
                            <div className="w-12 h-12 rounded-md bg-primary/10 flex items-center justify-center">
                                <Users className="w-6 h-6 text-primary" />
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold text-foreground mb-1">Staff Demo</h3>
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
                                {adminDemoLoading ? "Signing in…" : "Explore Staff Demo"}
                                <ArrowRight className="ml-2 h-4 w-4" />
                            </Button>
                        </Card>

                        {/* PROTOTYPE: fig accent (--fig-strong/base/soft, brand.css) swapped in for
                            this card only, in place of the shared olive --primary, to test the
                            candidate secondary accent against the Staff Demo card side by side. */}
                        <Card size="lg" className="p-6 border-border bg-card flex flex-col gap-4">
                            <div className="w-12 h-12 rounded-md bg-fig-soft flex items-center justify-center">
                                <ShoppingCart className="w-6 h-6 text-fig-medium" />
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold text-foreground mb-1">Guest Demo</h3>
                                <p className="text-sm text-muted-foreground leading-relaxed">
                                    The guest side: browse Momo &amp; Burger's menu, customize an item, and check out as a diner.
                                </p>
                            </div>
                            <ul className="text-sm text-muted-foreground space-y-1.5 flex-1">
                                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-fig-medium shrink-0" />Browse and customize the menu</li>
                                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-fig-medium shrink-0" />Guest checkout, no account needed</li>
                                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-fig-medium shrink-0" />Embedded Stripe test payment</li>
                            </ul>
                            <Button
                                size="lg"
                                onClick={goCustomerDemo}
                                disabled={customerDemoLoading}
                                className="w-full shadow-md hover:shadow-lg transition-all duration-200 bg-fig-base text-white hover:bg-fig-strong"
                            >
                                {customerDemoLoading ? "Signing in…" : "Explore Guest Demo"}
                                <ArrowRight className="ml-2 h-4 w-4" />
                            </Button>
                        </Card>
                    </div>
                </div>
            </section>

            {/* 3. Real product workflow screenshots — placeholders until real files land
                in public/screenshots/ with the filenames ProductScreenshots.tsx expects;
                each swaps in automatically once its file exists, no code change needed. */}
            <ProductScreenshots />

            {/* 4. Architecture and engineering decisions */}
            <section id="architecture" className="py-12 lg:py-16 border-t border-border">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <SectionHeader
                        variant="technical"
                        eyebrow="Under the Hood"
                        title="Four services. One restaurant workflow."
                        description="Spoontab is split across four independently deployable .NET services for identity, catalog, ordering, and payment. MassTransit coordinates fulfillment across service boundaries, with tenant isolation and observability built in."
                        className="mb-10"
                        wide
                    />

                    <ServiceFlowDiagram services={SERVICES} className="max-w-4xl mb-12" />

                    <div className="max-w-4xl">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-3xl mx-auto">
                            {ARCHITECTURE_DECISIONS.map((d) => (
                                <div key={d.title} className="rounded-lg border border-border bg-card p-5">
                                    <h3 className="text-sm font-semibold text-foreground mb-1.5">{d.title}</h3>
                                    <p className="text-sm text-muted-foreground leading-relaxed">{d.description}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* 5. GitHub / project CTA */}
            <section id="cta" className="py-12 lg:py-16 border-t border-border relative overflow-hidden">
                <div className="relative max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
                    <div className="space-y-8">
                        <h2 className="text-3xl sm:text-4xl lg:text-5xl text-foreground leading-tight">See the Code Behind It</h2>
                        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                            The complete source is public, including all four services, database migrations, message contracts, saga state, tests, and deployment configuration.
                        </p>

                        <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
                            <Button size="lg" asChild className="text-lg px-10 py-4 shadow-md hover:shadow-lg transition-all duration-200">
                                <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer">
                                    <GithubIcon className="mr-2 h-5 w-5" />
                                    View source on GitHub
                                </a>
                            </Button>
                            <Button variant="outline" size="lg" asChild className="text-lg px-10 py-4 border-2 hover:bg-accent">
                                <Link to="/engineering">
                                    Read the engineering case study
                                    <ArrowRight className="ml-2 h-5 w-5" />
                                </Link>
                            </Button>
                        </div>
                    </div>
                </div>
            </section>

            {/* 6. Developer attribution */}
            <AppFooter />
        </div>
    );
}
