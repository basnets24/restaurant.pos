/**
 * Seeded recruiter-facing demo diner account for the "Momo & Burger" restaurant.
 * Must match whatever `scripts/seed-demo.sh` creates — these are intentionally
 * public (there's nothing sensitive behind them), not secrets to protect.
 *
 * The admin demo has no credentials here: it authenticates via the `demo_admin`
 * custom grant (see AuthProvider.signInDemoAdmin, identity's DemoAdminGrantValidator),
 * which takes no credentials and always resolves to the one seeded demo admin.
 */
export const DEMO_DINER_EMAIL = "diner@momoandburger.com";
export const DEMO_DINER_PASSWORD = "Demo@Diner123";
