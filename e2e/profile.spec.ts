import { test, expect } from "@playwright/test";
import { resetDb, ALICE } from "./helpers/db";
import { loginAs } from "./helpers/auth";

test.beforeEach(() => {
  resetDb();
});

test.describe("Profile", () => {
  test("profile page loads the user's personal details", async ({ page }) => {
    await loginAs(page, ALICE.email, ALICE.password);
    await page.goto("/profile");

    // FormField components use htmlFor/id so getByLabel works here
    await expect(page.getByLabel("First Name")).toHaveValue("Alice");
    await expect(page.getByLabel("Last Name")).toHaveValue("Smith");
  });

  test("profile page shows leave allowances section", async ({ page }) => {
    await loginAs(page, ALICE.email, ALICE.password);
    await page.goto("/profile");

    // Leave Allowances section heading
    await expect(page.getByText(/leave allowances/i)).toBeVisible();
    // Alice has 2025 and 2026 entries in the seed data
    await expect(page.getByText(/2025|2026/).first()).toBeVisible();
  });

  test("profile page does not show empty allowances message", async ({ page }) => {
    await loginAs(page, ALICE.email, ALICE.password);
    await page.goto("/profile");

    await expect(page.getByText(/no allowances configured yet/i)).not.toBeVisible();
  });

  test("profile page shows pinned users section", async ({ page }) => {
    await loginAs(page, ALICE.email, ALICE.password);
    await page.goto("/profile");

    // Pinned Users section heading is always rendered
    await expect(page.getByText(/pinned users/i)).toBeVisible();
  });

  test("profile shows pinned user Bob (pinned by Alice in seed data)", async ({ page }) => {
    await loginAs(page, ALICE.email, ALICE.password);
    await page.goto("/profile");

    // Alice has Bob pinned in data.example.json
    await expect(page.getByText(/bob/i)).toBeVisible();
    await expect(page.getByText(/no users pinned yet/i)).not.toBeVisible();
  });

  test("saving profile shows a success message", async ({ page }) => {
    await loginAs(page, ALICE.email, ALICE.password);
    await page.goto("/profile");

    // Update first name and save
    const firstNameField = page.getByLabel("First Name");
    await firstNameField.clear();
    await firstNameField.fill("Alicia");

    await page.getByRole("button", { name: "Save Profile" }).click();
    await expect(page.getByText(/saved successfully/i)).toBeVisible();
  });
});
