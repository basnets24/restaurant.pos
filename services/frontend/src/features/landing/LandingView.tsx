import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { GithubIcon } from "@/components/brand-icons/github-icon";
import { AppFooter } from "@/components/AppFooter";
import { useAuth } from "@/api-authorization/AuthProvider";
import { AuthorizationPaths, QueryParameterNames } from "@/api-authorization/ApiAuthorizationConstants";
import { DinerAuth } from "@/features/diner/auth/dinerAuth";
import { DEMO_DINER_EMAIL, DEMO_DINER_PASSWORD } from "@/features/landing/demoCredentials";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";

const FLOOR_FEATURES = ["Plan the floor", "Track live tables", "Fulfill orders", "Close the tab"];
const PICKUP_FEATURES = ["Browse", "Customize", "Checkout", "Pick up"];

// Deliberately no connecting arrows between services — see ServiceFlowDiagram's
// prior rationale (now folded into this section): the four services talk over
// events (MassTransit/RabbitMQ), not a linear call chain, and arrows here would
// misrepresent the architecture as a request pipeline.
const SERVICES = [
    { num: "01", name: "Identity", items: ["Accounts", "Roles", "Tenant context"] },
    { num: "02", name: "Catalog", items: ["Menu", "Modifiers", "Inventory"] },
    { num: "03", name: "Order", items: ["Tickets", "Fulfillment", "Saga"] },
    { num: "04", name: "Payment", items: ["Checkout", "Stripe"] },
];

const ARCHITECTURE_DECISIONS = [
    {
        title: "Tenant scoping",
        description: "Every request is scoped by tenant from the API down to the database.",
    },
    {
        title: "Event-driven fulfillment",
        description: "Events move the order through each service while the saga keeps its long-running state together.",
    },
    {
        title: "Payment boundary",
        description: "Checkout runs on its own, keeping payment failures separate from order fulfillment.",
    },
];

const GITHUB_URL = "https://github.com/basnets24/restaurant.pos";

// Framed as an invitation to go verify, not just a list of artifacts —
// what a reviewer can actually open and check for themselves.
const SOURCE_ITEMS = [
    "CI pipelines",
    "Database schema",
    "Event contracts",
    "Test coverage",
    "Infra configuration",
];

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
            navigate("/order");
        } catch {
            toast.error("Could not start the customer demo. Please try again.");
        } finally {
            setCustomerDemoLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-background texture-paper">
            {/* 1. Hero — headline + CTAs left, full-bleed cutlery photo right. On lg+,
                the photo runs from the very top of the page (behind the brand bar)
                the full height of the hero, feathering into the page background
                gradually (no hard edge) and into a top scrim so the brand bar stays
                legible over it. */}
            <section className="relative lg:overflow-hidden">
                <div className="hidden lg:block absolute inset-y-0 right-0 w-[62%] overflow-hidden">
                    <img
                        src="/landing/spoon.jpg"
                        alt="Vintage spoon and forks on a warm wooden table"
                        className="w-full h-full object-cover"
                        style={{
                            objectPosition: "65% center",
                            WebkitMaskImage: "linear-gradient(90deg, transparent 0%, black 42%, black 100%)",
                            maskImage: "linear-gradient(90deg, transparent 0%, black 42%, black 100%)",
                        }}
                    />
                    <div
                        className="absolute inset-x-0 top-0 h-24 pointer-events-none"
                        style={{
                            background: "linear-gradient(180deg, rgba(20,13,8,0.35) 0%, transparent 100%)",
                            WebkitMaskImage: "linear-gradient(90deg, transparent 0%, black 42%, black 100%)",
                            maskImage: "linear-gradient(90deg, transparent 0%, black 42%, black 100%)",
                        }}
                    />
                </div>

                {/* Brand mark + Log In — not a nav bar, just an unobtrusive way for real
                    staff (not the one-click demo flows below) to reach sign-in. Overlaid
                    on the photo at every breakpoint: absolute (no flow height) on mobile
                    so it floats over the stacked image below, back to normal flow on lg
                    so it doesn't eat into the text column's vertical centering. */}
                <div className="absolute inset-x-0 top-0 z-20 lg:relative lg:z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between py-6">
                    <span className="inline-flex items-center gap-2.5">
                        <img src="/favicon.svg" alt="" className="h-8 w-8" />
                        <span className="font-display text-4xl text-white lg:text-foreground">Spoontab</span>
                    </span>
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={logIn}
                        className="text-sm px-4 py-2 rounded-none text-white border-none bg-transparent hover:bg-white/10 shadow-[inset_0_-1px_0_0_rgba(255,255,255,0.7)]"
                    >
                        Log In
                    </Button>
                </div>

                <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2">
                    <div
                        className="order-2 lg:order-1 flex flex-col justify-center px-4 sm:px-6 lg:pr-12 py-10 lg:py-16 lg:min-h-[540px]"
                        style={{ paddingLeft: "max(1rem, calc((100vw - 80rem) / 2 + 2rem))" }}
                    >
                        <h1 className="text-4xl sm:text-5xl lg:text-6xl text-foreground leading-[1.05] mb-6">
                            Open the floor.
                            <br />
                            Fire the ticket.
                            <br />
                            Close the tab.
                        </h1>
                        <p className="text-xl text-muted-foreground leading-relaxed max-w-xl mb-8">
                            A working restaurant operations system for managing the floor, orders, kitchen fulfillment, and checkout. Explore it as staff or place an order as a guest.
                        </p>

                        <div className="flex flex-wrap items-center gap-4 mb-6">
                            <Button
                                size="lg"
                                onClick={goAdminDemo}
                                disabled={adminDemoLoading}
                                className="text-xl px-10 py-6 rounded-none shadow-md hover:shadow-lg transition-all duration-200"
                            >
                                {adminDemoLoading ? "Signing in…" : "Explore staff demo"}
                            </Button>
                            <Button
                                size="lg"
                                onClick={goCustomerDemo}
                                disabled={customerDemoLoading}
                                className="text-xl px-10 py-6 rounded-none shadow-md hover:shadow-lg transition-all duration-200 bg-fig-base text-white hover:bg-fig-strong"
                            >
                                {customerDemoLoading ? "Signing in…" : "Order as a guest"}
                            </Button>
                        </div>

                        <Link
                            to="/engineering"
                            className="font-display italic text-xl text-[var(--rust-600)] hover:text-foreground transition-colors"
                        >
                            Read the engineering case study{" "}
                            <ArrowRight className="inline h-5 w-5 -mt-1" />
                        </Link>
                    </div>

                    <div className="order-1 lg:hidden relative h-[340px] overflow-hidden">
                        <img
                            src="/landing/spoon.jpg"
                            alt="Vintage spoon and forks on a warm wooden table"
                            className="w-full h-full object-cover"
                            style={{ objectPosition: "65% center" }}
                        />
                        <div
                            className="absolute inset-x-0 top-0 h-24 pointer-events-none"
                            style={{ background: "linear-gradient(180deg, rgba(20,13,8,0.45) 0%, transparent 100%)" }}
                        />
                    </div>
                </div>
            </section>

            {/* 2. Floor — dining room photo bleeds to the true left edge of the
                viewport (same trick as the hero) instead of sitting in a rounded,
                padded card; the text column stays aligned with the rest of the
                page's 7xl content width via matching right-side padding. */}
            <div className="border-t border-border">
                <section id="demos" className="grid grid-cols-1 lg:grid-cols-2 lg:h-[470px] lg:overflow-hidden">
                    <div className="h-[340px] lg:h-full overflow-hidden">
                        <img
                            src="/landing/restaurant-bg.jpeg"
                            alt="Warmly lit restaurant dining room with set tables"
                            className="w-full h-full object-cover scale-125"
                        />
                    </div>
                    <div
                        className="flex flex-col justify-center lg:justify-start lg:h-full lg:min-h-0 lg:pt-14 px-4 sm:px-6 lg:pl-14 py-10 lg:py-0"
                        style={{ paddingRight: "max(1rem, calc((100vw - 80rem) / 2 + 2rem))" }}
                    >
                        <span className="block text-xs font-mono uppercase tracking-wide text-brand mb-2">
                            01 / Floor
                        </span>
                        <h2 className="text-3xl sm:text-4xl text-foreground leading-tight mb-3">
                            Run the dining room.
                        </h2>
                        {/* The negative margin-right lives on this row (a stretched flex
                            item), not on the image — stretch already subtracts margin from
                            the available width, so a negative margin here legitimately
                            widens the row past the column's padding to the true right edge.
                            The list stays at the row's natural start (left-aligned with the
                            heading above it); only the image gets ml-auto, so it alone
                            chases the right edge instead of dragging the list along with it
                            (which is what justify-end on the whole row used to do). */}
                        <div
                            className="flex flex-col lg:flex-row lg:items-center gap-6 lg:gap-8 lg:mr-[calc(-1*max(1rem,calc((100vw-80rem)/2+2rem)))]"
                        >
                            <ul className="grid grid-cols-1 gap-x-6 max-w-none lg:max-w-[160px] shrink-0">
                                {FLOOR_FEATURES.map((f) => (
                                    <li key={f} className="py-2 border-b border-border text-muted-foreground">
                                        {f}
                                    </li>
                                ))}
                            </ul>
                            <img
                                src="/landing/tablet.png"
                                alt="Hands holding a tablet showing the Spoontab staff menu screen"
                                className="w-full max-w-[280px] sm:max-w-[420px] lg:max-w-[340px] shrink-0 ml-auto"
                                style={{ filter: "drop-shadow(0 18px 24px rgba(43,29,11,0.18))" }}
                            />
                        </div>
                    </div>
                </section>
            </div>

            {/* 3. Ticket — kitchen photo full-bleed to the right edge, a narrow text
                column on the left (wider ratio than the Floor section's half/half
                split above it). */}
            <section className="grid grid-cols-1 lg:grid-cols-[1fr_2.5fr] lg:h-[400px]">
                {/* order-* keeps the photo first in DOM/mobile stacking (matching the
                    Floor and Pickup sections' image-then-text order) while restoring
                    the desktop text-left/photo-right layout via lg:order. */}
                <div className="order-1 lg:order-2 h-[280px] lg:h-full overflow-hidden">
                    <img
                        src="/landing/tickets.jpeg"
                        alt="Chef handling order tickets in a restaurant kitchen"
                        className="w-full h-full object-cover"
                    />
                </div>
                <div
                    className="order-2 lg:order-1 flex flex-col justify-center px-4 sm:px-6 lg:pr-10 py-10 lg:py-0"
                    style={{ paddingLeft: "max(1rem, calc((100vw - 80rem) / 2 + 2rem))" }}
                >
                    <span className="block text-xs font-mono uppercase tracking-wide text-muted-foreground mb-2">
                        02 / Ticket
                    </span>
                    <h2 className="text-3xl sm:text-4xl text-foreground leading-tight mb-4">
                        Fire the ticket.
                    </h2>
                    <p className="text-muted-foreground max-w-xs">
                        Orders move from the table into kitchen fulfillment.
                    </p>
                    <div className="mt-4 h-0.5 w-10 bg-border" />
                </div>
            </section>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            </div>

            {/* 4. Pickup — menu + phone photo full-bleed to the left edge, text
                column with a divider list on the right (same full-bleed pattern as
                the Floor and Ticket sections above it). */}
            <section className="grid grid-cols-1 lg:grid-cols-2 lg:h-[400px]">
                <div className="h-[340px] lg:h-full overflow-hidden">
                    <img
                        src="/landing/menu-mobile.png"
                        alt="Printed menu next to a phone showing the Spoontab guest ordering app"
                        className="w-full h-full object-cover"
                        style={{ objectPosition: "center 100%" }}
                    />
                </div>
                <div
                    className="flex flex-col justify-center px-4 sm:px-6 lg:pl-14 py-10 lg:py-0"
                    style={{ paddingRight: "max(1rem, calc((100vw - 80rem) / 2 + 2rem))" }}
                >
                    <span className="block text-xs font-mono uppercase tracking-wide text-fig-base mb-2">
                        03 / Pickup
                    </span>
                    <h2 className="text-3xl sm:text-4xl text-foreground leading-tight mb-6">
                        Order ahead for pickup.
                    </h2>
                    <ul className="max-w-xs">
                        {PICKUP_FEATURES.map((f) => (
                            <li key={f} className="py-2 border-b border-border text-muted-foreground">
                                {f}
                            </li>
                        ))}
                    </ul>
                </div>
            </section>

            {/* 5. Underneath — dark, photo-backed architecture band. */}
            <section className="relative overflow-hidden text-white">
                <div className="absolute inset-0">
                    <img
                        src="/landing/backofhouse.jpeg"
                        alt="Restaurant kitchen with hanging ladles"
                        className="w-full h-full object-cover"
                        style={{ filter: "saturate(0.85) brightness(1)" }}
                    />
                    {/* Lighter over the heading so the kitchen photo stays legible there,
                        ramping to the original dark, near-opaque scrim by the point the
                        services grid starts so that part reads exactly as before. */}
                    <div
                        className="absolute inset-0"
                        style={{
                            background:
                                "linear-gradient(180deg, rgba(20,13,8,0.05) 0%, rgba(20,13,8,0.25) 20%, rgba(20,13,8,0.82) 38%, rgba(20,13,8,0.88) 100%)",
                        }}
                    />
                </div>

                <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-28">
                    <span className="block text-xs font-mono uppercase tracking-wide mb-2" style={{ color: "var(--ochre-500)" }}>
                        04 / Underneath
                    </span>
                    <h2 className="text-4xl sm:text-5xl text-white leading-tight mb-4 max-w-xl">
                        Architecture behind the flow.
                    </h2>
                    <p className="text-white/70 max-w-xl mb-10 lg:mb-14">
                        Spoontab is split across four independently deployable .NET services for identity, catalog, ordering, and payment. MassTransit coordinates fulfillment across service boundaries.
                    </p>

                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-10" role="list" aria-label="Independent services">
                        {SERVICES.map((s) => (
                            <div key={s.name} role="listitem" className="pt-5 border-t border-white/25">
                                <div className="font-mono text-xs" style={{ color: "var(--ochre-500)" }}>{s.num}</div>
                                <h3 className="text-2xl text-white mt-2">{s.name}</h3>
                                <p className="text-sm text-white/70 leading-relaxed mt-2">
                                    {s.items.map((item, i) => (
                                        <span key={item}>
                                            {item}
                                            {i < s.items.length - 1 && <br />}
                                        </span>
                                    ))}
                                </p>
                            </div>
                        ))}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 lg:gap-14 mt-10 pt-6 border-t border-white/25">
                        {ARCHITECTURE_DECISIONS.map((d) => (
                            <div key={d.title}>
                                <h3 className="text-sm font-semibold text-white">{d.title}</h3>
                                <p className="text-sm text-white/70 leading-relaxed mt-2">{d.description}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* 6. Source — GitHub / case-study CTA. Same warm gradient direction as
                the hero's photo fade (light on the left, deepening on the right),
                built from the same sand palette instead of a photo. */}
            <section
                className="border-t border-border"
                style={{ background: "linear-gradient(90deg, var(--background) 0%, color-mix(in srgb, var(--sand-100) 55%, var(--background)) 60%, color-mix(in srgb, var(--sand-100) 85%, var(--background)) 100%)" }}
            >
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-24 grid grid-cols-1 lg:grid-cols-[3fr_2fr_3fr] gap-10 lg:gap-0">
                    <div>
                        <span className="block text-xs font-mono uppercase tracking-wide text-muted-foreground mb-2">
                            05 / Source
                        </span>
                        <h2 className="text-4xl sm:text-5xl text-foreground leading-tight mb-4">
                            Inspect the source code.
                        </h2>
                        <div className="h-0.5 w-10 bg-border" />
                    </div>

                    <div className="lg:border-l lg:border-border lg:pl-10">
                        <ul className="text-muted-foreground">
                            {SOURCE_ITEMS.map((item) => (
                                <li key={item}>{item}</li>
                            ))}
                        </ul>
                    </div>

                    <div className="grid gap-3.5 content-start">
                        <Button
                            variant="outline"
                            size="lg"
                            asChild
                            className="text-lg px-8 py-6 justify-between rounded-none border-2 hover:bg-brand-strong hover:border-brand-strong hover:text-white transition-colors"
                        >
                            <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer">
                                <span className="flex items-center">
                                    <GithubIcon className="mr-2 h-5 w-5" />
                                    View source on GitHub
                                </span>
                                <ArrowRight className="h-5 w-5" />
                            </a>
                        </Button>
                        <Button
                            variant="outline"
                            size="lg"
                            asChild
                            className="text-lg px-8 py-6 justify-between rounded-none border-2 border-fig-base text-fig-base hover:bg-fig-strong hover:border-fig-strong hover:text-white transition-colors"
                        >
                            <Link to="/engineering">
                                Read the engineering case study
                                <ArrowRight className="h-5 w-5" />
                            </Link>
                        </Button>
                    </div>
                </div>
            </section>

            {/* 7. Developer attribution */}
            <AppFooter />
        </div>
    );
}
