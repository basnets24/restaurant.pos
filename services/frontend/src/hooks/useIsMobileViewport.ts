import { useEffect, useState } from "react";

// Below Tailwind's `sm` breakpoint - the width several surfaces (POS cart,
// guided tour) switch their desktop-only chrome for a mobile-appropriate one
// at, rather than a size a component picks for itself.
const MOBILE_QUERY = "(max-width: 639px)";

export function useIsMobileViewport(): boolean {
    const [isMobile, setIsMobile] = useState(() => window.matchMedia(MOBILE_QUERY).matches);
    useEffect(() => {
        const mql = window.matchMedia(MOBILE_QUERY);
        const onChange = () => setIsMobile(mql.matches);
        mql.addEventListener("change", onChange);
        return () => mql.removeEventListener("change", onChange);
    }, []);
    return isMobile;
}
