/** Section 05 (Tenancy) visual — nested containment rather than a linear flow
 * or a service network. There is deliberately no separate "Tenant" box above
 * "Restaurant": in this system a restaurant IS the tenant (root CLAUDE.md,
 * Diner ordering section — "Restaurant/Location aren't ITenantEntity rows,
 * they *are* the tenant"), so a wrapping level would just relabel the same
 * thing twice and misrepresent the actual data model. The real containment
 * is Restaurant -> Location -> your request -> the data you get back.
 * Matches TenantMiddleware.cs (Common.Library): an authenticated caller's
 * restaurant_id/location_id JWT claims (issued by Identity) are
 * authoritative whenever present, taking priority over X-Restaurant-Id/
 * X-Location-Id headers. */

const LEVELS = [
    { label: "Restaurant", detail: "the tenant itself — e.g. \"acme-bistro\"" },
    { label: "Location", detail: "one of its locations — e.g. \"sjc-01\"" },
    { label: "Your request", detail: "carries the restaurant + location ID from your login" },
    { label: "What you get back", detail: "only that restaurant + location's data" },
];

const ARIA_LABEL = "Restaurant contains Location, which contains your request, which resolves to only that restaurant and location's data. Every service enforces this from the request's own login information.";

export function TenancyContainment() {
    return (
        <div className="w-full rounded-lg border border-border bg-[var(--surface-sunken)]/60 p-5 sm:p-8">
            <div className="mx-auto flex max-w-md flex-col" role="img" aria-label={ARIA_LABEL}>
                {LEVELS.map((level, i) => {
                    const isLast = i === LEVELS.length - 1;
                    return (
                        <div
                            key={level.label}
                            className="relative rounded-lg border"
                            style={{
                                marginTop: i === 0 ? 0 : -1,
                                padding: `${16 + i * 3}px 20px`,
                                borderColor: isLast ? "var(--brand)" : "var(--border-strong)",
                                background: isLast
                                    ? "var(--brand-soft)"
                                    : `color-mix(in srgb, var(--surface) ${100 - i * 12}%, var(--surface-sunken))`,
                                zIndex: LEVELS.length - i,
                            }}
                        >
                            <div className="flex items-baseline justify-between gap-3">
                                <span className={`text-sm font-semibold ${isLast ? "text-brand-strong" : "text-foreground"}`}>
                                    {level.label}
                                </span>
                                <span className="font-mono text-[11px] text-muted-foreground">{level.detail}</span>
                            </div>
                        </div>
                    );
                })}
            </div>

            <div className="mt-6 flex flex-wrap items-center justify-center gap-3 font-mono text-[12px]">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-brand/40 bg-brand-soft px-3 py-1 text-brand-strong">
                    <span className="h-1.5 w-1.5 rounded-full bg-brand" aria-hidden="true" />
                    Matches your restaurant, allowed
                </span>
                <span
                    className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1"
                    style={{ borderColor: "color-mix(in srgb, var(--rust-500) 40%, transparent)", color: "var(--rust-600)" }}
                >
                    <span className="h-1.5 w-1.5 rounded-full" style={{ background: "var(--rust-500)" }} aria-hidden="true" />
                    Belongs to someone else, blocked
                </span>
            </div>
        </div>
    );
}
