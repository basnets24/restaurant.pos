import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ImageWithFallback } from "@/figma/ImageWithFallback";
import {
    Star, ArrowRight, CheckCircle2, Zap, Users, Menu as MenuIcon,
    ShoppingCart, CreditCard, BarChart3, Code2, Clock, PlayCircle,
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

const HERO_IMAGE = "https://images.unsplash.com/photo-1669131196140-49591336b13e?auto=format&fit=crop&w=1200&q=80";
const FEATURE_IMAGE = "https://images.unsplash.com/photo-1609951734391-b79a50460c6c?auto=format&fit=crop&w=1200&q=80";

const FEATURES = [
    {
        icon: Users, title: "Interactive Table Management", highlight: "Visual Floor Plan", featured: true, image: FEATURE_IMAGE,
        description: "Drag-and-drop floor plan editor with real-time table status tracking. Manage seating and capacity with intuitive visual controls.",
    },
    {
        icon: MenuIcon, title: "Smart Menu System", highlight: "Easy Ordering", featured: false,
        description: "Organized menu categories with item customization and instant availability updates. Built for complex restaurant menus.",
    },
    {
        icon: CreditCard, title: "Streamlined Checkout", highlight: "Fast Payment", featured: false,
        description: "Embedded Stripe payments with automatic tax calculation and receipt generation. Complete transactions in seconds.",
    },
    {
        icon: BarChart3, title: "Order Analytics", highlight: "Business Insights", featured: true, image: FEATURE_IMAGE,
        description: "Track performance metrics, popular items, and revenue patterns to make data-driven decisions for your restaurant.",
    },
];

const SERVICES = [
    { icon: Users, name: "Identity", highlight: "OAuth2 · multi-tenant" },
    { icon: MenuIcon, name: "Catalog", highlight: "Event-published inventory" },
    { icon: ShoppingCart, name: "Order", highlight: "Saga-orchestrated" },
    { icon: CreditCard, name: "Payment", highlight: "Stripe, no webhooks" },
];

const GITHUB_URL = "https://github.com/basnets24/restaurant.pos";

const EYEBROW = "bg-primary/10 text-primary border-primary/20 px-4 py-2";

export default function LandingView() {
    const navigate = useNavigate();
    const { isAuthenticated, signInDemoAdmin } = useAuth();
    const [demoOpen, setDemoOpen] = useState(false);
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
            {/* Header */}
            <header
                className="sticky top-0 z-40 border-b border-border"
                style={{
                    background: "color-mix(in srgb, var(--olive-300) 90%, transparent)",
                    backdropFilter: "blur(8px)",
                    WebkitBackdropFilter: "blur(8px)",
                }}
            >
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 shrink-0 bg-primary rounded-[10px] flex items-center justify-center">
                            <span className="text-primary-foreground font-bold text-xs">RMS</span>
                        </div>
                        <span className="text-lg font-semibold text-foreground">Spoontab</span>
                    </div>
                    <nav className="hidden md:flex items-center gap-7">
                        <a href="#features" className="text-sm font-medium text-muted-foreground hover:text-foreground">Features</a>
                        <Link to="/engineering" className="text-sm font-medium text-muted-foreground hover:text-foreground">Engineering</Link>
                        <a href="#cta" className="text-sm font-medium text-muted-foreground hover:text-foreground">Get Started</a>
                    </nav>
                    <Button variant="outline" onClick={logIn}>Log In</Button>
                </div>
            </header>

            {/* Hero */}
            <section className="relative overflow-hidden">
                <div className="absolute inset-0 bg-brand-soft/30" />
                <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-28">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
                        <div className="space-y-8">
                            <div className="space-y-4">
                                <Badge className={EYEBROW}>
                                    <Star className="w-4 h-4 mr-2" />
                                    Modern Restaurant Technology
                                </Badge>
                                <h1 className="text-4xl sm:text-5xl lg:text-6xl text-foreground leading-tight">
                                    Run the Floor
                                    <span className="block italic text-brand-strong">Without the Chaos</span>
                                </h1>
                                <p className="text-xl text-muted-foreground leading-relaxed max-w-lg">
                                    One system for orders, kitchen, staff, and sales.
                                </p>
                            </div>

                            <div className="flex flex-col sm:flex-row gap-4">
                                <Button size="lg" onClick={go} className="text-lg px-8 py-4 shadow-md hover:shadow-lg transition-all duration-200">
                                    Start Free Trial
                                    <ArrowRight className="ml-2 h-5 w-5" />
                                </Button>
                                <Button
                                    variant="outline"
                                    size="lg"
                                    className="text-lg px-8 py-4 border-2 hover:bg-accent"
                                    onClick={() => setDemoOpen(true)}
                                >
                                    Watch Demo
                                </Button>
                            </div>
                            <p className="text-sm text-muted-foreground">Free 14-day trial &middot; No credit card required &middot; Cancel anytime</p>

                            <div className="flex items-center gap-6 pt-2">
                                <div className="flex items-center gap-2">
                                    <CheckCircle2 className="w-5 h-5 text-primary" />
                                    <span className="text-muted-foreground">No installation required</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <CheckCircle2 className="w-5 h-5 text-primary" />
                                    <span className="text-muted-foreground">Works on any device</span>
                                </div>
                            </div>
                        </div>

                        <div className="relative">
                            <Card className="relative overflow-hidden shadow-md border border-border bg-card">
                                <CardContent className="p-0">
                                    <ImageWithFallback
                                        src={HERO_IMAGE}
                                        alt="Modern restaurant interior"
                                        className="w-full h-96 object-cover rounded-t-xl"
                                    />
                                    <div className="p-6 bg-card space-y-4">
                                        <div>
                                            <h3 className="font-medium text-foreground">Live Demo Available</h3>
                                            <p className="text-sm text-muted-foreground">Two ways to experience it</p>
                                        </div>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            <div className="rounded-lg border border-border p-4 flex flex-col gap-2">
                                                <span className="text-sm font-medium text-foreground">Business View</span>
                                                <span className="text-xs text-muted-foreground">Staff POS — floor plan, ordering, kitchen, payments</span>
                                                <Button size="sm" className="mt-1 shadow-md" onClick={goAdminDemo} disabled={adminDemoLoading}>
                                                    {adminDemoLoading ? "Signing in…" : "Admin Demo"}
                                                </Button>
                                            </div>
                                            <div className="rounded-lg border border-border p-4 flex flex-col gap-2">
                                                <span className="text-sm font-medium text-foreground">Customer View</span>
                                                <span className="text-xs text-muted-foreground">Browse Momo &amp; Burger&apos;s menu and order as a guest</span>
                                                <Button size="sm" variant="outline" className="mt-1" onClick={goCustomerDemo} disabled={customerDemoLoading}>
                                                    {customerDemoLoading ? "Signing in…" : "Customer Demo"}
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </div>
            </section>

            {/* Features */}
            <section id="features" className="py-20 lg:py-28 bg-muted/30">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center space-y-4 mb-16">
                        <Badge className={EYEBROW}>
                            <Zap className="w-4 h-4 mr-2" />
                            Core Features
                        </Badge>
                        <h2 className="text-3xl sm:text-4xl lg:text-5xl text-foreground">Everything Your Restaurant Needs</h2>
                        <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
                            Our comprehensive POS system handles every aspect of restaurant operations, from table management to payment processing.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {FEATURES.map((f) => (
                            <Card
                                key={f.title}
                                className={`group overflow-hidden hover:shadow-md transition-all duration-200 border-border hover:border-primary/30 bg-card p-0 ${f.featured ? "lg:col-span-2 grid grid-cols-1 sm:grid-cols-2" : ""}`}
                            >
                                {f.featured && (
                                    <ImageWithFallback
                                        src={f.image}
                                        alt=""
                                        className="w-full h-48 sm:h-full object-cover"
                                    />
                                )}
                                <div className="flex flex-col">
                                    <CardHeader className="space-y-4 pt-6">
                                        <div className="flex items-center justify-between">
                                            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                                                <f.icon className="w-6 h-6 text-primary" />
                                            </div>
                                            <Badge variant="outline" className="text-xs">{f.highlight}</Badge>
                                        </div>
                                        <CardTitle className="text-xl">{f.title}</CardTitle>
                                    </CardHeader>
                                    <CardContent className="pb-6">
                                        <CardDescription className="text-base leading-relaxed">{f.description}</CardDescription>
                                    </CardContent>
                                </div>
                            </Card>
                        ))}
                    </div>
                </div>
            </section>

            {/* Engineering teaser */}
            <section className="py-20 lg:py-28">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center max-w-2xl mx-auto space-y-4 mb-12">
                        <Badge className={EYEBROW}>
                            <Code2 className="w-4 h-4 mr-2" />
                            Under the Hood
                        </Badge>
                        <h2 className="text-3xl sm:text-4xl text-foreground leading-tight">Built on a Real Microservices Architecture</h2>
                        <p className="text-lg text-muted-foreground">
                            Four independently deployable .NET services, a MassTransit saga coordinating order fulfillment, and full OpenTelemetry observability — the way production restaurant systems actually get built.
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

                    <div className="flex flex-wrap justify-center gap-3 mt-10">
                        <Button variant="outline" size="lg" asChild className="text-lg px-8 py-4 border-2 hover:bg-accent">
                            <Link to="/engineering">
                                View the Architecture
                                <ArrowRight className="ml-2 h-5 w-5" />
                            </Link>
                        </Button>
                        <Button variant="outline" size="lg" asChild className="text-lg px-8 py-4 border-2 hover:bg-accent">
                            <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer">
                                <GithubIcon className="mr-2 h-5 w-5" />
                                View on GitHub
                            </a>
                        </Button>
                    </div>
                </div>
            </section>

            {/* CTA */}
            <section id="cta" className="py-20 lg:py-28 bg-brand-soft/30 relative overflow-hidden">
                <div className="relative max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
                    <div className="space-y-8">
                        <Badge className="bg-primary/20 text-primary border-primary/30 px-4 py-2">
                            <Clock className="w-4 h-4 mr-2" />
                            Ready to Start
                        </Badge>
                        <h2 className="text-3xl sm:text-4xl lg:text-5xl text-foreground leading-tight">Transform Your Restaurant Today</h2>
                        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                            Join restaurants using our POS system to deliver exceptional dining experiences. No setup fees, no long-term contracts.
                        </p>

                        <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
                            <Button size="lg" asChild className="text-lg px-10 py-4 shadow-md hover:shadow-lg transition-all duration-200">
                                <a href="mailto:snehabasnet224@gmail.com?subject=Schedule%20a%20Walkthrough">
                                    Schedule Walkthrough
                                </a>
                            </Button>
                        </div>
                        <p className="text-sm text-muted-foreground">Free 14-day trial &middot; No credit card required</p>

                        <div className="flex items-center justify-center gap-8 pt-4">
                            <div className="text-center">
                                <div className="text-2xl font-numeric text-brand-strong">5 min</div>
                                <div className="text-sm text-muted-foreground">Setup Time</div>
                            </div>
                            <div className="w-px h-8 bg-border" />
                            <div className="text-center">
                                <div className="text-2xl font-numeric text-brand-strong">24/7</div>
                                <div className="text-sm text-muted-foreground">Support</div>
                            </div>
                            <div className="w-px h-8 bg-border" />
                            <div className="text-center">
                                <div className="text-2xl font-numeric text-brand-strong">99%</div>
                                <div className="text-sm text-muted-foreground">Uptime</div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <AppFooter onCta={go} />

            {/* Watch Demo — video placeholder */}
            <Dialog open={demoOpen} onOpenChange={setDemoOpen}>
                <DialogContent className="sm:max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Product Demo</DialogTitle>
                    </DialogHeader>
                    <div className="aspect-video rounded-lg bg-muted/50 border border-border flex flex-col items-center justify-center gap-2 text-muted-foreground">
                        <PlayCircle className="w-12 h-12" />
                        <p className="text-sm font-medium">Demo video coming soon</p>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
