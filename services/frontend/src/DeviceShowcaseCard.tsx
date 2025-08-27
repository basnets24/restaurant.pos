import { useEffect, useRef } from "react";

type Props = {
    ipadSrc?: string;        // e.g. "/images/screens/ipad.png"
    monitorSrc?: string;     // e.g. "/images/screens/monitor.png"
    hoverIntensity?: number; // how much tilt/shift on hover (deg/px)
};

/**
 * DeviceShowcaseCard
 * - Scroll parallax (subtle translate + rotate)
 * - Mouse parallax on hover (tilt + translate)
 * - Respects prefers-reduced-motion
 * - Uses absolute positioning (no negative margins) so it won't cause horizontal overflow
 */
export default function DeviceShowcaseCard({
                                               ipadSrc = "/images/screens/ipad.png",
                                               monitorSrc = "/images/screens/monitor.png",
                                               hoverIntensity = 6,
                                           }: Props) {
    const rootRef = useRef<HTMLDivElement | null>(null);
    const ipadRef = useRef<HTMLDivElement | null>(null);
    const monitorRef = useRef<HTMLDivElement | null>(null);

    const prefersReduced =
        typeof window !== "undefined" &&
        window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

    // --- Scroll Parallax ---
    useEffect(() => {
        if (prefersReduced) return;

        let raf = 0;

        const update = () => {
            const root = rootRef.current;
            const ipad = ipadRef.current;
            const mon = monitorRef.current;
            if (!root || !ipad || !mon) return;

            const rect = root.getBoundingClientRect();
            const vh = window.innerHeight || 1;
            const centerY = rect.top + rect.height / 2;
            const delta = (centerY - vh / 2) / (vh / 2); // [-1,1]
            const clamped = Math.max(-1, Math.min(1, delta));

            const ipadY = -clamped * 18;     // px
            const monY = -clamped * 10;      // px
            const ipadRotY = -clamped * 2;   // deg
            const monRotY = clamped * 1;     // deg

            ipad.style.setProperty("--base-ty", `${ipadY}px`);
            ipad.style.setProperty("--base-ry", `${ipadRotY}deg`);
            mon.style.setProperty("--base-ty", `${monY}px`);
            mon.style.setProperty("--base-ry", `${monRotY}deg`);

            raf = requestAnimationFrame(update);
        };

        const onScroll = () => {
            cancelAnimationFrame(raf);
            raf = requestAnimationFrame(update);
        };

        const io = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting) {
                    onScroll();
                    window.addEventListener("scroll", onScroll, { passive: true });
                } else {
                    window.removeEventListener("scroll", onScroll);
                    cancelAnimationFrame(raf);
                }
            },
            { threshold: 0.1 }
        );
        if (rootRef.current) io.observe(rootRef.current);

        window.addEventListener("resize", onScroll);

        return () => {
            io.disconnect();
            window.removeEventListener("scroll", onScroll);
            window.removeEventListener("resize", onScroll);
            cancelAnimationFrame(raf);
        };
    }, [prefersReduced]);

    // --- Mouse Parallax (hover) ---
    useEffect(() => {
        if (prefersReduced) return;
        const root = rootRef.current;
        const ipad = ipadRef.current;
        const mon = monitorRef.current;
        if (!root || !ipad || !mon) return;

        let raf = 0;
        let inside = false;
        let lastX = 0;
        let lastY = 0;

        const apply = () => {
            if (!inside) return;

            const rect = root.getBoundingClientRect();
            const cx = rect.left + rect.width / 2;
            const cy = rect.top + rect.height / 2;

            const dx = (lastX - cx) / (rect.width / 2);
            const dy = (lastY - cy) / (rect.height / 2);
            const nx = Math.max(-1, Math.min(1, dx));
            const ny = Math.max(-1, Math.min(1, dy));

            const tilt = hoverIntensity;
            const shift = hoverIntensity;

            const ipadRX = ny * tilt * -1;
            const ipadTX = nx * shift * 0.6;
            const ipadTY = ny * shift * 0.6;

            const monRX = ny * tilt * -0.6;
            const monTX = nx * shift * 0.4;
            const monTY = ny * shift * 0.4;

            ipad.style.setProperty("--hover-rx", `${ipadRX}deg`);
            ipad.style.setProperty("--hover-tx", `${ipadTX}px`);
            ipad.style.setProperty("--hover-ty", `${ipadTY}px`);
            mon.style.setProperty("--hover-rx", `${monRX}deg`);
            mon.style.setProperty("--hover-tx", `${monTX}px`);
            mon.style.setProperty("--hover-ty", `${monTY}px`);

            raf = requestAnimationFrame(apply);
        };

        const onMove = (e: MouseEvent) => {
            inside = true;
            lastX = e.clientX;
            lastY = e.clientY;
            if (!raf) raf = requestAnimationFrame(apply);
        };

        const onLeave = () => {
            inside = false;
            cancelAnimationFrame(raf);
            raf = 0;
            ["--hover-rx", "--hover-tx", "--hover-ty"].forEach((v) => {
                ipad.style.setProperty(v, "0");
                mon.style.setProperty(v, "0");
            });
        };

        const fine = window.matchMedia?.("(pointer: fine)")?.matches;
        if (fine) {
            root.addEventListener("mousemove", onMove, { passive: true });
            root.addEventListener("mouseleave", onLeave);
        }

        return () => {
            root.removeEventListener("mousemove", onMove);
            root.removeEventListener("mouseleave", onLeave);
            cancelAnimationFrame(raf);
        };
    }, [hoverIntensity, prefersReduced]);

    return (
        <div
            ref={rootRef}
            className="relative w-full h-full max-w-full"
            style={{ perspective: "1000px" }}
        >
            <style>{`
        @keyframes floatTilt { 0% { transform: translateY(0) rotateY(-14deg) rotateX(6deg) } 50% { transform: translateY(-8px) rotateY(-10deg) rotateX(5deg) } 100% { transform: translateY(0) rotateY(-14deg) rotateX(6deg) } }
        @keyframes monitorFloat { 0% { transform: translateY(0) rotateY(3deg) } 50% { transform: translateY(-6px) rotateY(0deg) } 100% { transform: translateY(0) rotateY(3deg) } }
        @media (prefers-reduced-motion: reduce) {
          .anim-float, .anim-monitor { animation: none !important; }
        }
      `}</style>

            {/* decorative glow */}
            <div aria-hidden className="absolute inset-0 pointer-events-none">
                <div className="absolute inset-0 rounded-[2rem] bg-gradient-to-br from-white/30 to-emerald-100/40 blur-[1px]" />
                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 sm:w-96 sm:h-96 rounded-full bg-emerald-300/25 blur-3xl" />
            </div>

            {/* Monitor (behind) */}
            <div
                ref={monitorRef}
                className="absolute z-10 left-1/2 top-1/2 -translate-x-[58%] -translate-y-[40%] will-change-transform anim-monitor"
                style={{
                    animation: prefersReduced ? "none" : "monitorFloat 11s ease-in-out infinite",
                    transform:
                        "translateY(var(--base-ty, 0px)) rotateY(var(--base-ry, 0deg)) translateX(var(--hover-tx,0px)) translateY(var(--hover-ty,0px)) rotateX(var(--hover-rx,0deg))",
                }}
            >
                <div
                    className="relative w-[280px] sm:w-[320px] md:w-[360px] h-[180px] sm:h-[200px] md:h-[220px] rounded-xl overflow-hidden"
                    style={{
                        backgroundColor: "#0f0f0f",
                        boxShadow: "0 26px 55px rgba(0,0,0,.3), 0 12px 22px rgba(0,0,0,.22)",
                    }}
                >
                    <img
                        src={monitorSrc}
                        alt="Restaurant POS on monitor"
                        className="h-full w-full object-cover select-none"
                        draggable="false"
                        decoding="async"
                        loading="lazy"
                    />
                    <div className="absolute inset-0 rounded-xl border border-neutral-600/50" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/12 to-transparent" />
                </div>
                <div className="mx-auto w-24 h-4 bg-neutral-300 rounded-b-xl shadow mt-1" />
            </div>

            {/* iPad (in front) */}
            <div
                ref={ipadRef}
                className="absolute z-20 right-[8%] bottom-[8%] will-change-transform anim-float"
                style={{
                    animation: prefersReduced ? "none" : "floatTilt 9s ease-in-out infinite",
                    transform:
                        "translateY(var(--base-ty, 0px)) rotateY(var(--base-ry, 0deg)) translateX(var(--hover-tx,0px)) translateY(var(--hover-ty,0px)) rotateX(var(--hover-rx,0deg))",
                }}
            >
                <div
                    className="relative w-[180px] sm:w-[220px] md:w-[240px] aspect-[3/4] rounded-[1.5rem] overflow-hidden"
                    style={{
                        backgroundColor: "#0f0f0f",
                        boxShadow: "0 28px 60px rgba(0,0,0,.35), 0 10px 20px rgba(0,0,0,.25)",
                    }}
                >
                    <img
                        src={ipadSrc}
                        alt="Restaurant POS on iPad"
                        className="h-full w-full object-cover select-none"
                        draggable="false"
                        decoding="async"
                        loading="lazy"
                    />
                    <div className="absolute inset-0 rounded-[1.5rem] border border-neutral-700/50" />
                    <div className="absolute top-2 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-neutral-600" />
                    <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(75deg,rgba(255,255,255,0)_40%,rgba(255,255,255,.16)_50%,rgba(255,255,255,0)_60%)]" />
                </div>
            </div>
        </div>
    );
}
