import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";

// ─────────────────────────────────────────────────────────────────────────────
// Diner-surface header. Deliberately NOT the shared AppHeader: that one is the
// staff bar (brand navigates to /home, avatar dropdown signs out of the staff
// session). The diner header switches shape per view — brand + search on
// discovery, back + restaurant name + cart on a menu — so it takes its middle
// and right sections as slots.
// ─────────────────────────────────────────────────────────────────────────────

export interface DinerHeaderProps {
  /** Replaces the brand mark when set (menu view shows a back button + name). */
  left?: ReactNode;
  center?: ReactNode;
  right?: ReactNode;
}

export function DinerHeader({ left, center, right }: DinerHeaderProps) {
  const navigate = useNavigate();

  return (
    <header
      className="sticky top-0 z-40 border-b border-border"
      style={{
        background: "var(--header-bg)",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
      }}
    >
      <div className="mx-auto max-w-[1160px] px-4 sm:px-8 py-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            {left ?? (
              <button
                type="button"
                onClick={() => navigate("/order")}
                className="flex items-center gap-3 min-w-0 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-lg"
              >
                <div className="w-10 h-10 shrink-0 bg-primary rounded-[10px] flex items-center justify-center">
                  <span className="text-primary-foreground font-bold text-sm">S</span>
                </div>
                <span className="text-xl font-semibold text-foreground truncate">Spoontab</span>
              </button>
            )}
          </div>

          {center && <div className="flex flex-1 items-center gap-2 justify-center">{center}</div>}

          <div className="flex items-center gap-2 sm:gap-3 shrink-0">{right}</div>
        </div>
      </div>
    </header>
  );
}
