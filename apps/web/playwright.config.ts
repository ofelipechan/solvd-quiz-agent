import { defineConfig } from "@playwright/test";

/**
 * Runs the smoke spec against an already-running stack (the Dockerized
 * api+web from `docker compose up`, or `pnpm dev` processes pointed at a
 * Dockerized Postgres) — it does not manage the stack's lifecycle itself.
 *
 * `channel: "chrome"` uses the system-installed Chrome instead of
 * Playwright's bundled browser download, since this environment's network
 * cannot reach the Playwright browser CDN.
 */
export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  retries: 0,
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3000",
    channel: "chrome",
    trace: "on-first-retry",
  },
});
