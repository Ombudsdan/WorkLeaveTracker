import { LeaveStatus, LeaveType, LeaveDuration, BankHolidayHandling } from "@/types";
import type { LeaveEntry, PublicUser, YearAllowance } from "@/types";
import { countWorkingDays, getActiveYearAllowance, getEntryDuration } from "@/utils/dateHelpers";

export interface LeaveSummary {
  /** Raw entitlement: core + bought + carried (never reduced by bank holidays) */
  total: number;
  approved: number;
  requested: number;
  planned: number;
  used: number;
  /**
   * Days remaining after bank holidays and all leave statuses are accounted for.
   * = total - bankHolidaysOnWorkingDays - approved - requested - planned
   */
  remaining: number;
  /** Number of bank holidays that fall on a working day within this holiday year */
  bankHolidaysOnWorkingDays: number;
}

/**
 * Calculate the leave summary for a user within their current holiday year.
 * Only holiday-type entries are counted; bank holidays on working days are excluded
 * from individual entry day counts.  Half-day entries count as 0.5 working days.
 *
 * `total` is always the raw entitlement (core + bought + carried).
 * `remaining` deducts bank holidays on working days **only** when the allowance has
 * `bankHolidayHandling === BankHolidayHandling.Deduct` — meaning the user's employer
 * uses annual leave for bank holidays.  When handling is `None` (or unset) the bank
 * holidays are informational only and do not reduce `remaining`.
 *
 * The holiday year bounds are derived from the **active allowance's own year** (not from
 * today's date) so that `total` and the entry date range are always consistent — even
 * when the function falls back to a past or future allowance.
 *
 * Pass `forYearAllowance` to override automatic selection and calculate the summary
 * for a specific year window (e.g. when the user selects a past or future window).
 */
export function calcLeaveSummary(
  user: PublicUser,
  bankHolidays: string[],
  forYearAllowance?: YearAllowance
): LeaveSummary {
  const activeYa = forYearAllowance ?? getActiveYearAllowance(user.yearAllowances);
  if (!activeYa) {
    return {
      total: 0,
      approved: 0,
      requested: 0,
      planned: 0,
      used: 0,
      remaining: 0,
      bankHolidaysOnWorkingDays: 0,
    };
  }

  const sm = activeYa.holidayStartMonth ?? 1;
  // ISO date strings for year boundaries — avoids local-vs-UTC midnight mismatches
  // that can occur in BST (UTC+1) when comparing new Date("YYYY-MM-DD") (UTC) against
  // new Date(year, month, day) (local).
  const smPadded = String(sm).padStart(2, "0");
  const yearStartStr = `${activeYa.year}-${smPadded}-01`;
  const yearEndStr = `${activeYa.year + 1}-${smPadded}-01`; // exclusive upper bound

  // Bank holidays that fall within this holiday year on working days.
  // Use string comparison for range checks to stay timezone-agnostic.
  const relevantBankHolidays = bankHolidays.filter((d) => {
    return (
      d >= yearStartStr &&
      d < yearEndStr &&
      !user.profile.nonWorkingDays.includes(new Date(d).getDay())
    );
  });

  const bankHolidaysOnWorkingDays = relevantBankHolidays.length;

  // total is always the raw entitlement
  const total = activeYa.core + activeYa.bought + activeYa.carried;

  let approved = 0;
  let requested = 0;
  let planned = 0;

  for (const entry of user.entries) {
    if (entry.type !== LeaveType.Holiday) continue;
    // String comparison: ISO date strings sort lexicographically == chronologically
    if (entry.endDate < yearStartStr || entry.startDate >= yearEndStr) continue;

    const days =
      getEntryDuration(entry) !== LeaveDuration.Full
        ? 0.5
        : countWorkingDays(
            entry.startDate,
            entry.endDate,
            user.profile.nonWorkingDays,
            relevantBankHolidays
          );

    if (entry.status === LeaveStatus.Approved) approved += days;
    else if (entry.status === LeaveStatus.Requested) requested += days;
    else if (entry.status === LeaveStatus.Planned) planned += days;
  }

  return {
    total,
    approved,
    requested,
    planned,
    used: approved + requested + planned,
    // Only deduct bank holidays from remaining when the allowance is configured to
    // use annual leave for bank holidays on working days.
    remaining:
      total -
      (activeYa.bankHolidayHandling === BankHolidayHandling.Deduct
        ? bankHolidaysOnWorkingDays
        : 0) -
      approved -
      requested -
      planned,
    bankHolidaysOnWorkingDays,
  };
}

/**
 * Per-month leave and bank holiday counts for a single calendar month within a
 * holiday year.  Used by the Annual Planner to render the MonthlyLeaveBar chart
 * and the accordion list view.
 */
export interface MonthlyLeaveData {
  /** Calendar year of the month (e.g. 2026) */
  year: number;
  /** 0-indexed month number (0 = January … 11 = December) */
  month: number;
  /** Working days of approved holiday in this month */
  approved: number;
  /** Working days of requested holiday in this month */
  requested: number;
  /** Working days of planned holiday in this month */
  planned: number;
  /** Bank holidays that fall on a working day in this month */
  bankHolidays: number;
  /** Bank holidays that fall on a non-working day in this month */
  bankHolidaysNonWorking: number;
  /** approved + requested + planned + bankHolidays + bankHolidaysNonWorking */
  totalCombined: number;
  /** Holiday-type entries whose date range overlaps this month */
  entries: LeaveEntry[];
}

/**
 * Break down a holiday year into per-month leave and bank holiday counts.
 *
 * For entries that span multiple calendar months the days are distributed to
 * each month proportionally — only the working days that actually fall within
 * the given month are counted (bank holidays are still excluded from individual
 * entry counts, consistent with `calcLeaveSummary`).
 *
 * Half-day entries always contribute 0.5 to their month regardless of clipping
 * because a half-day entry must be a single day.
 *
 * Pass `forYearAllowance` to override automatic active-allowance selection.
 */
export function calcMonthlyLeaveBreakdown(
  user: PublicUser,
  bankHolidays: string[],
  forYearAllowance?: YearAllowance
): MonthlyLeaveData[] {
  const activeYa = forYearAllowance ?? getActiveYearAllowance(user.yearAllowances);
  if (!activeYa) return [];

  const sm = activeYa.holidayStartMonth ?? 1;
  // Timezone-agnostic ISO string boundaries — same approach as calcLeaveSummary
  const smPadded = String(sm).padStart(2, "0");
  const yearStartStr = `${activeYa.year}-${smPadded}-01`;
  const yearEndStr = `${activeYa.year + 1}-${smPadded}-01`; // exclusive

  // Reuse the same bank-holiday filter as calcLeaveSummary for consistency.
  // String comparison avoids local-vs-UTC midnight issues (e.g. BST).
  // Working-day bank holidays are used to exclude days from leave counts.
  const relevantBankHolidays = bankHolidays.filter((d) => {
    return (
      d >= yearStartStr &&
      d < yearEndStr &&
      !user.profile.nonWorkingDays.includes(new Date(d).getDay())
    );
  });

  // All bank holidays in the year (working day + non-working day) — for visual display.
  const allYearBankHolidays = bankHolidays.filter((d) => d >= yearStartStr && d < yearEndStr);

  const result: MonthlyLeaveData[] = [];

  // Derive the first month of the holiday year from the year/sm values directly
  // so we never depend on a locally-constructed Date object for iteration.
  for (let i = 0; i < 12; i++) {
    // JavaScript handles month overflow (e.g. month 13 → next year) automatically.
    const monthDate = new Date(activeYa.year, sm - 1 + i, 1);
    const year = monthDate.getFullYear(); // local year — correct for month labels
    const month = monthDate.getMonth(); // local month — correct for month labels

    // Build ISO strings for this month's boundaries without converting back through
    // toIsoDate (which calls toISOString → UTC, losing an hour in BST).
    const monthPadded = String(month + 1).padStart(2, "0");
    const lastDayOfMonth = new Date(year, month + 1, 0).getDate(); // local getDate() ✓
    const monthStartStr = `${year}-${monthPadded}-01`;
    const monthEndStr = `${year}-${monthPadded}-${String(lastDayOfMonth).padStart(2, "0")}`;

    // Working-day bank holidays in this month (for leave-count exclusion).
    // String comparison: ISO dates sort lexicographically == chronologically.
    const monthBankHolidays = relevantBankHolidays.filter(
      (d) => d >= monthStartStr && d <= monthEndStr
    );

    // Non-working-day bank holidays in this month (shown with diagonal stripes).
    const monthBankHolidaysNonWorking = allYearBankHolidays.filter(
      (d) =>
        d >= monthStartStr &&
        d <= monthEndStr &&
        user.profile.nonWorkingDays.includes(new Date(d).getDay())
    );

    let approved = 0;
    let requested = 0;
    let planned = 0;
    const monthEntries: LeaveEntry[] = [];

    for (const entry of user.entries) {
      // Skip entries that don't overlap this month (string comparison)
      if (entry.endDate < monthStartStr || entry.startDate > monthEndStr) continue;

      // All entry types are included in the list; only holiday days count in the bar
      monthEntries.push(entry);

      if (entry.type !== LeaveType.Holiday) continue;

      let days: number;
      if (getEntryDuration(entry) !== LeaveDuration.Full) {
        // Half-day entries are always a single calendar day → always 0.5
        days = 0.5;
      } else {
        // Clip the entry date range to this month's bounds before counting
        const clippedStart = entry.startDate < monthStartStr ? monthStartStr : entry.startDate;
        const clippedEnd = entry.endDate > monthEndStr ? monthEndStr : entry.endDate;
        days = countWorkingDays(
          clippedStart,
          clippedEnd,
          user.profile.nonWorkingDays,
          relevantBankHolidays
        );
      }

      if (entry.status === LeaveStatus.Approved) approved += days;
      else if (entry.status === LeaveStatus.Requested) requested += days;
      else planned += days;
    }

    result.push({
      year,
      month,
      approved,
      requested,
      planned,
      bankHolidays: monthBankHolidays.length,
      bankHolidaysNonWorking: monthBankHolidaysNonWorking.length,
      totalCombined:
        approved +
        requested +
        planned +
        monthBankHolidays.length +
        monthBankHolidaysNonWorking.length,
      entries: monthEntries,
    });
  }

  return result;
}
