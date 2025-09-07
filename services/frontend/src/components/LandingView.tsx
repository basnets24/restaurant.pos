import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "./ui/button";
import {
    Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "./ui/card";
import { Badge } from "./ui/badge";
import { ImageWithFallback } from "../figma/ImageWithFallback";
import {
    Users, Menu, ShoppingCart, CreditCard, Smartphone, BarChart3,
    Clock, CheckCircle, ArrowRight, Star, Zap, Shield, Globe,
} from "lucide-react";
import { useTables } from "../hooks/useTables";
import { useAuth } from "@/api-authorization/AuthProvider";
import { AuthorizationPaths, QueryParameterNames } from "@/api-authorization/ApiAuthorizationConstants";

interface LandingPageProps { onGetStarted?: () => void; }

export default function LandingView({ onGetStarted }: LandingPageProps) {
    const navigate = useNavigate();
    const { isAuthenticated } = useAuth();
    const register = () => {
        const desired = "/join"; // send to onboarding after auth
        const returnUrl = `${window.location.origin}${desired}`;
        navigate(`${AuthorizationPaths.Register}?${QueryParameterNames.ReturnUrl}=${encodeURIComponent(returnUrl)}`);
    };
    const { tables } = useTables();
    const go = () => {
        if (onGetStarted) return onGetStarted();
        if (isAuthenticated) return navigate("/join");
        register();
    };

    const features = [
        { icon: Users, title: "Interactive Table Management", description: "Drag-and-drop floor plan editor with real-time table status tracking. Manage reservations, seating, and capacity with intuitive visual controls.", highlight: "Visual Floor Plan" },
        { icon: Menu, title: "Smart Menu System", description: "Organized menu categories with item customization, special instructions, and instant order updates. Perfect for complex restaurant menus.", highlight: "Easy Ordering" },
        { icon: ShoppingCart, title: "Real-time Order Tracking", description: "Live order management with status updates, item modifications, and seamless kitchen communication. Never miss an order again.", highlight: "Live Updates" },
        { icon: CreditCard, title: "Streamlined Checkout", description: "Multiple payment options, automatic tax calculations, and receipt generation. Complete transactions in seconds.", highlight: "Fast Payment" },
        { icon: Smartphone, title: "Mobile-First Design", description: "Optimized for tablets and smartphones with touch-friendly controls. Works seamlessly across all devices.", highlight: "Touch Friendly" },
        { icon: BarChart3, title: "Order Analytics", description: "Track performance metrics, popular items, and revenue patterns. Make data-driven decisions for your restaurant.", highlight: "Business Insights" },
    ];

    const benefits = [
        { icon: Zap, title: "Increase Speed", description: "Reduce order processing time by 60% with intuitive workflows" },
        { icon: Shield, title: "Reduce Errors", description: "Eliminate miscommunication with digital order management" },
        { icon: Globe, title: "Scale Operations", description: "Handle more tables and customers with the same staff" },
    ];
    useMemo(() => {
        return tables.reduce(
            (acc, t) => ({ ...acc, [t.status]: (acc as any)[t.status] + 1 }),
            { available: 0, occupied: 0, reserved: 0, dirty: 0 } as Record<string, number>
        );
    }, [tables]);
    return (
        <div className="min-h-screen bg-background">
            {/* Hero */}
            <section className="relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-accent/10" />
                <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-28">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
                        <div className="space-y-8">
                            <div className="space-y-4">
                                <Badge className="bg-primary/10 text-primary border-primary/20 px-4 py-2">
                                    <Star className="w-4 h-4 mr-2" />
                                    Modern Restaurant Technology
                                </Badge>
                                <h1 className="text-4xl sm:text-5xl lg:text-6xl text-foreground leading-tight">
                                    Restaurant Management
                                    <span className="block text-primary">Made Simple</span>
                                </h1>
                                <p className="text-xl text-muted-foreground leading-relaxed max-w-lg">
                                    Complete restaurant management software with POS, analytics, staff management, inventory tracking, and business intelligence all in one powerful platform.
                                </p>
                            </div>

                            <div className="flex flex-col sm:flex-row gap-4">
                                <Button size="lg" onClick={go} className="text-lg px-8 py-4 shadow-lg hover:shadow-xl transition-all duration-200">
                                    Start Free Trial
                                    <ArrowRight className="ml-2 h-5 w-5" />
                                </Button>
                                <Button variant="outline" size="lg" className="text-lg px-8 py-4 border-2 hover:bg-accent">
                                    Watch Demo
                                </Button>
                            </div>

                            <div className="flex items-center gap-6 pt-4">
                                <div className="flex items-center gap-2">
                                    <CheckCircle className="w-5 h-5 text-primary" />
                                    <span className="text-muted-foreground">No installation required</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <CheckCircle className="w-5 h-5 text-primary" />
                                    <span className="text-muted-foreground">Works on any device</span>
                                </div>
                            </div>
                        </div>

                        <div className="relative">
                            <div className="absolute inset-0 bg-gradient-to-tr from-primary/20 to-accent/20 rounded-3xl blur-3xl" />
                            <Card className="relative overflow-hidden shadow-2xl border-0 bg-card/80 backdrop-blur-sm">
                                <CardContent className="p-0">
                                    <ImageWithFallback
                                        src="https://images.unsplash.com/photo-1669131196140-49591336b13e?auto=format&fit=crop&w=1200&q=80"
                                        alt="Modern restaurant interior"
                                        className="w-full h-96 object-cover rounded-t-xl"
                                    />
                                    <div className="p-6 bg-card">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <h3 className="font-medium text-foreground">Live Demo Available</h3>
                                                <p className="text-sm text-muted-foreground">Experience the full POS system</p>
                                            </div>
                                            <Button size="sm" className="shadow-md" onClick={go}>Start Demo</Button>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </div>
            </section>

            {/* Features */}
            <section className="py-20 lg:py-28 bg-muted/30">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center space-y-4 mb-16">
                        <Badge className="bg-primary/10 text-primary border-primary/20 px-4 py-2">
                            <Zap className="w-4 h-4 mr-2" />
                            Core Features
                        </Badge>
                        <h2 className="text-3xl sm:text-4xl lg:text-5xl text-foreground">Everything Your Restaurant Needs</h2>
                        <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
                            Our comprehensive POS system handles every aspect of restaurant operations, from table management to payment processing.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {features.map((f, i) => (
                            <Card key={i} className="group hover:shadow-xl hover:shadow-primary/5 transition-all duration-300 border-border hover:border-primary/30 bg-card">
                                <CardHeader className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                                            <f.icon className="w-6 h-6 text-primary" />
                                        </div>
                                        <Badge variant="outline" className="text-xs">{f.highlight}</Badge>
                                    </div>
                                    <CardTitle className="text-xl">{f.title}</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <CardDescription className="text-base leading-relaxed">{f.description}</CardDescription>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>
            </section>

            {/* Benefits */}
            <section className="py-20 lg:py-28">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
                        <div className="space-y-8">
                            <div className="space-y-4">
                                <Badge className="bg-primary/10 text-primary border-primary/20 px-4 py-2">
                                    <BarChart3 className="w-4 h-4 mr-2" />
                                    Business Impact
                                </Badge>
                                <h2 className="text-3xl sm:text-4xl lg:text-5xl text-foreground leading-tight">
                                    Boost Your Restaurant's <span className="block text-primary">Performance</span>
                                </h2>
                                <p className="text-xl text-muted-foreground leading-relaxed">
                                    See immediate improvements in efficiency, accuracy, and customer satisfaction with our modern POS system.
                                </p>
                            </div>

                            <div className="space-y-6">
                                {benefits.map((b, i) => (
                                    <div key={i} className="flex items-start gap-4">
                                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                                            <b.icon className="w-5 h-5 text-primary" />
                                        </div>
                                        <div>
                                            <h3 className="font-medium text-foreground mb-1">{b.title}</h3>
                                            <p className="text-muted-foreground">{b.description}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <Button size="lg" onClick={go} className="text-lg px-8 py-4 shadow-lg hover:shadow-xl transition-all duration-200">
                                Start Using POS System
                                <ArrowRight className="ml-2 h-5 w-5" />
                            </Button>
                        </div>

                        <div className="relative">
                            <div className="absolute inset-0 bg-gradient-to-tr from-accent/20 to-primary/20 rounded-3xl blur-3xl" />
                            <Card className="relative overflow-hidden shadow-2xl border-0 bg-card/80 backdrop-blur-sm">
                                <CardContent className="p-0">
                                    <ImageWithFallback
                                        src="https://images.unsplash.com/photo-1609951734391-b79a50460c6c?auto=format&fit=crop&w=1200&q=80"
                                        alt="Tablet restaurant ordering system"
                                        className="w-full h-96 object-cover"
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-primary/80 via-transparent to-transparent" />
                                    <div className="absolute bottom-6 left-6 right-6">
                                        <div className="bg-card/90 backdrop-blur-sm rounded-lg p-4">
                                            <h3 className="font-medium text-foreground mb-2">Real-time Analytics</h3>
                                            <div className="flex items-center gap-4 text-sm">
                                                <span className="text-primary">↗ 45% faster service</span>
                                                <span className="text-primary">↗ 30% more orders</span>
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </div>
            </section>

            {/* CTA */}
            <section className="py-20 lg:py-28 bg-primary/5 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-accent/10" />
                <div className="relative max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
                    <div className="space-y-8">
                        <Badge className="bg-primary/20 text-primary border-primary/30 px-4 py-2">
                            <Clock className="w-4 h-4 mr-2" />
                            Ready to Start
                        </Badge>
                        <h2 className="text-3xl sm:text-4xl lg:text-5xl text-foreground leading-tight">Transform Your Restaurant Today</h2>
                        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                            Join thousands of restaurants using our POS system to deliver exceptional dining experiences. No setup fees, no long-term contracts.
                        </p>

                        <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
                            <Button size="lg" onClick={go} className="text-lg px-10 py-4 shadow-lg hover:shadow-xl transition-all duration-200">
                                Access Full Demo
                                <ArrowRight className="ml-2 h-5 w-5" />
                            </Button>
                            <Button variant="outline" size="lg" className="text-lg px-10 py-4 border-2 hover:bg-accent">
                                Schedule Walkthrough
                            </Button>
                        </div>

                        <div className="flex items-center justify-center gap-8 pt-8">
                            <div className="text-center">
                                <div className="text-2xl font-bold text-primary">5 min</div>
                                <div className="text-sm text-muted-foreground">Setup Time</div>
                            </div>
                            <div className="w-px h-8 bg-border" />
                            <div className="text-center">
                                <div className="text-2xl font-bold text-primary">24/7</div>
                                <div className="text-sm text-muted-foreground">Support</div>
                            </div>
                            <div className="w-px h-8 bg-border" />
                            <div className="text-center">
                                <div className="text-2xl font-bold text-primary">99%</div>
                                <div className="text-sm text-muted-foreground">Uptime</div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="bg-card border-t border-border py-12">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center">
                                <span className="text-primary-foreground font-bold">RMS</span>
                            </div>
                            <div>
                                <h3 className="font-medium text-foreground">Restaurant Management</h3>
                                <p className="text-sm text-muted-foreground">Complete business solution</p>
                            </div>
                        </div>
                        <Button variant="outline" onClick={go} className="hidden sm:flex">
                            Try Demo
                            <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                    </div>
                </div>
            </footer>
        </div>
    );
}
