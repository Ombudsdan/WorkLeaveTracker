/**
 * Navigation regression tests.
 *
 * These tests specifically cover the data-loading failures described in the
 * issue: pages rendering empty or API 404s appearing after navigating between
 * /dashboard and /profile.
 *
 * The root cause was Next.js's client-side router cache serving a stale React
 * component snapshot instead of mounting a fresh component (and thus skipping
 * the data-fetching useEffect).  The fix was to replace Next.js <Link> with
 * plain <a> tags in the NavBar, forcing a full browser navigation that always
 * triggers a fresh mount and fresh API call.
 *
 * Tests here guard against that regression recurring.
 */
import { test, expect } from "@playwright/test";
import { resetDb, ALICE } from "./helpers/db";
import { loginAs } from "./helpers/auth";
import { addLeave, getTestDates } from "./helpers/leave";

test.beforeEach(() => {
  resetDb();
});

test.describe("Navigation data freshness", () => {
  test("dashboard loads fresh data on every visit via navbar link", async ({ page }) => {
    await loginAs(page, ALICE.email, ALICE.password);

    // Navigate to profile, then click Dashboard in the navbar
    await page.goto("/profile");
    await page.getByRole("link", { name: "Dashboard" }).click();
    await page.waitForURL(/\/dashboard/);

    // Dashboard should display the user's name in the navbar — confirming data was loaded
    await expect(page.getByRole("navigation").getByText("Alice Smith")).toBeVisible();
  });

  test("profile loads fresh data on every visit via navbar link", async ({ page }) => {
    await loginAs(page, ALICE.email, ALICE.password);

    // Navigate to profile via navbar link
    await page.getByRole("link", { name: "Profile" }).click();
    await page.waitForURL(/\/profile/);

    // Profile should show Alice's personal details — confirming data was loaded
    await expect(page.getByLabel("First Name")).toHaveValue("Alice");
    await expect(page.getByLabel("Last Name")).toHaveValue("Smith");
  });

  test("profile allowances are NOT empty after dashboard → profile → dashboard → profile", async ({
    page,
  }) => {
    await loginAs(page, ALICE.email, ALICE.password);

    // dashboard → profile
    await page.getByRole("link", { name: "Profile" }).click();
    await page.waitForURL(/\/profile/);

    // dashboard (via navbar)
    await page.getByRole("link", { name: "Dashboard" }).click();
    await page.waitForURL(/\/dashboard/);

    // profile again — this is where the bug produced empty sections
    await page.getByRole("link", { name: "Profile" }).click();
    await page.waitForURL(/\/profile/);

    // Leave Allowances section must have content (not just the empty-state message)
    await expect(page.getByText(/no allowances configured yet/i)).not.toBeVisible();
    // The year allowance rows contain the year numbers
    await expect(page.getByText(/2025|2026/).first()).toBeVisible();
  });

  test("pinned users are NOT empty after dashboard → profile → dashboard → profile", async ({
    page,
  }) => {
    await loginAs(page, ALICE.email, ALICE.password);

    // dashboard → profile → dashboard → profile
    await page.getByRole("link", { name: "Profile" }).click();
    await page.waitForURL(/\/profile/);

    await page.getByRole("link", { name: "Dashboard" }).click();
    await page.waitForURL(/\/dashboard/);

    await page.getByRole("link", { name: "Profile" }).click();
    await page.waitForURL(/\/profile/);

    // Pinned Users section must show Bob (Alice has him pinned in seed data),
    // not the empty-state "No users pinned yet." message
    await expect(page.getByText(/no users pinned yet/i)).not.toBeVisible();
    await expect(page.getByText(/bob/i)).toBeVisible();
  });

  test("adding leave, visiting profile, then adding another leave succeeds (no 404)", async ({
    page,
  }) => {
    // This is the exact sequence that triggered api/entries 404 before the fix
    await loginAs(page, ALICE.email, ALICE.password);
    const { startA, endA, startB, endB, startC, endC } = getTestDates();

    // Monitor for 404 responses throughout the test
    const failedRequests: string[] = [];
    page.on("response", (response) => {
      if (response.status() === 404 && response.url().includes("/api/")) {
        failedRequests.push(`${response.url()} → ${response.status()}`);
      }
    });

    // Add first leave
    await addLeave(page, startA, endA);

    // Add second leave
    await addLeave(page, startB, endB);

    // Navigate to profile
    await page.getByRole("link", { name: "Profile" }).click();
    await page.waitForURL(/\/profile/);
    // Confirm profile data loads (not just an empty shell)
    await expect(page.getByLabel("First Name")).toHaveValue("Alice");

    // Navigate back to dashboard
    await page.getByRole("link", { name: "Dashboard" }).click();
    await page.waitForURL(/\/dashboard/);
    await expect(page.getByRole("navigation").getByText("Alice Smith")).toBeVisible();

    // Add a third leave — this should NOT produce a 404
    await addLeave(page, startC, endC);

    // Assert that no API requests returned 404
    expect(failedRequests).toHaveLength(0);
  });

  test("navigating back to dashboard after profile does NOT show 'profile could not be loaded' error", async ({
    page,
  }) => {
    await loginAs(page, ALICE.email, ALICE.password);

    // dashboard → profile → dashboard (the route that previously broke)
    await page.getByRole("link", { name: "Profile" }).click();
    await page.waitForURL(/\/profile/);

    await page.getByRole("link", { name: "Dashboard" }).click();
    await page.waitForURL(/\/dashboard/);
    await expect(page.getByRole("navigation").getByText("Alice Smith")).toBeVisible();

    await expect(page.getByText(/your profile could not be loaded/i)).not.toBeVisible();
  });

  test("navbar Dashboard and Profile links are plain anchors (no next/link prefetching)", async ({
    page,
  }) => {
    await loginAs(page, ALICE.email, ALICE.password);

    // next/link adds a data-prefetch attribute; plain <a> tags do not.
    // This test ensures the NavBar keeps using plain <a> for hard navigation.
    const dashboardLink = page.getByRole("link", { name: "Dashboard" });
    const profileLink = page.getByRole("link", { name: "Profile" });

    await expect(dashboardLink).toBeVisible();
    await expect(profileLink).toBeVisible();

    expect(await dashboardLink.getAttribute("data-prefetch")).toBeNull();
    expect(await profileLink.getAttribute("data-prefetch")).toBeNull();
  });
});
