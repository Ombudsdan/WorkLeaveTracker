import { type Page } from "@playwright/test";

/**
 * Logs in via the UI login form.
 * Waits until the dashboard has fully loaded before returning.
 *
 * Note: the login form uses plain <label> elements without htmlFor, so we
 * use placeholder-based selectors which match the actual rendered inputs.
 */
export async function loginAs(page: Page, email: string, password: string): Promise<void> {
  await page.goto("/login");
  await page.getByPlaceholder("you@example.com").fill(email);
  await page.locator('input[type="password"]').fill(password);
  await page.getByRole("button", { name: "Sign In" }).click();
  // Wait for full page navigation to the dashboard
  await page.waitForURL(/\/dashboard/);
  // Wait for the Sign Out button in the navbar — it only appears once the
  // NextAuth session is resolved, confirming the dashboard has fully loaded.
  await page.getByRole("button", { name: "Sign Out" }).waitFor({ state: "visible" });
}
