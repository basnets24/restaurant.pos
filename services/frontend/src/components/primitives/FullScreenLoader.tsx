// src/components/primitives/FullScreenLoader.tsx
import { Loader2 } from "lucide-react";

// Centered, full-viewport loading state - used as the route Suspense fallback and by
// ProtectedRoute while it resolves auth/onboarding, so route transitions (e.g. the demo
// sign-in flow) show one consistent "still working" moment instead of a blank screen or
// a small corner of loading text.
export function FullScreenLoader({ label = "Loading…" }: { label?: string }) {
    return (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-3 bg-background/80 backdrop-blur-sm">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="text-sm text-muted-foreground">{label}</span>
        </div>
    );
}
