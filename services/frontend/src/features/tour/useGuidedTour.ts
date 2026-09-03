import { useCallback, useEffect, useMemo, useState } from "react";
import { router } from "@/app/router";
import { TOUR_DISMISSED_KEY, TOUR_STEPS, type TourStep } from "./tourSteps";

// TourProvider is mounted as a sibling of <RouterProvider>, not inside a
// route element, specifically so it survives navigation instead of
// remounting per-route - which means it has no access to react-router's own
// Router context (useLocation would throw). Subscribing to the `router`
// singleton's own state gets the current pathname without that context.
function useRouterPathname(): string {
    const [pathname, setPathname] = useState(router.state.location.pathname);
    useEffect(() => {
        return router.subscribe((state) => setPathname(state.location.pathname));
    }, []);
    return pathname;
}

// Route patterns in tourSteps use ":param" segments (react-router style) —
// match structurally rather than by exact string since the real pathname
// carries a real tableId.
function routeMatches(pattern: string, pathname: string): boolean {
    const patternParts = pattern.split("/").filter(Boolean);
    const pathParts = pathname.split("/").filter(Boolean);
    if (patternParts.length !== pathParts.length) return false;
    return patternParts.every((p, i) => p.startsWith(":") || p === pathParts[i]);
}

export function useGuidedTour(enabled: boolean) {
    const pathname = useRouterPathname();
    const [stepIndex, setStepIndex] = useState(0);
    const [dismissed, setDismissed] = useState<boolean>(() => {
        try {
            return sessionStorage.getItem(TOUR_DISMISSED_KEY) === "true";
        } catch {
            return false;
        }
    });

    const step: TourStep | null = enabled && !dismissed ? TOUR_STEPS[stepIndex] ?? null : null;

    // A step whose target hasn't mounted yet shouldn't render its tooltip
    // pointing at nothing (or silently falling back to the no-anchor corner
    // card) - hold until it's actually in the DOM. Explicit waitFor covers a
    // semantic condition beyond "does it exist" (fire-btn/pay-btn need the
    // cart to have items); every other step gets this same existence check
    // for free, since a step reached right after a route change (e.g.
    // menu-grid, reached via a two-hop redirect: /pos/table/:id -> .../menu)
    // can just as easily have TourTooltip's own anchor-resolution effect
    // race ahead of the real page finishing its mount. Polls rather than a
    // MutationObserver: the DOM churn here is cheap to poll and simpler than
    // wiring an observer per step.
    const [targetReady, setTargetReady] = useState(true);
    useEffect(() => {
        // Reacting to the DOM (an external system) to know when a step's
        // target has actually mounted.
        /* eslint-disable react-hooks/set-state-in-effect */
        const ready = step?.waitFor ?? (step?.target ? () => document.querySelector(step.target) != null : undefined);
        if (!ready) {
            setTargetReady(true);
            return;
        }
        if (ready()) {
            setTargetReady(true);
            return;
        }
        setTargetReady(false);
        /* eslint-enable react-hooks/set-state-in-effect */
        const id = window.setInterval(() => {
            if (ready()) {
                setTargetReady(true);
                window.clearInterval(id);
            }
        }, 300);
        return () => window.clearInterval(id);
    }, [step]);

    const isOnStepRoute = step ? routeMatches(step.route, pathname) : false;

    const advance = useCallback(() => {
        setStepIndex((i) => Math.min(i + 1, TOUR_STEPS.length - 1));
    }, []);

    const skip = useCallback(() => {
        try {
            sessionStorage.setItem(TOUR_DISMISSED_KEY, "true");
        } catch {
            // sessionStorage unavailable (private mode, storage disabled) - the
            // tour simply won't remember dismissal across a remount this session.
        }
        setDismissed(true);
    }, []);

    // "route-change" steps (seating a table, opening the tile) advance once
    // navigation actually lands on the *current* step's own route target -
    // the click that causes the navigation is the app's real handler, this
    // never intercepts it.
    useEffect(() => {
        if (!step || step.advanceOn !== "route-change") return;
        if (routeMatches(step.route, pathname)) return; // still on the step's *starting* route
        // Reacting to react-router's navigation (an external system) advancing
        // past this step's route.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        advance();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pathname]);

    // "target-click" steps advance via a delegated, capture-phase listener on
    // document - the app's own click handler still runs untouched, this only
    // observes it. Delegated rather than resolving one specific element via
    // querySelector: a step's target selector (e.g. "[data-table]") can match
    // many elements on the page, and the user may click any one of them, not
    // necessarily whichever happened to be first in DOM order.
    useEffect(() => {
        if (!step || step.advanceOn !== "target-click" || !isOnStepRoute || !targetReady) return;
        // A demo visitor can land on a table (any table, by design) whose
        // action already happened before the tour got there - e.g. an order
        // fired in an earlier session. skipIf is a precise, per-step signal
        // for that ("fire" checks the button's own already-fired label) -
        // deliberately not a generic "is the target disabled" check, which
        // would misfire on the *transient* disabled window right after this
        // step's own click (the button stays disabled for the moment between
        // the click and the async Fire call actually resolving).
        if (step.skipIf?.()) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            advance();
            return;
        }
        const handler = (e: MouseEvent) => {
            if ((e.target as HTMLElement | null)?.closest(step.target)) advance();
        };
        document.addEventListener("click", handler, { capture: true });
        return () => document.removeEventListener("click", handler, { capture: true });
    }, [step, isOnStepRoute, targetReady, advance]);

    return useMemo(
        () => ({
            step: isOnStepRoute && targetReady ? step : null,
            isActive: enabled && !dismissed,
            next: advance,
            skip,
        }),
        [step, isOnStepRoute, targetReady, enabled, dismissed, advance, skip]
    );
}
