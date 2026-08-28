import { Card } from "@/components/ui/card";
import { ImageWithFallback } from "@/figma/ImageWithFallback";

// ─────────────────────────────────────────────────────────────────────────────
// Staged, not yet wired into LandingView.tsx. Each `src` below is a path that
// doesn't exist yet - drop real screenshots into public/screenshots/ with these
// exact filenames, then import and render <ProductScreenshots /> in
// LandingView.tsx between the Demos and Problem sections.
// ─────────────────────────────────────────────────────────────────────────────

const SHOTS = [
    {
        src: "/screenshots/floor-plan.png",
        alt: "Staff floor plan designer showing table layout and live status",
        title: "Floor Plan & Table Status",
        caption: "Drag-and-drop layout editing, with live occupied/reserved/needs-cleaning status per table.",
    },
    {
        src: "/screenshots/order-kitchen.png",
        alt: "Staff order screen with menu items and cart for an active table",
        title: "Order & Kitchen Fulfillment",
        caption: "Fire an order to the kitchen, then take payment as a separate, later step.",
    },
    {
        src: "/screenshots/diner-menu.png",
        alt: "Customer-facing menu with modifiers and cart",
        title: "Customer Ordering",
        caption: "Guest browsing and checkout — the same catalog and order services, a different surface.",
    },
];

export function ProductScreenshots() {
    return (
        <section id="screenshots" className="py-20 lg:py-28 bg-muted/30">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-center max-w-2xl mx-auto space-y-4 mb-12">
                    <h2 className="text-3xl sm:text-4xl text-foreground leading-tight">See the Actual Workflow</h2>
                    <p className="text-lg text-muted-foreground">
                        Not a mockup — screens from the live system, seeded with real demo data.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {SHOTS.map((s) => (
                        <Card key={s.title} className="overflow-hidden border-border bg-card p-0">
                            <ImageWithFallback src={s.src} alt={s.alt} className="w-full h-56 object-cover" />
                            <div className="p-5">
                                <h3 className="text-base font-semibold text-foreground mb-1">{s.title}</h3>
                                <p className="text-sm text-muted-foreground leading-relaxed">{s.caption}</p>
                            </div>
                        </Card>
                    ))}
                </div>
            </div>
        </section>
    );
}
