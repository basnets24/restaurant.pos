// Flat, solid-color "Reports & analytics" illustrations from the "Food & Restaurant
// Brand Icons" design handoff (design_handoff_brand_icons/Brand Graphics.dc.html).
// Colors reference the Spoontab palette custom properties (src/styles/brand.css)
// rather than hardcoded hex, so they track the palette if it ever changes.

type IconProps = { className?: string };

export function GrowthChartIcon({ className }: IconProps) {
    return (
        <svg viewBox="0 0 120 120" className={className}>
            <line x1="18" y1="102" x2="102" y2="102" stroke="var(--sand-300)" strokeWidth="3" />
            <rect x="26" y="70" width="16" height="32" rx="3" fill="var(--olive-200)" />
            <rect x="52" y="52" width="16" height="50" rx="3" fill="var(--olive-400)" />
            <rect x="78" y="30" width="16" height="72" rx="3" fill="var(--olive-600)" />
            <path d="M28 60 L58 40 L84 22" stroke="var(--rust-500)" strokeWidth="4" fill="none" strokeLinecap="round" />
            <path d="M84 22 L96 22 L96 34" stroke="var(--rust-500)" strokeWidth="4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );
}

export function DailySummaryIcon({ className }: IconProps) {
    return (
        <svg viewBox="0 0 120 120" className={className}>
            <rect x="16" y="18" width="40" height="36" rx="8" fill="var(--olive-100)" />
            <rect x="64" y="18" width="40" height="36" rx="8" fill="var(--sand-100)" />
            <rect x="16" y="62" width="88" height="40" rx="8" fill="var(--olive-500)" />
            <rect x="26" y="30" width="20" height="6" rx="3" fill="var(--olive-600)" />
            <rect x="74" y="30" width="20" height="6" rx="3" fill="var(--sand-500)" />
            <rect x="28" y="74" width="30" height="7" rx="3" fill="var(--olive-50)" />
            <rect x="28" y="86" width="54" height="6" rx="3" fill="var(--olive-200)" />
        </svg>
    );
}
