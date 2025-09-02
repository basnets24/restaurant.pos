import { useEffect, useRef } from "react";

/**
 * DeviceShowcaseCard (scroll + mouse parallax)
 * - Scroll parallax (already included)
 * - Mouse parallax on hover (tiny tilt & translate)
 * - Premium shadows & gradient glow
 * - Honors prefers-reduced-motion
 *
 * Props:
 *  - ipadSrc: string  (screenshot path)
 *  - monitorSrc: string (screenshot path)
 *  - hoverIntensity?: number (default 6)  // degrees & px scale factor for hover
 */
export default function DeviceShowcaseCard({
                                               ipadSrc = "/images/screens/ipad.png",
                                               monitorSrc = "/images/screens/monitor.png",
                                               hoverIntensity = 6,
                                           }: {
    ipadSrc?: string;
    monitorSrc?: string;
    hoverIntensity?: number;
}) {
    const rootRef = useRef<HTMLDivElement | null>(null);
    const ipadRef = useRef<HTMLDivElement | null>(null);
    const monitorRef = useRef<HTMLDivElement | null>(null);

    const prefersReduced =
        typeof window !== "undefined" &&
        window.matchMedia &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // --- Scroll Parallax ---
    useEffect(() => {
        if (prefersReduced) return;

        let raf = 0;

        const update = () => {
            if (!rootRef.current || !ipadRef.current || !monitorRef.current) return;

            const rect = rootRef.current.getBoundingClientRect();
            const vh = window.innerHeight || 1;

            const centerY = rect.top + rect.height / 2;
            const delta = (centerY - vh / 2) / (vh / 2);
            const clamped = Math.max(-1, Math.min(1, delta));

            const ipadY = -clamped * 18; // px
            const monitorY = -clamped * 10; // px
            const ipadRotY = -clamped * 2; // deg
            const monitorRotY = clamped * 1; // deg

            ipadRef.current.style.setProperty("--base-ty", `${ipadY}px`);
            ipadRef.current.style.setProperty("--base-ry", `${ipadRotY}deg`);

            monitorRef.current.style.setProperty("--base-ty", `${monitorY}px`);
            monitorRef.current.style.setProperty("--base-ry", `${monitorRotY}deg`);

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
        if (!root || !ipadRef.current || !monitorRef.current) return;

        let raf = 0;
        let isPointerInside = false;
        let lastX = 0;
        let lastY = 0;

        const apply = () => {
            if (!isPointerInside) return;

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

            ipadRef.current!.style.setProperty("--hover-rx", `${ipadRX}deg`);
            ipadRef.current!.style.setProperty("--hover-tx", `${ipadTX}px`);
            ipadRef.current!.style.setProperty("--hover-ty", `${ipadTY}px`);

            monitorRef.current!.style.setProperty("--hover-rx", `${monRX}deg`);
            monitorRef.current!.style.setProperty("--hover-tx", `${monTX}px`);
            monitorRef.current!.style.setProperty("--hover-ty", `${monTY}px`);

            raf = requestAnimationFrame(apply);
        };

        const onMove = (e: MouseEvent) => {
            isPointerInside = true;
            lastX = e.clientX;
            lastY = e.clientY;
            if (!raf) raf = requestAnimationFrame(apply);
        };

        const onLeave = () => {
            isPointerInside = false;
            cancelAnimationFrame(raf);
            raf = 0;
            ["--hover-rx", "--hover-tx", "--hover-ty"].forEach((v) => {
                ipadRef.current?.style.setProperty(v, "0");
                monitorRef.current?.style.setProperty(v, "0");
            });
        };

        const isFinePointer =
            window.matchMedia && window.matchMedia("(pointer: fine)").matches;

        if (isFinePointer) {
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
        <div ref={rootRef} className="relative flex items-center justify-center">
            <style>{`
        @keyframes floatTilt {
          0%   { transform: translateY(0) rotateY(-14deg) rotateX(6deg); }
          50%  { transform: translateY(-8px) rotateY(-10deg) rotateX(5deg); }
          100% { transform: translateY(0) rotateY(-14deg) rotateX(6deg); }
        }
        @keyframes monitorFloat {
          0%   { transform: translateY(0) rotateY(3deg); }
          50%  { transform: translateY(-6px) rotateY(0deg); }
          100% { transform: translateY(0) rotateY(3deg); }
        }
        @media (prefers-reduced-motion: reduce) {
          .anim-float, .anim-monitor { animation: none !important; }
        }
      `}</style>

            {/* Premium backdrop */}
            <div aria-hidden="true" className="absolute inset-0 pointer-events-none">
                <div className="absolute inset-0 bg-gradient-to-br from-white/30 to-emerald-100/40 rounded-[2rem] blur-[1px]" />
                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 sm:w-96 sm:h-96 rounded-full bg-emerald-300/25 blur-3xl" />
            </div>

            {/* Stack */}
            <div className="relative flex items-end gap-0">
                {/* iPad */}
                <div
                    ref={ipadRef}
                    className="relative z-20 will-change-transform anim-float"
                    style={{
                        animation: prefersReduced ? "none" : "floatTilt 9s ease-in-out infinite",
                        transform:
                            "translateY(var(--base-ty, 0px)) rotateY(var(--base-ry, 0deg)) translateX(var(--hover-tx,0px)) translateY(var(--hover-ty,0px)) rotateX(var(--hover-rx,0deg))",
                    }}
                >
                    <div
                        className="relative w-48 sm:w-56 md:w-64 aspect-[3/4] rounded-[1.5rem] overflow-hidden"
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
                        />
                        <div className="absolute inset-0 rounded-[1.5rem] border border-neutral-700/50" />
                        <div className="absolute top-2 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-neutral-600" />
                        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(75deg,rgba(255,255,255,0)_40%,rgba(255,255,255,.16)_50%,rgba(255,255,255,0)_60%)]" />
                    </div>
                </div>

                {/* Monitor */}
                <div
                    ref={monitorRef}
                    className="relative z-10 -ml-10 sm:-ml-12 md:-ml-14 will-change-transform anim-monitor"
                    style={{
                        animation: prefersReduced ? "none" : "monitorFloat 11s ease-in-out infinite",
                        transform:
                            "translateY(var(--base-ty, 0px)) rotateY(var(--base-ry, 0deg)) translateX(var(--hover-tx,0px)) translateY(var(--hover-ty,0px)) rotateX(var(--hover-rx,0deg))",
                    }}
                >
                    <div
                        className="relative w-56 sm:w-64 md:w-72 h-40 sm:h-48 md:h-56 rounded-xl overflow-hidden"
                        style={{
                            backgroundColor: "#0f0f0f",
                            boxShadow: "0 26px 55px rgba(0,0,0,.3), 0 12px 22px rgba(0,0,0,.22)",
                        }}
                    >
                        <img
                            src={monitorSrc}
                            alt="Restaurant POS monitor"
                            className="h-full w-full object-cover select-none"
                            draggable="false"
                        />
                        <div className="absolute inset-0 rounded-xl border border-neutral-600/50" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/12 to-transparent" />
                    </div>
                    <div className="mx-auto w-24 h-4 bg-neutral-300 rounded-b-xl shadow mt-1" />
                </div>
            </div>
        </div>
    );
}
