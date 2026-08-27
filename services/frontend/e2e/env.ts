// Service URLs for the E2E suite. These mirror the defaults baked into
// public/config.js (what the app itself uses in local dev) rather than
// .env.development's VITE_* fallbacks, since config.js's window.* assignments
// win at runtime (see services/frontend/CLAUDE.md's "Runtime config" section).
// Override via env vars if your local stack binds different ports.
export const APP_URL = process.env.E2E_APP_URL ?? "http://localhost:5173";
export const IDENTITY_URL = process.env.E2E_IDENTITY_URL ?? "http://localhost:5265";
export const CATALOG_URL = process.env.E2E_CATALOG_URL ?? "http://localhost:5062";
export const ORDER_URL = process.env.E2E_ORDER_URL ?? "http://localhost:5236";

export const OIDC_CLIENT_ID = "frontend";
export const OIDC_REDIRECT_URI = `${APP_URL}/authentication/login-callback`;

// Seeded by IdentitySeedHostedService.cs — see root CLAUDE.md / that file for details.
export const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL ?? "admin@pos.com";
export const ADMIN_PASSWORD = process.env.IdentitySettings__AdminUserPassword;

if (!ADMIN_PASSWORD) {
  throw new Error(
    "IdentitySettings__AdminUserPassword is not set. Run tests with the repo root .env loaded " +
      "(playwright.config.ts loads it via dotenv) or export it manually."
  );
}
