import { useState } from "react";
import { Link } from "react-router-dom";
import Button from "../components/ui/Button";
import DeviceShowcaseCard from "../DeviceShowcaseCard";
import CheckoutButton from "../components/CheckoutButton";

export default function Home() {
    const [mobileOpen, setMobileOpen] = useState(false);

    return (
        <div className="min-h-screen bg-[var(--app-bg)] text-[var(--ink)] antialiased">
            {/* Header */}
            <header className="max-w-6xl mx-auto mt-8 px-4 md:px-8 animate-fade-in">
                <div className="glass flex items-center justify-between py-4 px-6 md:px-10 transition-all duration-300 hover:shadow-lg">
                    {/* Logo */}
                    <Link to="/" className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-xl bg-[var(--brand)] grid place-items-center">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                                <path d="M6 2v8M10 2v8M8 2v8" stroke="var(--brand-ink)" strokeWidth="2" strokeLinecap="round" />
                                <path d="M14 2v7a3 3 0 0 0 6 0V2" stroke="var(--brand-ink)" strokeWidth="2" strokeLinecap="round" />
                                <path d="M6 22V10M18 22V12" stroke="var(--brand-ink)" strokeWidth="2" strokeLinecap="round" />
                            </svg>
                        </div>
                        <span className="font-semibold tracking-tight text-lg">Restaurant POS</span>
                    </Link>

                    {/* Desktop Nav */}
                    <nav className="hidden md:flex items-center gap-8 text-sm font-medium">
                        <Link to="/catalog" className="hover:text-[var(--hover-ink)]">Menu</Link>
                        <Link to="/orders" className="hover:text-[var(--hover-ink)]">Orders</Link>
                        <Link to="/tables" className="hover:text-[var(--hover-ink)]">Tables</Link>
                        <Button to="/login" size="sm">Sign In</Button>
                    </nav>

                    {/* Mobile toggle */}
                    <button
                        onClick={() => setMobileOpen((v) => !v)}
                        className="md:hidden grid place-items-center h-10 w-10 rounded-lg hover:bg-black/5"
                        aria-label="Toggle navigation"
                    >
                        {mobileOpen ? "✕" : "☰"}
                    </button>
                </div>

                {/* Mobile Nav */}
                {mobileOpen && (
                    <nav className="md:hidden mt-4 bg-white/95 backdrop-blur-lg rounded-2xl shadow-lg border border-white/20 divide-y divide-black/5">
                        <Button to="/catalog" variant="ghost" fullWidth>Menu</Button>
                        <Button to="/orders" variant="ghost" fullWidth>Orders</Button>
                        <Button to="/tables" variant="ghost" fullWidth>Tables</Button>
                        <Button to="/login" variant="ghost" fullWidth>Sign In</Button>
                    </nav>
                )}
            </header>

            {/* Hero */}
            <section className="max-w-6xl mx-auto mt-10 px-4 md:px-8 animate-slide-up delay-200">
                <div className="hero-card grid md:grid-cols-2">
                    {/* Copy */}
                    <div className="p-8 sm:p-12 lg:p-16">
                        <h1 className="text-4xl sm:text-5xl lg:text-6xl leading-tight font-medium tracking-tight">
                            Next-Gen<br />Restaurant<br />Point of Sale
                        </h1>
                        <p className="mt-6 text-[#5a5a5a] max-w-md text-lg leading-relaxed">
                            Speedy table service, real-time menu availability, and a UI your staff will love.
                        </p>

                        <div className="mt-8 flex flex-wrap gap-4">
                            {/* Stripe checkout (sessionId + stripe-js) */}
                            <CheckoutButton />
                            <Button to="/register" variant="outline" size="lg">Create Account</Button>

                            {/* Optional: quick way to test cancel route */}
                            <Link
                                to="/checkout/cancel"
                                className="rounded-xl border border-black/10 px-4 py-2.5 hover:bg-black/[.04]"
                            >
                                Simulate cancel
                            </Link>
                        </div>
                    </div>

                    {/* Visual Pane (brand) */}
                    <div className="relative bg-[var(--brand)] flex items-center justify-center p-6 rounded-3xl">
                        <DeviceShowcaseCard
                            ipadSrc="/images/screens/ipad.png"
                            monitorSrc="/images/screens/monitor.png"
                            hoverIntensity={6}
                        />
                    </div>
                </div>
            </section>

            {/* Optional footer/shortcuts section */}
            <section className="max-w-6xl mx-auto px-4 md:px-8 py-12">
                {/* Add anything here (or remove section) */}
            </section>
        </div>
    );
}
