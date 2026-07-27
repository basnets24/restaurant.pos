// Flat, solid-color "app section" illustrations from the "Food & Restaurant
// Brand Icons" design handoff (design_handoff_brand_icons/Brand Graphics.dc.html).
// Colors reference the Spoontab palette custom properties (src/styles/brand.css)
// rather than hardcoded hex, so they track the palette if it ever changes.

type IconProps = { className?: string };

export function FloorsOrdersIcon({ className }: IconProps) {
    return (
        <svg viewBox="0 0 120 120" className={className}>
            <rect x="12" y="12" width="60" height="60" rx="8" fill="none" stroke="var(--sand-300)" strokeWidth="2" />
            <line x1="42" y1="12" x2="42" y2="72" stroke="var(--sand-200)" strokeWidth="1.5" />
            <line x1="12" y1="42" x2="72" y2="42" stroke="var(--sand-200)" strokeWidth="1.5" />
            <rect x="19" y="19" width="16" height="16" rx="4" fill="var(--forest-500)" />
            <rect x="49" y="19" width="16" height="16" rx="4" fill="var(--rust-500)" />
            <rect x="19" y="49" width="16" height="16" rx="4" fill="var(--ochre-500)" />
            <rect x="49" y="49" width="16" height="16" rx="4" fill="var(--forest-500)" />
            <rect x="66" y="46" width="40" height="56" rx="6" fill="var(--sand-50)" stroke="var(--sand-300)" strokeWidth="2" />
            <line x1="74" y1="58" x2="98" y2="58" stroke="var(--sand-400)" strokeWidth="3" strokeLinecap="round" />
            <line x1="74" y1="68" x2="98" y2="68" stroke="var(--sand-400)" strokeWidth="3" strokeLinecap="round" />
            <line x1="74" y1="78" x2="90" y2="78" stroke="var(--sand-400)" strokeWidth="3" strokeLinecap="round" />
        </svg>
    );
}

export function ManagementHubIcon({ className }: IconProps) {
    return (
        <svg viewBox="0 0 120 120" className={className}>
            <rect x="14" y="30" width="92" height="66" rx="10" fill="var(--sand-50)" stroke="var(--sand-300)" strokeWidth="2" />
            <path d="M22 30 L60 12 L98 30 Z" fill="var(--olive-500)" />
            <rect x="30" y="60" width="12" height="26" rx="2" fill="var(--olive-300)" />
            <rect x="48" y="48" width="12" height="38" rx="2" fill="var(--olive-500)" />
            <rect x="66" y="66" width="12" height="20" rx="2" fill="var(--ochre-500)" />
            <circle cx="90" cy="44" r="9" fill="var(--sand-300)" />
            <path d="M86 44 L89 47 L95 40" stroke="var(--sand-50)" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );
}
