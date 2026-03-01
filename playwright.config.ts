import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright configuration.
 * Tests run against the Next.js development server (or a pre-built production
 * server when the `CI` environment variable is set).
 *
 * The webServer block auto-starts the server before the test suite runs and
 * tears it down afterwards, so no manual server management is required.
 */
export default defineConfig({
  testDir: "./e2e",

  /* Run each test file in parallel; keep individual tests in a file sequential
     so that database state is predictable within a spec. */
  fullyParallel: false,
  workers: 1,

  /* Fail the build on CI if tests are accidentally left in `.only` state */
  forbidOnly: !!process.env.CI,

  /* No retries — flaky tests should be fixed, not retried */
  retries: 0,

  reporter: process.env.CI
    ? [["github"], ["html", { outputFolder: "playwright-report", open: "never" }]]
    : [["list"], ["html", { outputFolder: "playwright-report", open: "never" }]],

  use: {
    baseURL: "http://localhost:3000",
    /* Use a tall viewport so the AddLeaveModal (which is quite long) fits
       fully within the visible area and all buttons are clickable. */
    viewport: { width: 1280, height: 1080 },
    /* Capture trace only on first retry to keep CI artefact sizes manageable */
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "off",
  },

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],

  webServer: {
    /* In CI we build once then run the production server; locally we use `dev`
       so changes are reflected instantly. */
    command: process.env.CI
      ? "npm run start"
      : "npm run dev",
    url: "http://localhost:3000",
    /* Allow up to 3 minutes for the Next.js build/start in CI */
    timeout: 180_000,
    reuseExistingServer: !process.env.CI,
    env: {
      NEXTAUTH_URL: "http://localhost:3000",
      NEXTAUTH_SECRET: "playwright-test-secret",
    },
  },
});
