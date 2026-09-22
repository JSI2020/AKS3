import { defineConfig, devices } from "@playwright/test";

/**
 * Soft-launch smoke E2E.
 * Starts `next dev` when nothing is listening on BASE_URL.
 * Run: npm run test:e2e
 */
export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  fullyParallel: false,
  retries: 0,
  reporter: "list",
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3000",
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: process.env.PLAYWRIGHT_BASE_URL
    ? undefined
    : {
        command: "npm run dev",
        url: "http://127.0.0.1:3000/en",
        reuseExistingServer: !process.env.CI,
        timeout: 180_000,
      },
});
