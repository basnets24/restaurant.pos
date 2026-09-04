import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Compass, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TOUR_STEPS, type TourStep } from "./tourSteps";

// Literal palette for the tour surface, distinct from the theme's own
// tokens by design (per the user's spec) rather than reusing --brand/
// --brand-strong - deliberately not folded into brand.css since this is a
// one-off treatment for the tour only, not a reusable design token.
const TOUR_SURFACE = "#435313"; // deep olive
const TOUR_BORDER = "#708629";
const TOUR_HEADING = "#FFFBE8"; // cream
const TOUR_BODY = "#E8EDC8"; // muted cream
const TOUR_ACCENT = "#F3DD63"; // pale yellow/cream - progress fill, Next button, icon
const TOUR_ACCENT_TEXT = "#3B2A12"; // dark brown, for text/icon on the pale yellow surfaces
const TOUR_RING = "#9ACD32"; // bright yellow-green focus ring
const TOUR_OVERLAY = "rgba(36, 28, 12, 0.38)"; // warm brown page overlay
const TOUR_SHADOW = "0 24px 70px rgba(37, 30, 12, 0.35)";

const TOUR_CARD_STYLE: React.CSSProperties = {
    backgroundColor: TOUR_SURFACE,
    border: `1px solid ${TOUR_BORDER}`,
    boxShadow: TOUR_SHADOW,
};

export function TourTooltip({
    step,
    duringModal,
    onNext,
    onSkip,
}: {
    step: TourStep;
    // A real modal (e.g. the payment dialog) is open and already dims the
    // rest of the page with its own backdrop - the tour's own dimming
    // overlay would stack on top of that and darken the modal's content too
    // (it's never part of the spotlight cutout), so skip it in that case and
    // show only the card, at full brightness like the modal itself.
    duringModal?: boolean;
    onNext: () => void;
    onSkip: () => void;
}) {
    const stepNumber = TOUR_STEPS.findIndex((s) => s.id === step.id) + 1;
    const isLast = stepNumber === TOUR_STEPS.length;

    // The card always renders in a fixed corner rather than anchored (via
    // Radix Popover) next to whatever step.target resolves to. That was
    // tried first and kept breaking in ways that share one root cause: a
    // popover positioned relative to a *real content* element - a small
    // dialog with too little room around it (seat-party), a huge canvas
    // (floor-plan), a menu item card whose height varies with its
    // description text and can push the card past a short viewport's
    // bottom edge (menu-grid) - has no anchor point guaranteed to leave
    // enough room in every direction. The spotlight ring below already
    // shows which element the step is about; the card doesn't also need to
    // sit next to it to make that clear, so it just stays somewhere always
    // safe instead. Bottom-left specifically: every current target either
    // sits in the main content column (never reaches the bottom-left
    // corner) or the fixed right-hand order sidebar (fire-btn/pay-btn) -
    // bottom-left is clear of both.
    return (
        <>
            {!duringModal && <TourOverlay target={step.target} />}
            {createPortal(
                <div
                    // Identifies this card to any Dialog's onPointerDownOutside
                    // (e.g. CheckoutPaymentDialog) so a click here can be told
                    // apart from a real outside click and not dismiss it - see
                    // that component's own comment.
                    data-tour-portal
                    className="pointer-events-auto fixed bottom-6 left-6 z-[100] w-80 rounded-xl p-5"
                    style={TOUR_CARD_STYLE}
                >
                    <TourCardBody step={step} stepNumber={stepNumber} isLast={isLast} onNext={onNext} onSkip={onSkip} />
                </div>,
                document.body
            )}
        </>
    );
}

// Tracks the live bounding rect of whatever currently matches `target` via
// rAF, re-querying the selector fresh every frame rather than trusting a
// single resolved Element reference. Two reasons a stale reference would
// drift: the floor plan's table targets move under pan/zoom (a CSS
// transform on an ancestor, not a layout change ResizeObserver would
// catch); and an unrelated background re-render elsewhere on the page (a
// react-query refetch, for instance) can remount an ancestor and swap in a
// brand-new DOM node for the same logical element, silently detaching the
// one a captured reference still points to (a detached node's
// getBoundingClientRect() collapses to an all-zero rect - the spotlight
// would otherwise pin itself to the top-left corner of the screen instead
// of following the real target).
function useAnchorRect(target: string): DOMRect | null {
    const [rect, setRect] = useState<DOMRect | null>(null);
    useEffect(() => {
        if (!target) {
            // Reacting to the target prop (an external DOM query) going away.
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setRect(null);
            return;
        }
        let raf: number;
        const tick = () => {
            const el = document.querySelector(target);
            setRect(el ? el.getBoundingClientRect() : null);
            raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(raf);
    }, [target]);
    return rect;
}

// Full-page dimming with a cutout around the current target (via a
// box-shadow spread large enough to cover the rest of the viewport, rather
// than an SVG mask - simpler for a single rectangular hole). Entirely
// pointer-events-none, including the "hole": the cutout is purely visual,
// real clicks on the target already work directly against the app's own
// element underneath regardless of what's drawn on top.
function TourOverlay({ target }: { target: string }) {
    const rect = useAnchorRect(target);
    return createPortal(
        <div className="fixed inset-0 z-[90] pointer-events-none">
            {rect ? (
                <div
                    className="absolute rounded-lg transition-[top,left,width,height] duration-150"
                    style={{
                        top: rect.top - 4,
                        left: rect.left - 4,
                        width: rect.width + 8,
                        height: rect.height + 8,
                        boxShadow: `0 0 0 9999px ${TOUR_OVERLAY}`,
                        outline: `3px solid ${TOUR_RING}`,
                        outlineOffset: 2,
                    }}
                />
            ) : (
                <div className="absolute inset-0" style={{ background: TOUR_OVERLAY }} />
            )}
        </div>,
        document.body
    );
}

function TourCardBody({
    step,
    stepNumber,
    isLast,
    onNext,
    onSkip,
}: {
    step: TourStep;
    stepNumber: number;
    isLast: boolean;
    onNext: () => void;
    onSkip: () => void;
}) {
    return (
        <div className="flex flex-col gap-3">
            <div className="flex items-start gap-2.5">
                <div
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                    style={{ backgroundColor: "rgba(255,251,232,0.12)", color: TOUR_ACCENT }}
                >
                    <Compass className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                        <h4 className="font-semibold" style={{ color: TOUR_HEADING }}>{step.title}</h4>
                        <button
                            type="button"
                            aria-label="Dismiss tour"
                            onClick={onSkip}
                            className="shrink-0 transition-opacity hover:opacity-100"
                            style={{ color: TOUR_BODY, opacity: 0.7 }}
                        >
                            <X className="h-4 w-4" />
                        </button>
                    </div>
                    <p className="mt-1 text-sm" style={{ color: TOUR_BODY }}>{step.body}</p>
                </div>
            </div>

            <div className="flex flex-col gap-1.5">
                <span
                    className="text-[10px] font-semibold uppercase tracking-wide"
                    style={{ color: TOUR_BODY, opacity: 0.85 }}
                >
                    Step {stepNumber} of {TOUR_STEPS.length}
                </span>
                <div className="flex gap-1">
                    {TOUR_STEPS.map((s, i) => (
                        <div
                            key={s.id}
                            className="h-1 flex-1 rounded-full"
                            style={{ backgroundColor: i < stepNumber ? TOUR_ACCENT : "rgba(232,237,200,0.25)" }}
                        />
                    ))}
                </div>
            </div>

            <div className="flex items-center justify-between pt-1">
                <button
                    type="button"
                    onClick={onSkip}
                    className="text-xs transition-opacity hover:opacity-100"
                    style={{ color: TOUR_BODY, opacity: 0.75 }}
                >
                    Skip tour
                </button>
                {step.advanceOn === "next-click" && (
                    <Button
                        size="sm"
                        onClick={isLast ? onSkip : onNext}
                        style={{ backgroundColor: TOUR_ACCENT, color: TOUR_ACCENT_TEXT }}
                        className="hover:opacity-90"
                    >
                        {isLast ? "Done" : "Next"}
                    </Button>
                )}
            </div>
        </div>
    );
}
