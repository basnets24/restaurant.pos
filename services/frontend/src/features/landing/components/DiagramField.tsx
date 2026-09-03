/** Shared presentation chrome for the Engineering page's redesigned section
 * visuals (Payment, Operations, ...) — a parchment field standing in for the
 * old white --card diagram wrapper, and an olive-bordered editorial callout.
 * Deliberately separate from NarrativeDiagrams.tsx / SystemTopologyDiagram.tsx
 * (the System Design diagram, locked and untouched). */

import { type ReactNode } from "react";
import { useInViewOnce } from "@/hooks/useInViewOnce";

/** Parchment presentation field for a section's main visual — a step down in
 * contrast from a white --card surface, so the diagram reads as part of the
 * page rather than a floating white panel. Horizontally scrollable on narrow
 * viewports rather than shrunk past legibility. Pass `animated` to opt into
 * the one-time connector-draw-in effect (index.css) once it scrolls into view. */
export function DiagramField({ children, animated = false }: { children: ReactNode; animated?: boolean }) {
    const { ref, inView } = useInViewOnce<HTMLDivElement>();
    return (
        <div
            ref={animated ? ref : undefined}
            className={`w-full overflow-x-auto rounded-lg border border-border bg-[var(--surface-sunken)]/60 p-5 sm:p-8 ${animated ? "diagram-animated" : ""} ${inView ? "in-view" : ""}`}
        >
            {children}
        </div>
    );
}

/** Editorial callout with a thin olive left border — for the one architectural
 * statement a section wants to land after its diagram. */
export function Callout({ children }: { children: ReactNode }) {
    return (
        <blockquote className="mt-6 border-l-2 border-brand pl-4 sm:pl-5">
            <p className="font-display text-lg italic leading-snug text-foreground sm:text-xl">{children}</p>
        </blockquote>
    );
}
