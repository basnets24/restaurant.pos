import { useEffect, useState } from "react";
import { useAuth } from "@/api-authorization/AuthProvider";
import { isDemoProfile } from "@/auth/demoSession";
import { useGuidedTour } from "./useGuidedTour";
import { TourTooltip } from "./TourTooltip";

// Below Tailwind's `sm` breakpoint, OrderSideBar never switches into its own
// mobile Sheet mode (MenuPage hardcodes isMobile={false}), so the fixed cart
// panel it renders instead covers the entire menu grid - the tour's "tap a
// menu item" step has nothing visible to point at or click. Gating the tour
// out below that width sidesteps it rather than walking a visitor into a
// step that can't be completed.
const MOBILE_QUERY = "(max-width: 639px)";

function useIsMobileViewport(): boolean {
    const [isMobile, setIsMobile] = useState(() => window.matchMedia(MOBILE_QUERY).matches);
    useEffect(() => {
        const mql = window.matchMedia(MOBILE_QUERY);
        const onChange = () => setIsMobile(mql.matches);
        mql.addEventListener("change", onChange);
        return () => mql.removeEventListener("change", onChange);
    }, []);
    return isMobile;
}

// Mounted once near the router root - no-ops entirely outside a demo_admin
// session. Lives above route-level components so it survives every
// /home → /pos/tables → /pos/table/:id/menu transition the tour walks
// through, rather than being remounted (and losing step state) per route.
export function TourProvider() {
    const { profile } = useAuth();
    const isMobile = useIsMobileViewport();
    const enabled = isDemoProfile(profile) && !isMobile;
    const { step, duringModal, next, skip } = useGuidedTour(enabled);

    if (!step) return null;

    return <TourTooltip key={step.id} step={step} duringModal={duringModal} onNext={next} onSkip={skip} />;
}
