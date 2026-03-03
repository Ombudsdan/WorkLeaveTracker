/**
 * Save-then-navigate regression tests.
 *
 * Two bugs were reported:
 *
 *  1. Leave Allowances and Pinned Users sections become empty after a
 *     save → navigate → navigate back → save → navigate → navigate back
 *     sequence (particularly on the second cycle).
 *
 *  2. Dashboard shows "Your profile could not be loaded" after pinning a user
 *     in profile, saving, then navigating to dashboard.
 *
 *  3. (new) Profile signs the user out when their data is transiently
 *     unavailable (Vercel Lambda cold start) — the user is then unable to
 *     log back in because the login Lambda also serves stale data.
 *
 * These tests also cover longer journeys (10+ cycles) and journeys that
 * mutate data (save profile, add leave) at each step, because the user
 * reported encountering failures only after many back-and-forth navigations.
 *
 * All tests reset the database to the example seed state before each run.
 */
import { test, expect } from "@playwright/test";
import { resetDb, ALICE, BOB } from "./helpers/db";
import { loginAs } from "./helpers/auth";
import { addLeave, getTestDates } from "./helpers/leave";

test.beforeEach(() => {
  resetDb();
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Navigate to the profile page via the NavBar link and wait for it to load. */
async function goToProfile(page: Parameters<typeof loginAs>[0]) {
  await page.getByRole("link", { name: "Profile" }).click();
  await page.waitForURL(/\/profile/);
  // Wait for the first-name field to be populated, confirming a successful
  // data load (not just the static HTML shell).
  await page.getByLabel("First Name").waitFor({ state: "visible" });
}

/** Navigate to the dashboard via the NavBar link and wait for it to load. */
async function goToDashboard(page: Parameters<typeof loginAs>[0]) {
  await page.getByRole("link", { name: "Dashboard" }).click();
  await page.waitForURL(/\/dashboard/);
  // The Sign Out button only appears once the session is resolved.
  await page.getByRole("button", { name: "Sign Out" }).waitFor({ state: "visible" });
}

/** Assert that the profile page shows non-empty allowances. */
async function assertProfileSectionsPopulated(page: Parameters<typeof loginAs>[0]) {
  await expect(page.getByText(/no allowances configured yet/i)).not.toBeVisible();
  await expect(page.getByText(/2025|2026/).first()).toBeVisible();
}

/** Assert that the dashboard is loaded without any error banner. */
async function assertDashboardLoaded(page: Parameters<typeof loginAs>[0]) {
  await expect(page.getByText(/your profile could not be loaded/i)).not.toBeVisible();
  await expect(page.getByRole("navigation").getByText(/Alice/)).toBeVisible();
}

/** Save the profile and wait for the "Saved successfully" confirmation. */
async function saveProfile(page: Parameters<typeof loginAs>[0]) {
  await page.getByRole("button", { name: "Save Profile" }).click();
  await expect(page.getByText(/saved successfully/i)).toBeVisible();
}

/**
 * Navigate to the connections page and remove Bob if he is connected.
 * Removing a connection calls PATCH /api/users — the same code path that
 * was previously exercised by the "pin user + save profile" flow.
 */
async function removeConnectionIfPresent(
  page: Parameters<typeof loginAs>[0],
  name: RegExp | string
) {
  await page.goto("/connections");
  await page.getByText("My Connections").waitFor({ state: "visible" });
  const removeButton = page
    .locator("li")
    .filter({ hasText: name })
    .getByRole("button", { name: "Remove" });
  if (await removeButton.isVisible()) {
    await removeButton.click();
  }
}

// ---------------------------------------------------------------------------
// Short journey — sections populated
// ---------------------------------------------------------------------------

test.describe("Save then navigate", () => {
  test("edit name → save → dashboard → profile: sections populated", async ({ page }) => {
    await loginAs(page, ALICE.email, ALICE.password);
    await goToProfile(page);

    const f = page.getByLabel("First Name");
    await f.clear();
    await f.fill("Alicia");
    await saveProfile(page);

    await goToDashboard(page);
    await goToProfile(page);

    await expect(page.getByLabel("First Name")).toHaveValue("Alicia");
    await assertProfileSectionsPopulated(page);
  });

  // ── Connection management bug ─────────────────────────────────────────────
  test("remove connection → dashboard: no error banner (exact reported failure)", async ({
    page,
  }) => {
    await loginAs(page, ALICE.email, ALICE.password);

    // Removing a connection calls PATCH /api/users — the same bug vector as the
    // old "pin user in profile + save profile" path that caused a dashboard error.
    await removeConnectionIfPresent(page, /bob/i);

    await goToDashboard(page);
    await assertDashboardLoaded(page);
  });

  test("remove connection → dashboard → profile: data persists", async ({ page }) => {
    await loginAs(page, ALICE.email, ALICE.password);

    // Removing a connection calls PATCH /api/users (same code path as the old "save profile")
    await removeConnectionIfPresent(page, /bob/i);

    await goToDashboard(page);
    await goToProfile(page);

    // Profile data should still be intact after the connection change + navigation
    await expect(page.getByLabel("First Name")).toHaveValue("Alice");
    await expect(page.getByText(/no allowances configured yet/i)).not.toBeVisible();
  });

  // ── The exact failing path reported by the user ──────────────────────────
  test("two consecutive save cycles: sections populated after both (exact reported failure)", async ({
    page,
  }) => {
    await loginAs(page, ALICE.email, ALICE.password);

    // Cycle 1
    await goToProfile(page);
    const f1 = page.getByLabel("First Name");
    await f1.clear();
    await f1.fill("Alicia");
    await saveProfile(page);
    await goToDashboard(page);
    await goToProfile(page);
    await expect(page.getByLabel("First Name")).toHaveValue("Alicia");
    await assertProfileSectionsPopulated(page);

    // Cycle 2 — this is where the bug manifested
    const f2 = page.getByLabel("First Name");
    await f2.clear();
    await f2.fill("Alice");
    await saveProfile(page);
    await goToDashboard(page);
    await goToProfile(page);

    await expect(page.getByLabel("First Name")).toHaveValue("Alice");
    await assertProfileSectionsPopulated(page);
  });

  // ── Two quick saves on the same page visit ───────────────────────────────
  test("save twice on same page visit: sections intact after both saves", async ({ page }) => {
    await loginAs(page, ALICE.email, ALICE.password);
    await goToProfile(page);

    const f = page.getByLabel("First Name");
    await f.clear();
    await f.fill("Alicia");
    await saveProfile(page);

    await f.clear();
    await f.fill("Alice");
    await saveProfile(page);

    await assertProfileSectionsPopulated(page);
  });

  // ── Error banner provides refresh, NOT a destructive sign-out ────────────
  test("dashboard error banner shows 'refresh the page' only (no sign-out)", async ({ page }) => {
    await loginAs(page, ALICE.email, ALICE.password);

    // Intercept GET /api/users to simulate transient server error
    await page.route("**/api/users", (route) => {
      if (route.request().method() === "GET") {
        route.fulfill({ status: 500, body: JSON.stringify({ error: "Server error" }) });
      } else {
        route.continue();
      }
    });

    await page.goto("/dashboard");

    // The error banner must appear with a refresh button
    await expect(page.getByText(/your profile could not be loaded/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /refresh the page/i })).toBeVisible();

    // There must NOT be a "sign in again" button that would destroy the session
    await expect(page.getByRole("button", { name: /sign in again/i })).not.toBeVisible();
  });

  test("profile error banner shows 'refresh the page' only (no sign-out)", async ({ page }) => {
    await loginAs(page, ALICE.email, ALICE.password);

    // Intercept GET /api/users to simulate all retries failing
    await page.route("**/api/users", (route) => {
      if (route.request().method() === "GET") {
        route.fulfill({ status: 500, body: JSON.stringify({ error: "Server error" }) });
      } else {
        route.continue();
      }
    });

    await page.goto("/profile");

    await expect(page.getByText(/your profile could not be loaded/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /refresh the page/i })).toBeVisible();

    // After a transient error, we must NOT have been signed out
    // (the Sign Out button is still present in the NavBar)
    await expect(page.getByRole("button", { name: "Sign Out" })).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// Longer journeys — 5+ and 10+ cycles
// ---------------------------------------------------------------------------

test.describe("Long navigation journeys", () => {
  test("5 dashboard→profile cycles without saving: data intact throughout", async ({ page }) => {
    await loginAs(page, ALICE.email, ALICE.password);

    for (let i = 0; i < 5; i++) {
      await goToDashboard(page);
      await goToProfile(page);
      await assertProfileSectionsPopulated(page);
    }
  });

  test("10 dashboard→profile cycles without saving: no error and data intact", async ({ page }) => {
    await loginAs(page, ALICE.email, ALICE.password);

    for (let i = 0; i < 10; i++) {
      await goToDashboard(page);
      await assertDashboardLoaded(page);
      await goToProfile(page);
      await assertProfileSectionsPopulated(page);
    }
  });

  test("5 cycles each saving profile: data and sections intact throughout", async ({ page }) => {
    await loginAs(page, ALICE.email, ALICE.password);

    const names = ["Alicia", "Alice", "Ali", "Alic", "Alice"];

    for (const name of names) {
      await goToProfile(page);
      const f = page.getByLabel("First Name");
      await f.clear();
      await f.fill(name);
      await saveProfile(page);
      await assertProfileSectionsPopulated(page);
      await goToDashboard(page);
      await assertDashboardLoaded(page);
    }

    // Final profile check after all saves
    await goToProfile(page);
    await assertProfileSectionsPopulated(page);
    await expect(page.getByLabel("First Name")).toHaveValue("Alice");
  });

  test("10 cycles each saving profile: no errors throughout", async ({ page }) => {
    await loginAs(page, ALICE.email, ALICE.password);

    for (let i = 0; i < 10; i++) {
      await goToProfile(page);
      const f = page.getByLabel("First Name");
      await f.clear();
      await f.fill(i % 2 === 0 ? "Alicia" : "Alice");
      await saveProfile(page);
      await assertProfileSectionsPopulated(page);
      await goToDashboard(page);
      await assertDashboardLoaded(page);
    }
  });
});

// ---------------------------------------------------------------------------
// Journeys that add leave entries on the dashboard step
// ---------------------------------------------------------------------------

test.describe("Navigate with leave additions", () => {
  test("add one leave → profile → dashboard: no errors", async ({ page }) => {
    await loginAs(page, ALICE.email, ALICE.password);
    const { startA, endA } = getTestDates();

    await addLeave(page, startA, endA);
    await assertDashboardLoaded(page);
    await goToProfile(page);
    await assertProfileSectionsPopulated(page);
    await goToDashboard(page);
    await assertDashboardLoaded(page);
  });

  test("add leave → profile save → dashboard → profile: all data intact", async ({ page }) => {
    await loginAs(page, ALICE.email, ALICE.password);
    const { startA, endA } = getTestDates();

    // Add leave on the dashboard
    await addLeave(page, startA, endA);

    // Go to profile and save
    await goToProfile(page);
    await assertProfileSectionsPopulated(page);
    const f = page.getByLabel("First Name");
    await f.clear();
    await f.fill("Alicia");
    await saveProfile(page);
    await assertProfileSectionsPopulated(page);

    // Back to dashboard — must load fine
    await goToDashboard(page);
    await assertDashboardLoaded(page);

    // Back to profile — must still be populated
    await goToProfile(page);
    await assertProfileSectionsPopulated(page);
    await expect(page.getByLabel("First Name")).toHaveValue("Alicia");
  });

  test("3 cycles of add-leave-then-visit-profile: no errors throughout", async ({ page }) => {
    await loginAs(page, ALICE.email, ALICE.password);
    const { startA, endA, startB, endB, startC, endC } = getTestDates();
    const leaves = [
      [startA, endA],
      [startB, endB],
      [startC, endC],
    ];

    for (const [start, end] of leaves) {
      await addLeave(page, start, end);
      await assertDashboardLoaded(page);
      await goToProfile(page);
      await assertProfileSectionsPopulated(page);
      await goToDashboard(page);
    }
  });

  test("add leave + save profile alternating for 4 cycles: no errors", async ({ page }) => {
    await loginAs(page, ALICE.email, ALICE.password);
    const { startA, endA, startB, endB } = getTestDates();

    // Cycle 1: add leave on dashboard
    await addLeave(page, startA, endA);

    // Cycle 1: save profile
    await goToProfile(page);
    const f1 = page.getByLabel("First Name");
    await f1.clear();
    await f1.fill("Alicia");
    await saveProfile(page);
    await assertProfileSectionsPopulated(page);

    // Cycle 2: back to dashboard
    await goToDashboard(page);
    await assertDashboardLoaded(page);
    await addLeave(page, startB, endB);

    // Cycle 2: save profile again
    await goToProfile(page);
    const f2 = page.getByLabel("First Name");
    await f2.clear();
    await f2.fill("Alice");
    await saveProfile(page);
    await assertProfileSectionsPopulated(page);

    // Final dashboard check
    await goToDashboard(page);
    await assertDashboardLoaded(page);
  });

  test("save profile multiple times then add leave: no 404s", async ({ page }) => {
    await loginAs(page, ALICE.email, ALICE.password);
    const { startA, endA } = getTestDates();

    // Monitor for 404 responses on API routes
    const failedRequests: string[] = [];
    page.on("response", (response) => {
      if (response.status() === 404 && response.url().includes("/api/")) {
        failedRequests.push(`${response.url()} → ${response.status()}`);
      }
    });

    // Save profile twice
    await goToProfile(page);
    const f1 = page.getByLabel("First Name");
    await f1.clear();
    await f1.fill("Alicia");
    await saveProfile(page);

    await f1.clear();
    await f1.fill("Alice");
    await saveProfile(page);

    // Navigate to dashboard and add leave — must not produce a 404
    await goToDashboard(page);
    await addLeave(page, startA, endA);

    expect(failedRequests).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Registration → setup → navigate journey
// ---------------------------------------------------------------------------

test.describe("Registration and first-time setup journey", () => {
  test("register → setup → dashboard loads without error", async ({ page }) => {
    // Register a new user
    await page.goto("/register");
    await page.locator('input[placeholder="Jane"]').fill("Charlie");
    await page.locator('input[placeholder="Doe"]').fill("Brown");
    await page.locator('input[type="email"]').fill("charlie@example.com");
    // Fill both password fields
    const passwordFields = page.locator('input[type="password"]');
    await passwordFields.first().fill("password123");
    await passwordFields.last().fill("password123");
    await page.getByRole("button", { name: "Create Account" }).click();
    await page.waitForURL(/\/login/);

    // Login as the new user
    await page.getByPlaceholder("you@example.com").fill("charlie@example.com");
    await page.locator('input[type="password"]').fill("password123");
    await page.getByRole("button", { name: "Sign In" }).click();
    // New users: login → /dashboard (loading) → /setup (dashboard detects no
    // yearAllowances and redirects).  Wait for the final /setup URL.
    await page.waitForURL(/\/setup/);

    // Complete the setup form
    const coreField = page.getByLabel("Core Days");
    await coreField.clear();
    await coreField.fill("25");
    await page.getByRole("button", { name: /save/i }).click();
    await page.waitForURL(/\/dashboard/);

    // Dashboard must load without the error banner
    await page.getByRole("button", { name: "Sign Out" }).waitFor({ state: "visible" });
    await expect(page.getByText(/your profile could not be loaded/i)).not.toBeVisible();
  });

  test("register → setup → dashboard → profile → dashboard: no errors", async ({ page }) => {
    await page.goto("/register");
    await page.locator('input[placeholder="Jane"]').fill("Dana");
    await page.locator('input[placeholder="Doe"]').fill("Blue");
    await page.locator('input[type="email"]').fill("dana@example.com");
    const passwordFields = page.locator('input[type="password"]');
    await passwordFields.first().fill("password123");
    await passwordFields.last().fill("password123");
    await page.getByRole("button", { name: "Create Account" }).click();
    await page.waitForURL(/\/login/);

    await page.getByPlaceholder("you@example.com").fill("dana@example.com");
    await page.locator('input[type="password"]').fill("password123");
    await page.getByRole("button", { name: "Sign In" }).click();
    // New users: login → /dashboard (loading) → /setup (dashboard detects no
    // yearAllowances and redirects).  Wait for the final /setup URL.
    await page.waitForURL(/\/setup/);

    const coreField = page.getByLabel("Core Days");
    await coreField.clear();
    await coreField.fill("25");
    await page.getByRole("button", { name: /save/i }).click();
    await page.waitForURL(/\/dashboard/);

    await page.getByRole("button", { name: "Sign Out" }).waitFor({ state: "visible" });
    await expect(page.getByText(/your profile could not be loaded/i)).not.toBeVisible();

    // Navigate to profile and back — must work without any errors
    await goToProfile(page);
    // The new user has exactly one year allowance from setup
    await expect(page.getByText(/no allowances configured yet/i)).not.toBeVisible();

    await goToDashboard(page);
    await expect(page.getByText(/your profile could not be loaded/i)).not.toBeVisible();
  });
});
