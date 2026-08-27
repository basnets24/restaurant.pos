// Flat, solid-color "Staff & roles" illustrations from the "Food & Restaurant
// Brand Icons" design handoff (design_handoff_brand_icons/Brand Graphics.dc.html).
// Colors reference the Spoontab palette custom properties (src/styles/brand.css)
// rather than hardcoded hex, so they track the palette if it ever changes.

type IconProps = { className?: string };

export function ChefIcon({ className }: IconProps) {
    return (
        <svg viewBox="0 0 120 120" className={className}>
            <rect x="30" y="70" width="60" height="34" rx="14" fill="var(--olive-500)" />
            <circle cx="60" cy="52" r="20" fill="var(--sand-200)" />
            <path d="M38 46 Q38 20 60 20 Q82 20 82 46 Q70 36 60 36 Q50 36 38 46 Z" fill="var(--sand-50)" />
            <rect x="44" y="14" width="32" height="12" rx="6" fill="var(--sand-50)" />
        </svg>
    );
}

export function ServerIcon({ className }: IconProps) {
    return (
        <svg viewBox="0 0 120 120" className={className}>
            <rect x="32" y="66" width="40" height="38" rx="14" fill="var(--sand-500)" />
            <circle cx="52" cy="46" r="16" fill="var(--sand-200)" />
            <ellipse cx="86" cy="52" rx="26" ry="8" fill="var(--olive-300)" />
            <circle cx="78" cy="49" r="7" fill="var(--sand-50)" />
            <circle cx="94" cy="49" r="7" fill="var(--rust-500)" />
            <rect x="80" y="58" width="4" height="20" fill="var(--sand-700)" />
        </svg>
    );
}
