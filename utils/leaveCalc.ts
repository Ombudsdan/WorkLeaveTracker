import { LeaveStatus, LeaveType } from "@/types";
import type { PublicUser } from "@/types";
import { countWorkingDays, getHolidayYearBounds } from "@/utils/dateHelpers";

export interface LeaveSummary {
  total: number;
  approved: number;
  requested: number;
  planned: number;
  used: number;
  remaining: number;
}

/**
 * Calculate the leave summary for a user within their current holiday year.
 * Only holiday-type entries are counted; bank holidays on working days are excluded.
 */
export function calcLeaveSummary(user: PublicUser, bankHolidays: string[]): LeaveSummary {
  const total = user.allowance.core + user.allowance.bought + user.allowance.carried;
  const { start, end } = getHolidayYearBounds(user.profile.holidayStartMonth);

  // Bank holidays that fall within this holiday year on working days
  const relevantBankHolidays = bankHolidays.filter((d) => {
    const date = new Date(d);
    return date >= start && date <= end && !user.profile.nonWorkingDays.includes(date.getDay());
  });

  let approved = 0;
  let requested = 0;
  let planned = 0;

  for (const entry of user.entries) {
    if (entry.type !== LeaveType.Holiday) continue;
    const es = new Date(entry.startDate);
    const ee = new Date(entry.endDate);
    if (ee < start || es > end) continue;

    const days = countWorkingDays(
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
  };
}
