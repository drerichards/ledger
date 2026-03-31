import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  // All E2E tests live in /e2e
  testDir: "./e2e",

  // Run each test file in parallel — fine for stateless localStorage app
  fullyParallel: true,

  // CI: fail fast. Locally: allow one retry on flake
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 1,

  // Single worker on CI to avoid port conflicts; unlimited locally
  workers: process.env.CI ? 1 : undefined,

  reporter: [
    ["html", { open: "never" }],
    ["list"],
  ],

  use: {
    // Dev server base URL — must match whatever port `next dev` runs on
    baseURL: "http://localhost:3000",

    // Attach a trace on first retry so you can debug failures
    trace: "on-first-retry",

    // Screenshot only on failure
    screenshot: "only-on-failure",
  },

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "firefox",
      use: { ...devices["Desktop Firefox"] },
    },
    {
      name: "webkit",
      use: { ...devices["Desktop Safari"] },
    },
  ],

  // Spin up `next dev` automatically before running E2E tests
  webServer: {
    command: "pnpm dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
