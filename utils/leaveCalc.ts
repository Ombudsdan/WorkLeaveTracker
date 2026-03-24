import { LeaveStatus, LeaveType, LeaveDuration, BankHolidayHandling } from "@/types";
import type { LeaveEntry, PublicUser, YearAllowance } from "@/types";
import {
  countWorkingDays,
  getActiveYearAllowance,
  getEntryDuration,
  toIsoDate,
} from "@/utils/dateHelpers";

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
  const start = new Date(activeYa.year, sm - 1, 1);
  const endExclusive = new Date(activeYa.year + 1, sm - 1, 1);

  // Bank holidays that fall within this holiday year on working days
  const relevantBankHolidays = bankHolidays.filter((d) => {
    const date = new Date(d);
    return (
      date >= start && date < endExclusive && !user.profile.nonWorkingDays.includes(date.getDay())
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
    const es = new Date(entry.startDate);
    const ee = new Date(entry.endDate);
    if (ee < start || es >= endExclusive) continue;

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
  /** approved + requested + planned + bankHolidays */
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
  const yearStart = new Date(activeYa.year, sm - 1, 1);
  const yearEndExclusive = new Date(activeYa.year + 1, sm - 1, 1);

  // Reuse the same bank-holiday filter as calcLeaveSummary for consistency
  const relevantBankHolidays = bankHolidays.filter((d) => {
    const date = new Date(d);
    return (
      date >= yearStart &&
      date < yearEndExclusive &&
      !user.profile.nonWorkingDays.includes(date.getDay())
    );
  });

  const result: MonthlyLeaveData[] = [];

  for (let i = 0; i < 12; i++) {
    const monthDate = new Date(yearStart.getFullYear(), yearStart.getMonth() + i, 1);
    const year = monthDate.getFullYear();
    const month = monthDate.getMonth();

    const monthStart = new Date(year, month, 1);
    const monthEndDate = new Date(year, month + 1, 0); // last day of month
    const monthStartStr = toIsoDate(monthStart);
    const monthEndStr = toIsoDate(monthEndDate);

    // Bank holidays in this month from the year-level relevant set
    const monthBankHolidays = relevantBankHolidays.filter((d) => {
      const date = new Date(d);
      return date >= monthStart && date <= monthEndDate;
    });

    let approved = 0;
    let requested = 0;
    let planned = 0;
    const monthEntries: LeaveEntry[] = [];

    for (const entry of user.entries) {
      const entryStart = new Date(entry.startDate);
      const entryEnd = new Date(entry.endDate);

      // Skip entries that don't overlap this month
      if (entryEnd < monthStart || entryStart > monthEndDate) continue;

      // All entry types are included in the list; only holiday days count in the bar
      monthEntries.push(entry);

      if (entry.type !== LeaveType.Holiday) continue;

      let days: number;
      if (getEntryDuration(entry) !== LeaveDuration.Full) {
        // Half-day entries are always a single calendar day → always 0.5
        days = 0.5;
      } else {
        // Clip the entry date range to this month's bounds before counting
        const clippedStart = entryStart < monthStart ? monthStartStr : entry.startDate;
        const clippedEnd = entryEnd > monthEndDate ? monthEndStr : entry.endDate;
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
      totalCombined: approved + requested + planned + monthBankHolidays.length,
      entries: monthEntries,
    });
  }

  return result;
}
