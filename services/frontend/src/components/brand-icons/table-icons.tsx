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
