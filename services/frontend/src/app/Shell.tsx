import { Link, NavLink, Outlet } from "react-router-dom";

const linkBase =
    "px-3 py-2 rounded-xl text-sm font-medium transition-colors";
const linkActive = "text-white bg-[var(--brand)]";
const linkIdle = "text-zinc-600 hover:text-zinc-900";

export default function Shell() {
    return (
        <div className="min-h-dvh">
            <header className="glass sticky top-0 z-10">
                <nav className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
                    <Link to="/" className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-xl bg-[var(--brand)]" />
                        <span className="text-lg font-semibold">Restaurant POS</span>
                    </Link>

                    <div className="flex items-center gap-2">
                        {[
                            { to: "/", label: "Menu", end: true },
                            { to: "/orders", label: "Orders" },
                            { to: "/tables", label: "Tables" },
                        ].map(({ to, label, end }) => (
                            <NavLink
                                key={to}
                                to={to}
                                end={end as any}
                                className={({ isActive }) =>
                                    `${linkBase} ${isActive ? linkActive : linkIdle}`
                                }
                            >
                                {label}
                            </NavLink>
                        ))}
                        <Link to="/signin" className="theme-cta">
                            Sign In
                        </Link>
                    </div>
                </nav>
            </header>

            <div className="mx-auto max-w-6xl px-4 pt-6">
                <div className="hero-slab p-6 sm:p-10">
                    <Outlet />
                </div>
            </div>

            <footer className="mx-auto max-w-6xl px-4 py-10 text-sm text-zinc-500">
                © {new Date().getFullYear()} – Restaurant POS
            </footer>
        </div>
    );
}

