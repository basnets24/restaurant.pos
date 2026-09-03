import { useEffect, useRef, useState } from "react";

export interface Chapter {
    id: string;
    number: string;
    label: string;
}

/** Sticky chapter rail below the hero. Tracks which section is currently in
 * view (topmost section whose heading has crossed a line just under the
 * sticky bar itself) and keeps that chapter's underline in sync, rather than
 * relying only on whichever anchor was last clicked — a reader who scrolls
 * freely should see the same state a click would have produced. */
export function ChapterNav({ chapters }: { chapters: Chapter[] }) {
    const [active, setActive] = useState(chapters[0]?.id);
    const navRef = useRef<HTMLElement>(null);
    const itemRefs = useRef<Record<string, HTMLAnchorElement | null>>({});

    useEffect(() => {
        const navHeight = navRef.current?.offsetHeight ?? 64;
        const sections = chapters
            .map((c) => document.getElementById(c.id))
            .filter((el): el is HTMLElement => el !== null);
        if (sections.length === 0) return;

        const observer = new IntersectionObserver(
            (entries) => {
                const visible = entries.filter((e) => e.isIntersecting);
                if (visible.length === 0) return;
                // Topmost visible section wins — matches reading order.
                const top = visible.reduce((a, b) => (a.boundingClientRect.top < b.boundingClientRect.top ? a : b));
                setActive(top.target.id);
            },
            { rootMargin: `-${navHeight + 8}px 0px -70% 0px`, threshold: 0 },
        );
        sections.forEach((s) => observer.observe(s));
        return () => observer.disconnect();
    }, [chapters]);

    useEffect(() => {
        // Keep the active pill scrolled into view on the mobile horizontal rail.
        itemRefs.current[active]?.scrollIntoView({ block: "nearest", inline: "center", behavior: "smooth" });
    }, [active]);

    const handleClick = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
        e.preventDefault();
        const el = document.getElementById(id);
        if (!el) return;
        const navHeight = navRef.current?.offsetHeight ?? 64;
        const top = el.getBoundingClientRect().top + window.scrollY - navHeight - 8;
        window.scrollTo({ top, behavior: "smooth" });
        history.replaceState(null, "", `#${id}`);
        setActive(id);
    };

    return (
        <nav
            ref={navRef}
            aria-label="Engineering chapters"
            className="sticky top-0 z-30 border-t border-b border-border bg-background/95 backdrop-blur-sm"
        >
            <div className="mx-auto flex h-16 max-w-[1200px] items-center gap-1 overflow-x-auto px-5 sm:px-8 lg:px-16 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {chapters.map((c) => {
                    const isActive = active === c.id;
                    return (
                        <a
                            key={c.id}
                            ref={(el) => { itemRefs.current[c.id] = el; }}
                            href={`#${c.id}`}
                            onClick={(e) => handleClick(e, c.id)}
                            aria-current={isActive ? "true" : undefined}
                            className="tap-target group relative flex shrink-0 items-center gap-1.5 whitespace-nowrap px-3 py-2 font-mono text-[13px] tracking-wide transition-colors duration-150 sm:text-sm"
                        >
                            <span className={isActive ? "text-brand-strong" : "text-muted-foreground group-hover:text-foreground"}>
                                {c.number}
                            </span>
                            <span className={isActive ? "text-foreground" : "text-muted-foreground group-hover:text-foreground"}>
                                {c.label}
                            </span>
                            <span
                                aria-hidden="true"
                                className="absolute inset-x-3 -bottom-px h-0.5 bg-brand transition-transform duration-200 origin-left"
                                style={{ transform: isActive ? "scaleX(1)" : "scaleX(0)" }}
                            />
                        </a>
                    );
                })}
            </div>
        </nav>
    );
}
