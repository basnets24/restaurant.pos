import { createPortal } from "react-dom";
import { Compass } from "lucide-react";

/** Steps of the demo customer's journey (see DEMO_DINER_EMAIL) - shown only to that seeded
 *  account, not real diners. Fixed bottom-left, same corner/z-index/portal-to-body approach as
 *  the staff guided tour's own TourTooltip, so the two demo experiences feel like one family
 *  and this doesn't compete with page content or the header for space. Unlike the tour it has
 *  no target to anchor near or spotlight - the diner flow has no single element worth
 *  highlighting the way the staff tour's targets do - so it's just the step indicator alone. */
const LABELS = ["Find your restaurant", "Order your choice of food", "Payment"] as const;

export function DinerDemoStepBar({ active }: { active: 1 | 2 | 3 }) {
  return createPortal(
    <div
      className="pointer-events-none fixed bottom-6 left-6 z-[100] flex w-64 items-center gap-2.5 rounded-xl p-3"
      style={{
        backgroundColor: "#435313",
        border: "1px solid #708629",
        boxShadow: "0 24px 70px rgba(37, 30, 12, 0.35)",
      }}
    >
      <div
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
        style={{ backgroundColor: "rgba(255,251,232,0.12)", color: "#F3DD63" }}
      >
        <Compass className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-[13px] font-semibold" style={{ color: "#FFFBE8" }}>
            {LABELS[active - 1]}
          </span>
        </div>
        <span
          className="text-[10px] font-semibold uppercase tracking-wide"
          style={{ color: "#E8EDC8", opacity: 0.85 }}
        >
          Step {active} of {LABELS.length}
        </span>
        <div className="mt-1.5 flex gap-1">
          {LABELS.map((label, i) => (
            <div
              key={label}
              className="h-1 flex-1 rounded-full"
              style={{ backgroundColor: i < active ? "#F3DD63" : "rgba(232,237,200,0.25)" }}
            />
          ))}
        </div>
      </div>
    </div>,
    document.body
  );
}
