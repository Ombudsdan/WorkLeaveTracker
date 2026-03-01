/**
 * Save-then-navigate regression tests.
 *
 * These tests cover the specific failure scenarios reported by the user:
 *
 *  1. Edit profile name → save → navigate to dashboard → navigate back to
 *     profile: leave allowances and pinned-users sections must NOT be empty.
 *
 *  2. Two consecutive edit+save cycles: the second navigation back to profile
 *     must still show populated sections (this was the exact failing path).
 *
 *  3. Pin a user → save → navigate to dashboard: the dashboard must load
 *     successfully (no "Your profile could not be loaded" banner).
 *
 *  4. Multiple (3+) save+navigate cycles: sections remain populated throughout.
 *
 * All tests reset the database to the seed state before each run so that the
 * exact starting conditions match what the user experienced.
 */
import { test, expect } from "@playwright/test";
import { resetDb, ALICE, BOB } from "./helpers/db";
import { loginAs } from "./helpers/auth";

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

/** Assert that the profile page has loaded with non-empty allowances/pins. */
async function assertProfileSectionsPopulated(page: Parameters<typeof loginAs>[0]) {
  await expect(page.getByText(/no allowances configured yet/i)).not.toBeVisible();
  await expect(page.getByText(/2025|2026/).first()).toBeVisible();
  await expect(page.getByText(/no users pinned yet/i)).not.toBeVisible();
}

/** Save the profile and wait for the "Saved successfully" confirmation. */
async function saveProfile(page: Parameters<typeof loginAs>[0]) {
  await page.getByRole("button", { name: "Save Profile" }).click();
  await expect(page.getByText(/saved successfully/i)).toBeVisible();
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

test.describe("Save then navigate", () => {
  test("edit name → save → navigate to dashboard → back to profile: sections populated", async ({
    page,
  }) => {
    await loginAs(page, ALICE.email, ALICE.password);

    await goToProfile(page);

    // Edit the first name
    const firstNameField = page.getByLabel("First Name");
    await firstNameField.clear();
    await firstNameField.fill("Alicia");

    await saveProfile(page);

    // Navigate to dashboard, then back to profile
    await goToDashboard(page);
    await goToProfile(page);

    // The updated name must have persisted
    await expect(page.getByLabel("First Name")).toHaveValue("Alicia");

    // Sections must still be populated — this is the core regression check
    await assertProfileSectionsPopulated(page);
  });

  test("two consecutive save cycles: sections populated after both", async ({ page }) => {
    await loginAs(page, ALICE.email, ALICE.password);

    // ── Cycle 1 ──────────────────────────────────────────────────────────────
    await goToProfile(page);

    const firstNameField = page.getByLabel("First Name");
    await firstNameField.clear();
    await firstNameField.fill("Alicia");
    await saveProfile(page);

    await goToDashboard(page);
    await goToProfile(page);

    await expect(page.getByLabel("First Name")).toHaveValue("Alicia");
    await assertProfileSectionsPopulated(page);

    // ── Cycle 2 (the exact failing scenario reported by the user) ─────────
    const firstNameField2 = page.getByLabel("First Name");
    await firstNameField2.clear();
    await firstNameField2.fill("Alice");
    await saveProfile(page);

    await goToDashboard(page);
    await goToProfile(page);

    // After the SECOND save+navigate cycle the bug previously caused empty sections
    await expect(page.getByLabel("First Name")).toHaveValue("Alice");
    await assertProfileSectionsPopulated(page);
  });

  test("pin user → save → navigate to dashboard: no error banner", async ({ page }) => {
    await loginAs(page, ALICE.email, ALICE.password);

    await goToProfile(page);

    // Alice already has Bob pinned in the seed data.  Unpin him first so we
    // can exercise the full pin+save flow from scratch.
    const unpinButton = page.getByRole("button", { name: "Unpin" }).first();
    if (await unpinButton.isVisible()) {
      await unpinButton.click();
    }

    // Now pin Bob via the PinUserModal
    await page.getByRole("button", { name: "+ Search User" }).click();
    const modal = page.locator("div.fixed").last();
    await modal.waitFor({ state: "visible" });
    await modal.getByLabel("Email address").fill(BOB.email);
    await modal.getByRole("button", { name: "Search & Pin" }).click();
    // Modal closes automatically on a successful pin
    await modal.waitFor({ state: "hidden" });

    // Verify Bob is listed in the pinned section
    await expect(page.getByText(/bob/i).first()).toBeVisible();

    await saveProfile(page);

    // Navigate to dashboard — this is where Bug 2 triggered the error banner
    await goToDashboard(page);

    // Dashboard must load correctly — no error banner
    await expect(page.getByText(/your profile could not be loaded/i)).not.toBeVisible();
    // Alice's name in the navbar confirms a successful data load
    await expect(page.getByRole("navigation").getByText("Alice Smith")).toBeVisible();
  });

  test("pin user → save → navigate to dashboard → back to profile: pinned user still shown", async ({
    page,
  }) => {
    await loginAs(page, ALICE.email, ALICE.password);

    await goToProfile(page);

    // Unpin all existing pins and then re-pin Bob
    const unpinButtons = page.getByRole("button", { name: "Unpin" });
    while ((await unpinButtons.count()) > 0) {
      await unpinButtons.first().click();
    }

    await page.getByRole("button", { name: "+ Search User" }).click();
    const modal = page.locator("div.fixed").last();
    await modal.waitFor({ state: "visible" });
    await modal.getByLabel("Email address").fill(BOB.email);
    await modal.getByRole("button", { name: "Search & Pin" }).click();
    await modal.waitFor({ state: "hidden" });

    await saveProfile(page);
    await goToDashboard(page);
    await goToProfile(page);

    // The pinned user must still appear after the round-trip
    await expect(page.getByText(/bob/i).first()).toBeVisible();
    await expect(page.getByText(/no users pinned yet/i)).not.toBeVisible();
  });

  test("three save+navigate cycles: sections remain populated throughout", async ({ page }) => {
    await loginAs(page, ALICE.email, ALICE.password);

    const names = ["Alicia", "Alice", "Ali"];

    for (const name of names) {
      await goToProfile(page);

      const firstNameField = page.getByLabel("First Name");
      await firstNameField.clear();
      await firstNameField.fill(name);
      await saveProfile(page);

      await goToDashboard(page);
      await goToProfile(page);

      // Confirm the name persisted and the sections are populated on every iteration
      await expect(page.getByLabel("First Name")).toHaveValue(name);
      await assertProfileSectionsPopulated(page);
    }
  });

  test("save profile → navigate to profile → edit name → save again → sections still populated", async ({
    page,
  }) => {
    await loginAs(page, ALICE.email, ALICE.password);

    // First save
    await goToProfile(page);
    const f1 = page.getByLabel("First Name");
    await f1.clear();
    await f1.fill("Alicia");
    await saveProfile(page);

    // Navigate away and back without going via dashboard (pure profile reload)
    await goToDashboard(page);
    await goToProfile(page);
    await expect(page.getByLabel("First Name")).toHaveValue("Alicia");
    await assertProfileSectionsPopulated(page);

    // Second save on the same profile visit
    const f2 = page.getByLabel("First Name");
    await f2.clear();
    await f2.fill("Alice");
    await saveProfile(page);

    // The re-sync after save should have kept allowances and pinned users intact
    await assertProfileSectionsPopulated(page);

    // Finally navigate to dashboard to confirm no error there either
    await goToDashboard(page);
    await expect(page.getByText(/your profile could not be loaded/i)).not.toBeVisible();
  });

  test("save profile then immediately save again: sections populated after both saves", async ({
    page,
  }) => {
    await loginAs(page, ALICE.email, ALICE.password);
    await goToProfile(page);

    // First save
    const f = page.getByLabel("First Name");
    await f.clear();
    await f.fill("Alicia");
    await saveProfile(page);

    // Second save immediately (without navigating away)
    await f.clear();
    await f.fill("Alice");
    await saveProfile(page);

    // Both saves should leave sections intact
    await assertProfileSectionsPopulated(page);
  });

  test("dashboard 'sign in again' button is shown when profile cannot be loaded", async ({
    page,
  }) => {
    // Simulate the error state by patching the API to return 401. We do this
    // by intercepting the /api/users GET request.
    await loginAs(page, ALICE.email, ALICE.password);

    // Intercept /api/users to return 401 on the NEXT dashboard load
    await page.route("**/api/users", (route) => {
      if (route.request().method() === "GET") {
        route.fulfill({ status: 401, body: JSON.stringify({ error: "Unauthorized" }) });
      } else {
        route.continue();
      }
    });

    // Navigate to dashboard (full reload triggers the intercepted GET)
    await page.goto("/dashboard");

    // The error banner must show with the "sign in again" option
    await expect(page.getByText(/your profile could not be loaded/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /sign in again/i })).toBeVisible();
  });
});
