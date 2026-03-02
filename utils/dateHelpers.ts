import type { LeaveEntry, YearAllowance } from "@/types";
import { LeaveDuration } from "@/types";

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
 * Find the year allowance that is most relevant to today.
 *
 * Uses a two-tier date-based approach on non-deactivated allowances:
 *  1. **Primary** — the allowance whose holiday year window contains today.
 *  2. **Lookahead** — if a newer year's allowance has been pre-configured and
 *     its holiday year starts within the next 60 days, prefer it over the
 *     current year. This handles the common case where an admin sets up the
 *     upcoming year in advance (e.g. configuring April 2026 in early March).
 *
 * Among all candidates the one with the highest year wins.
 * Falls back to the most recently started allowance, then the earliest future one.
 */
export function getActiveYearAllowance(allowances: YearAllowance[]): YearAllowance | undefined {
  const today = new Date();
  // Prefer allowances that haven't been deactivated (company-change replacements)
  const notDeactivated = allowances.filter((ya) => ya.active !== false);
  const search = notDeactivated.length > 0 ? notDeactivated : allowances;

  const lookahead = new Date(today);
  lookahead.setDate(lookahead.getDate() + 60);

  const candidates = search.filter((ya) => {
    const sm = ya.holidayStartMonth ?? 1;
    const start = new Date(ya.year, sm - 1, 1);
    const end = new Date(ya.year + 1, sm - 1, 1); // exclusive upper bound
    const containsToday = today >= start && today < end;
    const startsVerySoon = start > today && start <= lookahead;
    return containsToday || startsVerySoon;
  });

  // Among all candidates prefer the latest year
  if (candidates.length > 0) return candidates.sort((a, b) => b.year - a.year)[0];

  // Fallback: the most recently started allowance from the search set
  const past = search.filter(
    (ya) => today >= new Date(ya.year, (ya.holidayStartMonth ?? 1) - 1, 1)
  );
  if (past.length > 0) return past.sort((a, b) => b.year - a.year)[0];
  return [...search].sort((a, b) => a.year - b.year)[0];
}

export function getHolidayYearBounds(holidayStartMonth: number): { start: Date; end: Date } {
  const now = new Date();
  const year = now.getMonth() + 1 >= holidayStartMonth ? now.getFullYear() : now.getFullYear() - 1;
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
export function getEntryForDate(date: string, entries: LeaveEntry[]): LeaveEntry | undefined {
  return entries.find((e) => {
    const s = new Date(e.startDate);
    const en = new Date(e.endDate);
    const d = new Date(date);
    return d >= s && d <= en;
  });
}

/**
 * Find all leave entries (up to 2) that cover the given ISO date string.
 * Returns at most 2 entries — more than 2 overlapping entries are not supported.
 */
export function getEntriesForDate(date: string, entries: LeaveEntry[]): LeaveEntry[] {
  const matches = entries.filter((e) => {
    const s = new Date(e.startDate);
    const en = new Date(e.endDate);
    const d = new Date(date);
    return d >= s && d <= en;
  });
  return matches.slice(0, 2);
}

/** Returns true if the date falls on one of the user's non-working days */
export function isNonWorkingDay(date: string, nonWorkingDays: number[]): boolean {
  return nonWorkingDays.includes(new Date(date).getDay());
}

/** Format a Date to YYYY-MM-DD */
export function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/**
 * Normalise the duration of a leave entry to a `LeaveDuration` value.
 *
 * Handles three data generations:
 *  1. New entries: use the `duration` field directly.
 *  2. Old entries with `halfDay`/`halfDayPeriod` fields.
 *  3. Legacy entries with no half-day information → `Full`.
 */
export function getEntryDuration(entry: LeaveEntry): LeaveDuration {
  if (entry.duration) return entry.duration;
  if (entry.halfDay) {
    return entry.halfDayPeriod === "am" ? LeaveDuration.HalfMorning : LeaveDuration.HalfAfternoon;
  }
  return LeaveDuration.Full;
}

/**
 * Count the number of days an entry consumes, respecting half-days.
 * Half-day entries always count as 0.5 regardless of the date range.
 * Full-day entries use countWorkingDays.
 */
export function countEntryDays(
  entry: LeaveEntry,
  nonWorkingDays: number[],
  bankHolidays: string[]
): number {
  const duration = getEntryDuration(entry);
  if (duration !== LeaveDuration.Full) return 0.5;
  return countWorkingDays(entry.startDate, entry.endDate, nonWorkingDays, bankHolidays);
}
