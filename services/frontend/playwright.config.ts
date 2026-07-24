import { defineConfig, devices } from "@playwright/test";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Reuse the repo's root .env (GH_PAT, POSTGRES_PASSWORD, IdentitySettings__AdminUserPassword,
// Stripe test keys) instead of duplicating secrets into a frontend-only env file.
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const APP_URL = process.env.E2E_APP_URL ?? "http://localhost:5173";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  retries: 0,
  reporter: "html",
  outputDir: "test-results",
  use: {
    baseURL: APP_URL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  // No webServer block: this suite runs against the full stack (infra + all
  // 4 .NET services + frontend) started by `../../scripts/dev.sh` — Playwright
  // can't bring that up itself, so it's a documented precondition instead
  // (see services/frontend/CLAUDE.md).
  projects: [
    {
      name: "setup",
      testMatch: /auth\.setup\.ts/,
    },
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        storageState: "e2e/.auth/admin.json",
      },
      dependencies: ["setup"],
    },
  ],
});
