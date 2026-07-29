// Flat, solid-color "Inventory & stock" illustrations from the "Food & Restaurant
// Brand Icons" design handoff (design_handoff_brand_icons/Brand Graphics.dc.html).
// Colors reference the Spoontab palette custom properties (src/styles/brand.css)
// rather than hardcoded hex, so they track the palette if it ever changes.

type IconProps = { className?: string };

export function ProduceCrateIcon({ className }: IconProps) {
    return (
        <svg viewBox="0 0 120 120" className={className}>
            <rect x="16" y="52" width="88" height="46" rx="6" fill="var(--sand-500)" />
            <rect x="16" y="52" width="88" height="10" fill="var(--sand-400)" />
            <line x1="16" y1="76" x2="104" y2="76" stroke="var(--sand-700)" strokeWidth="2" />
            <line x1="40" y1="52" x2="40" y2="98" stroke="var(--sand-700)" strokeWidth="2" />
            <line x1="80" y1="52" x2="80" y2="98" stroke="var(--sand-700)" strokeWidth="2" />
            <circle cx="34" cy="42" r="12" fill="var(--rust-500)" />
            <circle cx="60" cy="38" r="13" fill="var(--olive-500)" />
            <circle cx="86" cy="42" r="12" fill="var(--ochre-500)" />
        </svg>
    );
}

export function StockroomShelfIcon({ className }: IconProps) {
    return (
        <svg viewBox="0 0 120 120" className={className}>
            <rect x="20" y="18" width="80" height="84" rx="4" fill="none" stroke="var(--sand-500)" strokeWidth="5" />
            <line x1="20" y1="52" x2="100" y2="52" stroke="var(--sand-500)" strokeWidth="5" />
            <line x1="20" y1="78" x2="100" y2="78" stroke="var(--sand-500)" strokeWidth="5" />
            <rect x="28" y="26" width="22" height="18" rx="3" fill="var(--olive-300)" />
            <rect x="56" y="26" width="34" height="18" rx="3" fill="var(--sand-300)" />
            <rect x="28" y="58" width="34" height="12" rx="3" fill="var(--ochre-500)" />
            <rect x="66" y="58" width="24" height="12" rx="3" fill="var(--olive-500)" />
            <rect x="28" y="84" width="46" height="10" rx="3" fill="var(--sand-300)" />
        </svg>
    );
}
