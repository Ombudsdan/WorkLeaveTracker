import { LeaveStatus, LeaveType, LeaveDuration, BankHolidayHandling } from "@/types";
import type { PublicUser } from "@/types";
import { countWorkingDays, getActiveYearAllowance, getEntryDuration } from "@/utils/dateHelpers";

export interface LeaveSummary {
  total: number;
  approved: number;
  requested: number;
  planned: number;
  used: number;
  remaining: number;
  /** Number of bank holidays that fall on a working day within this holiday year */
  bankHolidaysOnWorkingDays: number;
}

/**
 * Calculate the leave summary for a user within their current holiday year.
 * Only holiday-type entries are counted; bank holidays on working days are excluded.
 * Half-day entries count as 0.5 working days.
 *
 * When the active allowance has bankHolidayHandling set to Deduct, the total
 * allowance is reduced by the number of bank holidays that fall on working days.
 *
 * The holiday year bounds are derived from the **active allowance's own year** (not from
 * today's date) so that `total` and the entry date range are always consistent — even
 * when the function falls back to a past or future allowance.
 */
export function calcLeaveSummary(user: PublicUser, bankHolidays: string[]): LeaveSummary {
  const activeYa = getActiveYearAllowance(user.yearAllowances);
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

  const baseTotal = activeYa.core + activeYa.bought + activeYa.carried;
  const total =
    activeYa.bankHolidayHandling === BankHolidayHandling.Deduct
      ? baseTotal - bankHolidaysOnWorkingDays
      : baseTotal;

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
    remaining: total - approved - requested - planned,
    bankHolidaysOnWorkingDays,
  };
}
