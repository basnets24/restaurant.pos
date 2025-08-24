import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import authService from "../api-authorization/AuthorizeService";
import { ApplicationPaths } from "../Constants";
import DeviceShowcaseCard from "../DeviceShowcaseCard";
import  Button  from "../components/ui/button";

export function Home() {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [userName, setUserName] = useState<string | null>(null);
    const [role, setRole] = useState<string | null>(null);
    const [mobileOpen, setMobileOpen] = useState(false);

    useEffect(() => {
        const sub = authService.subscribe(populateState);
        populateState();
        return () => authService.unsubscribe(sub);
    }, []);

    async function populateState() {
        try {
            const auth = await authService.isAuthenticated();
            const user = await authService.getUser();
            setIsAuthenticated(!!auth);
            setUserName(user?.name ?? null);

            let r: string | null = null;
            if (user) {
                if (typeof (user as any).role === "string") r = (user as any).role;
                else if (Array.isArray((user as any).role) && (user as any).role.length > 0) r = (user as any).role[0];
                else if (Array.isArray((user as any).roles) && (user as any).roles.length > 0) r = (user as any).roles[0];
                else if ((user as any)["http://schemas.microsoft.com/ws/2008/06/identity/claims/role"]) {
                    const claim = (user as any)["http://schemas.microsoft.com/ws/2008/06/identity/claims/role"];
                    r = Array.isArray(claim) ? claim[0] : claim;
                }
            }
            setRole(r);
        } catch {}
    }

    return (
        <div className="min-h-screen bg-[#e8f0d4] text-[#2a1f20] antialiased">
            {/* Animations */}
            <style>{`
        .animate-fade-in { animation: fadeIn .8s ease-out forwards; opacity: 0 }
        .animate-slide-up { animation: slideUp .8s ease-out forwards; opacity: 0; transform: translateY(20px) }
        .delay-100 { animation-delay: .1s }
        .delay-200 { animation-delay: .2s }
        .delay-300 { animation-delay: .3s }
        .delay-400 { animation-delay: .4s }
        @keyframes fadeIn { to { opacity: 1 } }
        @keyframes slideUp { to { opacity: 1; transform: translateY(0) } }
        @keyframes floatSlow { 0% { transform: translateY(0) } 50% { transform: translateY(-6px) } 100% { transform: translateY(0) } }
        .float-slow { animation: floatSlow 6s ease-in-out infinite }
      `}</style>

            {/* Header */}
            <header className="max-w-6xl mx-auto mt-8 px-4 md:px-8 animate-fade-in">
                <div className="backdrop-blur-lg rounded-3xl shadow-lg border flex items-center justify-between py-4 px-6 md:px-10 hover:shadow-xl transition-all duration-300 bg-white/95 border-white/20">
                    {/* Logo */}
                    <Link to="/" className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-xl bg-[#a3d977] flex items-center justify-center">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                                <path d="M6 2v8M10 2v8M8 2v8" stroke="#2a1f20" strokeWidth="2" strokeLinecap="round"/>
                                <path d="M14 2v7a3 3 0 0 0 6 0V2" stroke="#2a1f20" strokeWidth="2" strokeLinecap="round"/>
                                <path d="M6 22V10M18 22V12" stroke="#2a1f20" strokeWidth="2" strokeLinecap="round"/>
                            </svg>
                        </div>
                        <span className="font-semibold tracking-tight text-lg">Restaurant POS</span>
                    </Link>

                    {/* Desktop Nav */}
                    <nav className="hidden md:flex items-center gap-8 text-sm font-medium">
                        <Link to={ApplicationPaths.CatalogPath} className="hover:text-[#6b7c32]">Menu</Link>
                        <Link to="/orders" className="hover:text-[#6b7c32]">Orders</Link>
                        <Link to="/tables" className="hover:text-[#6b7c32]">Tables</Link>
                        {isAuthenticated ? (
                            <span className="inline-flex items-center gap-2">
                <span className="text-sm">Hi, <strong>{userName || "there"}</strong></span>
                <Button to={ApplicationPaths.LogOut} variant="outline" size="sm">
                  Sign out
                </Button>
              </span>
                        ) : (
                            <Button to={ApplicationPaths.Login} size="sm">
                                Sign In
                            </Button>
                        )}
                    </nav>

                    {/* Mobile menu button */}
                    <button
                        onClick={() => setMobileOpen(v => !v)}
                        className="md:hidden flex items-center justify-center h-10 w-10 rounded-lg hover:bg-black/5"
                        aria-label="Toggle navigation"
                    >
                        {mobileOpen ? "✕" : "☰"}
                    </button>
                </div>

                {/* Mobile Nav */}
                {mobileOpen && (
                    <nav className="md:hidden mt-4 backdrop-blur-lg rounded-2xl shadow-lg border divide-y bg-white/95 border-white/20 divide-black/5">
                        <Button to={ApplicationPaths.CatalogPath} variant="ghost" fullWidth>Menu</Button>
                        <Button to="/orders" variant="ghost" fullWidth>Orders</Button>
                        <Button to="/tables" variant="ghost" fullWidth>Tables</Button>
                        {isAuthenticated
                            ? <Button to={ApplicationPaths.LogOut} variant="ghost" fullWidth>Sign out</Button>
                            : <Button to={ApplicationPaths.Login} variant="ghost" fullWidth>Sign In</Button>}
                    </nav>
                )}
            </header>

            {/* Hero */}
            <section className="max-w-6xl mx-auto mt-10 px-4 md:px-8 animate-slide-up delay-200">
                <div className="rounded-3xl overflow-hidden shadow-xl border grid md:grid-cols-2 bg-white border-white/30">
                    {/* Copy */}
                    <div className="p-8 sm:p-12 lg:p-16">
                        <h1 className="text-4xl sm:text-5xl lg:text-6xl leading-tight font-medium tracking-tight">
                            Next-Gen<br/>Restaurant<br/>Point of Sale
                        </h1>
                        <p className="mt-6 text-[#5a5a5a] max-w-md text-lg leading-relaxed">
                            Speedy table service, real-time menu availability, and a UI your staff will love.
                        </p>
                        <div className="mt-8 flex flex-wrap gap-4">
                            <Button to={ApplicationPaths.CatalogPath} size="lg">
                                Start New Order
                            </Button>
                            {!isAuthenticated && (
                                <Button to={ApplicationPaths.Register} variant="outline" size="lg">
                                    Create Account
                                </Button>
                            )}
                        </div>
                    </div>

                    {/* Visual Pane */}
                    <div className="relative bg-[#a3d977] flex items-center justify-center p-6 rounded-3xl">
                        <DeviceShowcaseCard
                            ipadSrc="/images/screens/ipad.png"
                            monitorSrc="/images/screens/monitor.png"
                            hoverIntensity={6}
                        />
                    </div>
                </div>
            </section>

            {/* Admin shortcuts */}
            <section className="max-w-6xl mx-auto px-4 md:px-8 py-12">
                {isAuthenticated && role === "Admin" && (
                    <ul className="list-disc list-inside space-y-1">
                        <li>Manage the <Button to={ApplicationPaths.CatalogPath} variant="ghost">Menu</Button></li>
                        <li>Manage registered <Button to={ApplicationPaths.UsersPath} variant="ghost">Users</Button></li>
                    </ul>
                )}
            </section>
        </div>
    );
}

export default Home;
