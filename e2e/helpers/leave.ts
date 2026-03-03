import { type Page } from "@playwright/test";

/**
 * Returns two pairs of ISO date strings in a future month relative to today.
 * Using the next full calendar month avoids edge-cases where today is near the
 * end of the current month (e.g. day 28 would require checking days-in-month).
 */
export function getTestDates(): {
  startA: string;
  endA: string;
  startB: string;
  endB: string;
  startC: string;
  endC: string;
} {
  const now = new Date();
  // Use the month after next to ensure we're safely past today
  const future = new Date(now.getFullYear(), now.getMonth() + 2, 1);
  const y = future.getFullYear();
  const m = String(future.getMonth() + 1).padStart(2, "0");

  return {
    startA: `${y}-${m}-03`,
    endA: `${y}-${m}-04`,
    startB: `${y}-${m}-07`,
    endB: `${y}-${m}-07`,
    startC: `${y}-${m}-10`,
    endC: `${y}-${m}-10`,
  };
}

/**
 * Adds a leave entry via the AddLeaveModal UI.
 *
 * The AddLeaveModal uses a DateRangePicker calendar (day cells are <button>
 * elements with aria-label={isoDateStr}) rather than <input type="date">,
 * so we click calendar day buttons directly.
 *
 * @param page      The Playwright page.
 * @param startDate ISO date string, e.g. "2026-05-03".
 * @param endDate   ISO date string, must be >= startDate.
 */
export async function addLeave(page: Page, startDate: string, endDate: string): Promise<void> {
  // Open the modal
  await page.getByRole("button", { name: "Add Leave" }).click();

  // Scope all further interactions to the modal overlay (fixed positioned div)
  // The modal renders at the end of the DOM, so .last() is safe even if
  // multiple fixed elements exist.
  const modal = page.locator("div.fixed").last();
  await modal.waitFor({ state: "visible" });

  // Navigate the DateRangePicker calendar to the target month if needed.
  // The picker initialises at the current month.
  const [startYear, startMonthNum] = startDate.split("-").map(Number);
  const today = new Date();
  let monthsToNavigate =
    (startYear - today.getFullYear()) * 12 + (startMonthNum - (today.getMonth() + 1));

  while (monthsToNavigate > 0) {
    await modal.getByRole("button", { name: "Next month" }).click();
    monthsToNavigate--;
  }
  while (monthsToNavigate < 0) {
    await modal.getByRole("button", { name: "Previous month" }).click();
    monthsToNavigate++;
  }

  // Click start date, then end date
  await modal.getByRole("button", { name: startDate }).click();
  await modal.getByRole("button", { name: endDate }).click();

  // Fill the required Reason field
  await modal.getByLabel("Reason").fill("Test leave");

  // Select Planned status (type is auto-set to Holiday when sick leave is disabled)
  await modal.getByRole("button", { name: "Planned" }).click();

  // Save — use dispatchEvent to fire the DOM click directly, bypassing
  // Playwright's viewport check.  The AddLeaveModal uses `position: fixed`
  // with `overflow: hidden`, so the Save button at the bottom can extend
  // past the visible viewport and cannot be scrolled into view.
  const saveBtn = modal.getByRole("button", { name: "Save" });
  await saveBtn.dispatchEvent("click");

  // Wait for modal to disappear
  await modal.waitFor({ state: "hidden" });
}
