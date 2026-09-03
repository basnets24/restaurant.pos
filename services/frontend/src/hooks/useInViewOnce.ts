import { useEffect, useRef, useState } from "react";

/** True once the element has entered the viewport, and stays true afterward —
 * for a one-time "animate in" trigger (e.g. a diagram's connectors drawing in)
 * rather than a repeating in/out toggle. */
export function useInViewOnce<T extends HTMLElement>(threshold = 0.3) {
    const ref = useRef<T | null>(null);
    const [inView, setInView] = useState(false);

    useEffect(() => {
        const el = ref.current;
        if (!el || inView) return;
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setInView(true);
                    observer.disconnect();
                }
            },
            { threshold },
        );
        observer.observe(el);
        return () => observer.disconnect();
    }, [inView, threshold]);

    return { ref, inView };
}
