import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

// ─────────────────────────────────────────────────────────────────────────────
// Shared public-site footer — brand mark, optional CTA, and the portfolio
// disclaimer. Used by every public page (Landing, Engineering) so the two
// don't drift into different footer treatments.
// ─────────────────────────────────────────────────────────────────────────────

export interface AppFooterProps {
  /** Shows the outlined CTA button on the right when provided */
  onCta?: () => void;
  ctaLabel?: string;
}

export function AppFooter({ onCta, ctaLabel = "Try Demo" }: AppFooterProps) {
  return (
    <footer className="bg-card border-t border-border py-5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 shrink-0 bg-primary rounded-lg flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-[10px]">RMS</span>
          </div>
          <p className="text-xs text-muted-foreground">
            This is a portfolio demo project built by Sneha Basnet, not an active commercial product.
          </p>
        </div>
        {onCta && (
          <Button variant="outline" size="sm" onClick={onCta} className="hidden sm:flex shrink-0">
            {ctaLabel}
            <ArrowRight className="ml-2 h-3.5 w-3.5" />
          </Button>
        )}
      </div>
    </footer>
  );
}
