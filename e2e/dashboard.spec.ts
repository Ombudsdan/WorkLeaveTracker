import { test, expect } from "@playwright/test";
import { resetDb, ALICE } from "./helpers/db";
import { loginAs } from "./helpers/auth";
import { addLeave, getTestDates } from "./helpers/leave";

test.beforeEach(() => {
  resetDb();
});

test.describe("Dashboard", () => {
  test("dashboard loads user data after login", async ({ page }) => {
    await loginAs(page, ALICE.email, ALICE.password);
    // Alice's name should appear in the navbar session area (unique selector)
    await expect(page.getByRole("navigation").getByText("Alice Smith")).toBeVisible();
  });

  test("dashboard shows the leave summary card", async ({ page }) => {
    await loginAs(page, ALICE.email, ALICE.password);
    // "View breakdown" is a button always present inside the SummaryCard
    await expect(page.getByRole("button", { name: /view breakdown/i })).toBeVisible();
  });

  test("dashboard shows the Add Leave button in the calendar", async ({ page }) => {
    await loginAs(page, ALICE.email, ALICE.password);
    await expect(page.getByRole("button", { name: "Add Leave" })).toBeVisible();
  });

  test("adding a leave entry saves it and closes the modal", async ({ page }) => {
    await loginAs(page, ALICE.email, ALICE.password);
    const { startA, endA } = getTestDates();
    await addLeave(page, startA, endA);
    // Modal should be gone
    await expect(page.locator("div.fixed")).not.toBeVisible();
  });

  test("can add two consecutive leave entries", async ({ page }) => {
    await loginAs(page, ALICE.email, ALICE.password);
    const { startA, endA, startB, endB } = getTestDates();

    await addLeave(page, startA, endA);
    // Second leave immediately after the first
    await addLeave(page, startB, endB);
    // Dashboard should still be showing (no error banner)
    await expect(page.getByText(/your profile could not be loaded/i)).not.toBeVisible();
  });
});
