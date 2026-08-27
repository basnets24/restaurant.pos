// Flat, solid-color "Signage" illustrations from the "Food & Restaurant Brand
// Icons" design handoff (design_handoff_brand_icons/Brand Graphics.dc.html).
// Colors reference the Spoontab palette custom properties (src/styles/brand.css)
// rather than hardcoded hex, so they track the palette if it ever changes.
// The "Bar"/"Patio" text is baked into these SVGs, so they're zone labels for
// exactly those two sections, not a generic reusable sign shape.

type IconProps = { className?: string };

export function BarSignIcon({ className }: IconProps) {
    return (
        <svg viewBox="0 0 120 120" className={className}>
            <line x1="34" y1="8" x2="34" y2="26" stroke="var(--sand-500)" strokeWidth="4" strokeLinecap="round" />
            <line x1="86" y1="8" x2="86" y2="26" stroke="var(--sand-500)" strokeWidth="4" strokeLinecap="round" />
            <rect x="16" y="26" width="88" height="52" rx="10" fill="var(--olive-500)" />
            <rect x="16" y="26" width="88" height="52" rx="10" fill="none" stroke="var(--olive-700)" strokeWidth="3" />
            <text x="60" y="59" fontFamily="Georgia, serif" fontStyle="italic" fontSize="24" fontWeight="700" fill="var(--sand-50)" textAnchor="middle">Bar</text>
            <rect x="34" y="78" width="6" height="16" fill="var(--sand-500)" />
            <rect x="80" y="78" width="6" height="16" fill="var(--sand-500)" />
        </svg>
    );
}

export function PatioSignIcon({ className }: IconProps) {
    return (
        <svg viewBox="0 0 120 120" className={className}>
            <rect x="52" y="46" width="16" height="58" rx="4" fill="var(--sand-500)" />
            <rect x="20" y="18" width="80" height="42" rx="10" fill="var(--sand-50)" />
            <rect x="20" y="18" width="80" height="42" rx="10" fill="none" stroke="var(--olive-500)" strokeWidth="4" />
            <text x="60" y="45" fontFamily="Georgia, serif" fontStyle="italic" fontSize="19" fontWeight="700" fill="var(--olive-700)" textAnchor="middle">Patio</text>
            <path d="M30 12 Q34 2 40 12 Q44 2 48 12" fill="none" stroke="var(--forest-500)" strokeWidth="4" strokeLinecap="round" />
        </svg>
    );
}
