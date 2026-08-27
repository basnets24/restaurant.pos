// Flat, solid-color "Tables & seating" illustrations from the "Food & Restaurant
// Brand Icons" design handoff (design_handoff_brand_icons/Brand Graphics.dc.html).
// Colors reference the Spoontab palette custom properties (src/styles/brand.css)
// rather than hardcoded hex, so they track the palette if it ever changes.

type IconProps = { className?: string };

export function TwoTopPlaceSettingIcon({ className }: IconProps) {
    return (
        <svg viewBox="0 0 120 120" className={className}>
            <circle cx="60" cy="56" r="34" fill="var(--sand-400)" />
            <circle cx="60" cy="56" r="26" fill="var(--sand-50)" />
            <rect x="52" y="30" width="16" height="16" rx="4" fill="var(--olive-500)" />
            <ellipse cx="30" cy="98" rx="14" ry="6" fill="var(--olive-300)" />
            <ellipse cx="90" cy="98" rx="14" ry="6" fill="var(--olive-300)" />
            <rect x="24" y="86" width="12" height="12" rx="3" fill="var(--sand-500)" />
            <rect x="84" y="86" width="12" height="12" rx="3" fill="var(--sand-500)" />
        </svg>
    );
}

export function FloorPlanGridIcon({ className }: IconProps) {
    return (
        <svg viewBox="0 0 120 120" className={className}>
            <rect x="10" y="10" width="100" height="100" rx="8" fill="none" stroke="var(--sand-300)" strokeWidth="2" />
            <line x1="10" y1="35" x2="110" y2="35" stroke="var(--sand-200)" strokeWidth="1.5" />
            <line x1="10" y1="60" x2="110" y2="60" stroke="var(--sand-200)" strokeWidth="1.5" />
            <line x1="10" y1="85" x2="110" y2="85" stroke="var(--sand-200)" strokeWidth="1.5" />
            <line x1="35" y1="10" x2="35" y2="110" stroke="var(--sand-200)" strokeWidth="1.5" />
            <line x1="60" y1="10" x2="60" y2="110" stroke="var(--sand-200)" strokeWidth="1.5" />
            <line x1="85" y1="10" x2="85" y2="110" stroke="var(--sand-200)" strokeWidth="1.5" />
            <rect x="18" y="18" width="14" height="14" rx="4" fill="var(--forest-500)" />
            <rect x="68" y="18" width="14" height="14" rx="4" fill="var(--rust-500)" />
            <rect x="43" y="43" width="14" height="14" rx="4" fill="var(--ochre-500)" />
            <rect x="93" y="68" width="14" height="14" rx="4" fill="var(--forest-500)" />
            <rect x="18" y="93" width="14" height="14" rx="4" fill="var(--sand-400)" />
        </svg>
    );
}

export function RoundTableIcon({ className }: IconProps) {
    return (
        <svg viewBox="0 0 120 120" className={className}>
            <circle cx="60" cy="60" r="30" fill="var(--sand-400)" />
            <circle cx="60" cy="60" r="22" fill="var(--sand-50)" />
            <ellipse cx="60" cy="20" rx="12" ry="6" fill="var(--olive-300)" />
            <ellipse cx="60" cy="100" rx="12" ry="6" fill="var(--olive-300)" />
            <ellipse cx="20" cy="60" rx="6" ry="12" fill="var(--olive-300)" />
            <ellipse cx="100" cy="60" rx="6" ry="12" fill="var(--olive-300)" />
        </svg>
    );
}

export function RectangleTableIcon({ className }: IconProps) {
    return (
        <svg viewBox="0 0 120 120" className={className}>
            <rect x="20" y="38" width="80" height="44" rx="10" fill="var(--sand-400)" />
            <rect x="27" y="45" width="66" height="30" rx="6" fill="var(--sand-50)" />
            <rect x="23" y="20" width="15" height="10" rx="4" fill="var(--olive-300)" />
            <rect x="42.5" y="20" width="15" height="10" rx="4" fill="var(--olive-300)" />
            <rect x="62" y="20" width="15" height="10" rx="4" fill="var(--olive-300)" />
            <rect x="81.5" y="20" width="15" height="10" rx="4" fill="var(--olive-300)" />
            <rect x="23" y="90" width="15" height="10" rx="4" fill="var(--olive-300)" />
            <rect x="42.5" y="90" width="15" height="10" rx="4" fill="var(--olive-300)" />
            <rect x="62" y="90" width="15" height="10" rx="4" fill="var(--olive-300)" />
            <rect x="81.5" y="90" width="15" height="10" rx="4" fill="var(--olive-300)" />
        </svg>
    );
}

export function SquareTableIcon({ className }: IconProps) {
    return (
        <svg viewBox="0 0 120 120" className={className}>
            <rect x="28" y="28" width="64" height="64" rx="10" fill="var(--sand-400)" />
            <rect x="36" y="36" width="48" height="48" rx="6" fill="var(--sand-50)" />
            <rect x="45" y="12" width="16" height="10" rx="4" fill="var(--olive-300)" />
            <rect x="45" y="98" width="16" height="10" rx="4" fill="var(--olive-300)" />
            <rect x="12" y="45" width="10" height="16" rx="4" fill="var(--olive-300)" />
            <rect x="98" y="45" width="10" height="16" rx="4" fill="var(--olive-300)" />
        </svg>
    );
}
