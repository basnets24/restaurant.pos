import { useAuth } from "@/api-authorization/AuthProvider";
import { isDemoProfile } from "@/auth/demoSession";
import { useGuidedTour } from "./useGuidedTour";
import { TourTooltip } from "./TourTooltip";

// Mounted once near the router root - no-ops entirely outside a demo_admin
// session. Lives above route-level components so it survives every
// /home → /pos/tables → /pos/table/:id/menu transition the tour walks
// through, rather than being remounted (and losing step state) per route.
export function TourProvider() {
    const { profile } = useAuth();
    const enabled = isDemoProfile(profile);
    const { step, duringModal, next, skip } = useGuidedTour(enabled);

    if (!step) return null;

    return <TourTooltip key={step.id} step={step} duringModal={duringModal} onNext={next} onSkip={skip} />;
}
