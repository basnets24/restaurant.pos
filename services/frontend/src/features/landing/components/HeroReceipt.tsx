/** The hero's one supporting visual: a printed order ticket standing in for a
 * dashboard screenshot or device mockup. Deliberately just paper, ink, and a
 * jagged tear — nothing here claims to be a real product screen. */

const ITEMS = [
    { name: "Margherita, 12\"", qty: 1, price: 16.5 },
    { name: "House Salad", qty: 1, price: 9.0 },
    { name: "Espresso x2", qty: 2, price: 7.0 },
];

const SUBTOTAL = ITEMS.reduce((sum, i) => sum + i.price, 0);
const TAX = SUBTOTAL * 0.0875;
const TOTAL = SUBTOTAL + TAX;

const money = (n: number) => n.toFixed(2);

/** Fixed (not random-per-render) jagged points along the bottom edge — reads
 * as a torn receipt without shifting on every re-render or between server
 * and client. */
const TEAR_POINTS = [0, 6, 3, 9, 2, 8, 4, 10, 1, 7, 3, 9, 5, 0];
const tearClipPath = () => {
    const n = TEAR_POINTS.length - 1;
    const bottom = TEAR_POINTS
        .map((y, i) => `${(i / n) * 100}% calc(100% - ${y}px)`)
        .join(", ");
    return `polygon(0 0, 100% 0, 100% calc(100% - 4px), ${bottom}, 0 calc(100% - 4px))`;
};

export function HeroReceipt() {
    return (
        <div
            className="mx-auto w-full max-w-[280px] select-none sm:max-w-[300px]"
            style={{ transform: "rotate(-1.5deg)" }}
            aria-hidden="true"
        >
            <div
                className="relative bg-[var(--fig-base)] px-6 pb-8 pt-6"
                style={{
                    clipPath: tearClipPath(),
                    boxShadow: "0 2px 4px rgba(37,31,24,0.08), 0 18px 34px -12px rgba(37,31,24,0.35)",
                }}
            >
                <div className="text-center">
                    <div className="font-display text-lg text-white">Spoontab</div>
                    <div className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.15em] text-white/60">
                        Order Ticket
                    </div>
                </div>

                <div className="my-4 border-t border-dashed border-white/20" />

                <div className="flex items-center justify-between font-mono text-[11px] text-white/60">
                    <span>#04182</span>
                    <span>Sep 02 · 6:42 PM</span>
                </div>

                <div className="mt-1 flex items-center gap-1.5">
                    <span className="inline-block h-1.5 w-1.5 rounded-full bg-brand" />
                    <span className="font-mono text-[10px] uppercase tracking-wide text-[var(--olive-300)]">Confirmed</span>
                </div>

                <div className="my-4 border-t border-dashed border-white/20" />

                <ul className="space-y-2 font-mono text-[12px] text-white">
                    {ITEMS.map((item) => (
                        <li key={item.name} className="flex items-baseline justify-between gap-3">
                            <span className="min-w-0 truncate text-white/60">
                                {item.qty} × {item.name}
                            </span>
                            <span className="font-numeric shrink-0">{money(item.price)}</span>
                        </li>
                    ))}
                </ul>

                <div className="my-4 border-t border-dashed border-white/20" />

                <div className="space-y-1 font-mono text-[12px]">
                    <div className="flex items-baseline justify-between text-white/60">
                        <span>Subtotal</span>
                        <span className="font-numeric">{money(SUBTOTAL)}</span>
                    </div>
                    <div className="flex items-baseline justify-between text-white/60">
                        <span>Tax</span>
                        <span className="font-numeric">{money(TAX)}</span>
                    </div>
                    <div className="flex items-baseline justify-between pt-1 text-sm font-semibold text-white">
                        <span>Total</span>
                        <span className="font-numeric">{money(TOTAL)}</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
