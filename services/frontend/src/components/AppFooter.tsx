// ─────────────────────────────────────────────────────────────────────────────
// Shared public-site footer — brand mark, portfolio attribution, and contact
// links. Used by every public page (Landing, Engineering) so the two don't
// drift into different footer treatments.
// ─────────────────────────────────────────────────────────────────────────────

const PORTFOLIO_URL = "https://snehabasnet.com";
const GITHUB_PROFILE_URL = "https://github.com/basnets24";
const LINKEDIN_URL = "https://www.linkedin.com/in/snehabasnet/";
const EMAIL = "snehabasnet224@gmail.com";

export function AppFooter() {
  return (
    <footer
      className="border-t border-border py-5"
      style={{ background: "linear-gradient(90deg, var(--background) 0%, color-mix(in srgb, var(--sand-100) 85%, var(--background)) 100%)" }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 shrink-0 bg-primary rounded-lg flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-[10px]">S</span>
          </div>
          <p className="text-sm text-muted-foreground">
            This is a portfolio demo project built by{" "}
            <a
              href={PORTFOLIO_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-foreground underline underline-offset-2 hover:text-primary"
            >
              Sneha Basnet
            </a>
            , not an active commercial product.
          </p>
        </div>
        <div className="flex items-center gap-3 text-sm text-muted-foreground shrink-0">
          <a href={GITHUB_PROFILE_URL} target="_blank" rel="noopener noreferrer" className="hover:text-foreground">
            GitHub
          </a>
          <span aria-hidden="true">·</span>
          <a href={LINKEDIN_URL} target="_blank" rel="noopener noreferrer" className="hover:text-foreground">
            LinkedIn
          </a>
          <span aria-hidden="true">·</span>
          <a href={`mailto:${EMAIL}`} className="hover:text-foreground">
            Email
          </a>
        </div>
      </div>
    </footer>
  );
}
