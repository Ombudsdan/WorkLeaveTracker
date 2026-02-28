import { test, expect } from "@playwright/test";
import { resetDb, ALICE } from "./helpers/db";

test.beforeEach(() => {
  resetDb();
});

test.describe("Authentication", () => {
  test("unauthenticated users are redirected to /login", async ({ page }) => {
    await page.goto("/dashboard");
    // NextAuth redirects with a callbackUrl query param — match on the path
    await page.waitForURL(/\/login/);
    await expect(page.getByRole("heading", { name: "Work Leave Tracker" })).toBeVisible();
  });

  test("login page renders sign-in form", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByPlaceholder("you@example.com")).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.getByRole("button", { name: "Sign In" })).toBeVisible();
  });

  test("valid credentials redirect to the dashboard", async ({ page }) => {
    await page.goto("/login");
    await page.getByPlaceholder("you@example.com").fill(ALICE.email);
    await page.locator('input[type="password"]').fill(ALICE.password);
    await page.getByRole("button", { name: "Sign In" }).click();
    await page.waitForURL(/\/dashboard/);
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test("invalid credentials show an error message", async ({ page }) => {
    await page.goto("/login");
    await page.getByPlaceholder("you@example.com").fill(ALICE.email);
    await page.locator('input[type="password"]').fill("wrong-password");
    await page.getByRole("button", { name: "Sign In" }).click();
    await expect(page.getByText("Invalid email or password")).toBeVisible();
    await expect(page).toHaveURL(/\/login/);
  });

  test("sign out redirects to /login", async ({ page }) => {
    await page.goto("/login");
    await page.getByPlaceholder("you@example.com").fill(ALICE.email);
    await page.locator('input[type="password"]').fill(ALICE.password);
    await page.getByRole("button", { name: "Sign In" }).click();
    await page.waitForURL(/\/dashboard/);

    await page.getByRole("button", { name: "Sign Out" }).click();
    await page.waitForURL(/\/login/);
    await expect(page).toHaveURL(/\/login/);
  });
});
