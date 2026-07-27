// Flat, solid-color menu-category illustrations. Appetizer/Main/Side/Dessert/Drinks
// come from the "Food & Restaurant Brand Icons" design handoff
// (design_handoff_brand_icons/Brand Graphics.dc.html); Kids/Special were designed
// here to match that same style (plate silhouette, no gradients, no outline set)
// since the handoff doesn't cover those two categories.
// Colors reference the Spoontab palette custom properties (src/styles/brand.css)
// rather than hardcoded hex, so they track the palette if it ever changes.

type IconProps = { className?: string };

export function AppetizerIcon({ className }: IconProps) {
    return (
        <svg viewBox="0 0 120 120" className={className}>
            <ellipse cx="60" cy="78" rx="44" ry="16" fill="var(--sand-300)" />
            <ellipse cx="60" cy="76" rx="34" ry="12" fill="var(--sand-50)" />
            <rect x="34" y="40" width="4" height="34" rx="2" fill="var(--sand-500)" transform="rotate(-8 36 57)" />
            <circle cx="35" cy="46" r="7" fill="var(--rust-500)" />
            <circle cx="38" cy="60" r="7" fill="var(--olive-400)" />
            <rect x="58" y="36" width="4" height="36" rx="2" fill="var(--sand-500)" />
            <circle cx="60" cy="42" r="7" fill="var(--ochre-500)" />
            <circle cx="60" cy="58" r="7" fill="var(--rust-500)" />
            <rect x="82" y="40" width="4" height="34" rx="2" fill="var(--sand-500)" transform="rotate(8 84 57)" />
            <circle cx="85" cy="46" r="7" fill="var(--olive-400)" />
            <circle cx="82" cy="60" r="7" fill="var(--ochre-500)" />
        </svg>
    );
}

export function MainIcon({ className }: IconProps) {
    return (
        <svg viewBox="0 0 120 120" className={className}>
            <circle cx="56" cy="62" r="42" fill="var(--sand-300)" />
            <circle cx="56" cy="62" r="32" fill="var(--sand-50)" />
            <ellipse cx="48" cy="60" rx="16" ry="11" fill="var(--olive-400)" />
            <path d="M64 50 Q80 54 78 68 Q76 78 62 76 Z" fill="var(--rust-500)" />
            <circle cx="42" cy="76" r="6" fill="var(--forest-500)" />
            <rect x="98" y="26" width="5" height="40" rx="2" fill="var(--sand-500)" />
            <path d="M96 20 L96 34 M100 20 L100 34 M104 20 L104 34" stroke="var(--sand-500)" strokeWidth="3" strokeLinecap="round" />
        </svg>
    );
}

export function SideIcon({ className }: IconProps) {
    return (
        <svg viewBox="0 0 120 120" className={className}>
            <path d="M26 60 Q26 92 60 92 Q94 92 94 60 Z" fill="var(--sand-400)" />
            <ellipse cx="60" cy="58" rx="34" ry="12" fill="var(--sand-200)" />
            <rect x="42" y="38" width="6" height="28" rx="3" fill="var(--ochre-500)" />
            <rect x="56" y="32" width="6" height="34" rx="3" fill="var(--ochre-500)" />
            <rect x="70" y="40" width="6" height="26" rx="3" fill="var(--ochre-500)" />
        </svg>
    );
}

export function DessertIcon({ className }: IconProps) {
    return (
        <svg viewBox="0 0 120 120" className={className}>
            <ellipse cx="60" cy="86" rx="40" ry="12" fill="var(--sand-300)" />
            <path d="M36 84 L60 30 L84 84 Z" fill="var(--sand-500)" />
            <path d="M44 84 L60 46 L76 84 Z" fill="var(--sand-100)" />
            <circle cx="60" cy="26" r="7" fill="var(--rust-500)" />
            <path d="M60 20 Q64 10 58 4" stroke="var(--forest-500)" strokeWidth="3" fill="none" strokeLinecap="round" />
        </svg>
    );
}

export function DrinksIcon({ className }: IconProps) {
    return (
        <svg viewBox="0 0 120 120" className={className}>
            <path d="M38 30 H82 L74 92 Q60 100 46 92 Z" fill="var(--sand-50)" stroke="var(--sand-300)" strokeWidth="3" />
            <path d="M42 46 H78 L72 88 Q60 94 48 88 Z" fill="var(--olive-400)" />
            <rect x="66" y="10" width="6" height="34" rx="3" fill="var(--sand-500)" transform="rotate(10 69 27)" />
            <circle cx="52" cy="40" r="5" fill="var(--sand-50)" />
        </svg>
    );
}

export function KidsIcon({ className }: IconProps) {
    return (
        <svg viewBox="0 0 120 120" className={className}>
            <ellipse cx="60" cy="78" rx="44" ry="16" fill="var(--sand-300)" />
            <ellipse cx="60" cy="76" rx="34" ry="12" fill="var(--sand-50)" />
            <circle cx="46" cy="66" r="6" fill="var(--forest-500)" />
            <circle cx="74" cy="66" r="6" fill="var(--forest-500)" />
            <path d="M44 76 Q60 90 76 76" stroke="var(--rust-500)" strokeWidth="5" fill="none" strokeLinecap="round" />
            <path d="M92 30 L86 44 L98 44 Z" fill="var(--ochre-500)" />
            <circle cx="92" cy="24" r="6" fill="var(--ochre-500)" />
        </svg>
    );
}

export function SpecialIcon({ className }: IconProps) {
    return (
        <svg viewBox="0 0 120 120" className={className}>
            <circle cx="60" cy="62" r="42" fill="var(--sand-300)" />
            <circle cx="60" cy="62" r="32" fill="var(--sand-50)" />
            <path d="M60 34 L65.8 51.2 L84 51.2 L69.4 62.4 L75.2 79.6 L60 68.4 L44.8 79.6 L50.6 62.4 L36 51.2 L54.2 51.2 Z" fill="var(--ochre-500)" />
            <circle cx="92" cy="28" r="4" fill="var(--rust-500)" />
            <path d="M92 16 L92 22 M92 34 L92 40 M80 28 L86 28 M98 28 L104 28" stroke="var(--rust-500)" strokeWidth="3" strokeLinecap="round" />
        </svg>
    );
}
