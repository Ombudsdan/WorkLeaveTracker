import type { LeaveEntry } from "@/types";

/**
 * Count working days between two ISO date strings (inclusive).
 *
 * @param startDate - ISO date string (YYYY-MM-DD) for the start of the period
 * @param endDate - ISO date string (YYYY-MM-DD) for the end of the period (inclusive)
 * @param nonWorkingDays - Day-of-week numbers where 0 = Sunday … 6 = Saturday
 * @param bankHolidays - ISO date strings for bank holidays that fall on working days
 * @returns Number of working days in the period
 */
export function countWorkingDays(
  startDate: string,
  endDate: string,
  nonWorkingDays: number[],
  bankHolidays: string[]
): number {
  const start = new Date(startDate);
  const end = new Date(endDate);
  let count = 0;
  const cur = new Date(start);
  while (cur <= end) {
    const dow = cur.getDay();
    const iso = cur.toISOString().slice(0, 10);
    if (!nonWorkingDays.includes(dow) && !bankHolidays.includes(iso)) count++;
    cur.setDate(cur.getDate() + 1);
  }
  return count;
}

/**
 * Return the start and end dates of the holiday year based on the start month.
 * The year boundaries shift dynamically so the current date is always within the returned range.
 */
export function getHolidayYearBounds(holidayStartMonth: number): { start: Date; end: Date } {
  const now = new Date();
  const year =
    now.getMonth() + 1 >= holidayStartMonth ? now.getFullYear() : now.getFullYear() - 1;
  const start = new Date(year, holidayStartMonth - 1, 1);
  const end = new Date(start);
  end.setFullYear(end.getFullYear() + 1);
  end.setDate(end.getDate() - 1);
  return { start, end };
}

/** Number of days in a given month (0-indexed) */
export function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

/** Day-of-week (0=Sun) for the first day of a given month (0-indexed) */
export function getFirstDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 1).getDay();
}

/** Find a leave entry that covers the given ISO date string */
export function getEntryForDate(
  date: string,
  entries: LeaveEntry[]
): LeaveEntry | undefined {
  return entries.find((e) => {
    const s = new Date(e.startDate);
    const en = new Date(e.endDate);
    const d = new Date(date);
    return d >= s && d <= en;
  });
}

/** Returns true if the date falls on one of the user's non-working days */
export function isNonWorkingDay(date: string, nonWorkingDays: number[]): boolean {
  return nonWorkingDays.includes(new Date(date).getDay());
}

/** Format a Date to YYYY-MM-DD */
export function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}
