import { LeaveStatus, LeaveType, LeaveDuration } from "@/types";
import type { PublicUser, YearAllowance } from "@/types";
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
 * `remaining` always deducts bank holidays on working days regardless of the
 * `bankHolidayHandling` setting — because bank holidays are effectively blocked
 * days whether or not they officially consume annual leave.  The
 * `bankHolidayHandling` setting on the allowance only controls how bank holidays
 * are labelled in the UI (deducted vs informational).
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
    // remaining always deducts bank holidays so the figure reflects days
    // the person can actually still take as annual leave
    remaining: total - bankHolidaysOnWorkingDays - approved - requested - planned,
    bankHolidaysOnWorkingDays,
  };
}
