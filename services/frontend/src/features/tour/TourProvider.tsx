import { useAuth } from "@/api-authorization/AuthProvider";
import { isDemoProfile } from "@/auth/demoSession";
import { useIsMobileViewport } from "@/hooks/useIsMobileViewport";
import { useGuidedTour } from "./useGuidedTour";
import { TourTooltip } from "./TourTooltip";

// Mounted once near the router root - no-ops entirely outside a demo_admin
// session. Lives above route-level components so it survives every
// /home → /pos/tables → /pos/table/:id/menu transition the tour walks
// through, rather than being remounted (and losing step state) per route.
export function TourProvider() {
    const { profile } = useAuth();
    // Off on mobile by request - the multi-step walkthrough (tooltips pinned
    // to fixed corners, spotlighting targets across a cramped layout) reads
    // as more friction than help on a small screen even now that the POS
    // pages it walks through are themselves mobile-friendly.
    const isMobile = useIsMobileViewport();
    const enabled = isDemoProfile(profile) && !isMobile;
    const { step, duringModal, next, skip } = useGuidedTour(enabled);

    if (!step) return null;

    return <TourTooltip key={step.id} step={step} duringModal={duringModal} onNext={next} onSkip={skip} />;
}
