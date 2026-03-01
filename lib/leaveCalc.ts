import { LeaveStatus, LeaveType } from "@/types";
import type { AppUser } from "@/types";

/**
 * Count working days between two ISO date strings (inclusive).
 *
 * @param startDate - ISO date string (YYYY-MM-DD) for the start of the period
 * @param endDate - ISO date string (YYYY-MM-DD) for the end of the period (inclusive)
 * @param nonWorkingDays - Array of day-of-week numbers where 0 = Sunday … 6 = Saturday
 * @param bankHolidayDates - Array of ISO date strings for bank holidays that fall on working days
 * @returns Number of working days in the period
 */
export function countWorkingDays(
  startDate: string,
  endDate: string,
  nonWorkingDays: number[],
  bankHolidayDates: string[]
): number {
  const start = new Date(startDate);
  const end = new Date(endDate);
  let count = 0;
  const cur = new Date(start);
  while (cur <= end) {
    const dow = cur.getDay();
    const iso = cur.toISOString().slice(0, 10);
    if (!nonWorkingDays.includes(dow) && !bankHolidayDates.includes(iso)) {
      count++;
    }
    cur.setDate(cur.getDate() + 1);
  }
  return count;
}

export interface LeaveSummary {
  totalAllowance: number;
  approved: number;
  requested: number;
  planned: number;
  usedTotal: number;
  remaining: number;
}

/** Bank holidays that fall on the user's working days within the holiday year */
export function getBankHolidaysForUser(user: AppUser, bankHolidayDates: string[]): string[] {
  const { holidayStartMonth, nonWorkingDays } = user.profile;
  const yearStart = getHolidayYearStart(holidayStartMonth);
  const yearEnd = new Date(yearStart);
  yearEnd.setFullYear(yearEnd.getFullYear() + 1);
  yearEnd.setDate(yearEnd.getDate() - 1);

  return bankHolidayDates.filter((d) => {
    const date = new Date(d);
    if (date < yearStart || date > yearEnd) return false;
    const dow = date.getDay();
    return !nonWorkingDays.includes(dow);
  });
}

export function getHolidayYearStart(holidayStartMonth: number): Date {
  const now = new Date();
  const year = now.getMonth() + 1 >= holidayStartMonth ? now.getFullYear() : now.getFullYear() - 1;
  return new Date(year, holidayStartMonth - 1, 1);
}

export function getHolidayYearEnd(holidayStartMonth: number): Date {
  const start = getHolidayYearStart(holidayStartMonth);
  const end = new Date(start);
  end.setFullYear(end.getFullYear() + 1);
  end.setDate(end.getDate() - 1);
  return end;
}

export function calculateLeaveSummary(user: AppUser, bankHolidayDates: string[]): LeaveSummary {
  const yearStart = getHolidayYearStart(user.profile.holidayStartMonth);
  const currentYear = yearStart.getFullYear();
  const ya = user.yearAllowances.find((a) => a.year === currentYear);
  const totalAllowance = ya ? ya.core + ya.bought + ya.carried : 0;

  const bhForUser = getBankHolidaysForUser(user, bankHolidayDates);

  let approved = 0;
  let requested = 0;
  let planned = 0;

  for (const entry of user.entries) {
    if (entry.type !== LeaveType.Holiday) continue;
    const days = countWorkingDays(
      entry.startDate,
      entry.endDate,
      user.profile.nonWorkingDays,
      bhForUser
    );
    if (entry.status === LeaveStatus.Approved) approved += days;
    else if (entry.status === LeaveStatus.Requested) requested += days;
    else if (entry.status === LeaveStatus.Planned) planned += days;
  }

  const usedTotal = approved + requested + planned;
  const remaining = totalAllowance - usedTotal;

  return { totalAllowance, approved, requested, planned, usedTotal, remaining };
}
