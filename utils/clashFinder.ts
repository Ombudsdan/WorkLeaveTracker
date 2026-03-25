import { LeaveStatus, LeaveType } from "@/types";
import type { LeaveEntry } from "@/types";

/** A single user's entry contributing to a clash on a given date */
export interface ClashUser {
  id: string;
  name: string;
  entry: LeaveEntry;
}

/** A date on which two or more users have overlapping Approved/Requested leave */
export interface ClashDate {
  /** ISO date string YYYY-MM-DD */
  date: string;
  /** All users with Approved or Requested holiday leave on this date (≥ 2) */
  users: ClashUser[];
}

/** A contiguous date range during which the same set of users are all off */
export interface ClashRange {
  /** ISO date string YYYY-MM-DD — first day of the overlapping period */
  startDate: string;
  /** ISO date string YYYY-MM-DD — last day of the overlapping period */
  endDate: string;
  /** Display names of every user in the clash */
  userNames: string[];
}

/**
 * Find every date in [startDate, endDate] (inclusive) where two or more users
 * have an Approved or Requested holiday leave entry.
 *
 * Sick leave and Planned entries are intentionally excluded — only Approved
 * and Requested statuses represent committed or near-committed absences.
 *
 * @param users      - List of users with their leave entries
 * @param startDate  - ISO YYYY-MM-DD start of the window to scan
 * @param endDate    - ISO YYYY-MM-DD end of the window to scan (inclusive)
 * @returns          - Dates with ≥ 2 users off, sorted ascending
 */
export function findClashes(
  users: Array<{ id: string; name: string; entries: LeaveEntry[] }>,
  startDate: string,
  endDate: string
): ClashDate[] {
  const result: ClashDate[] = [];

  const cur = new Date(startDate);
  const end = new Date(endDate);

  while (cur <= end) {
    const dateStr = cur.toISOString().slice(0, 10);
    const onDate: ClashUser[] = [];

    for (const user of users) {
      const match = user.entries.find(
        (entry) =>
          entry.type === LeaveType.Holiday &&
          (entry.status === LeaveStatus.Approved ||
            entry.status === LeaveStatus.Requested) &&
          dateStr >= entry.startDate &&
          dateStr <= entry.endDate
      );
      if (match) onDate.push({ id: user.id, name: user.name, entry: match });
    }

    if (onDate.length >= 2) {
      result.push({ date: dateStr, users: onDate });
    }

    cur.setDate(cur.getDate() + 1);
  }

  return result;
}

/**
 * Merge a sorted list of ClashDate objects into contiguous ClashRange blocks.
 *
 * Two adjacent clash dates are merged into the same range when:
 *  - they are on consecutive calendar days, AND
 *  - the exact same set of user IDs is clashing on both days.
 *
 * Weekend/non-working days are NOT excluded — if the raw clash dates are
 * consecutive (e.g. Fri → Sat → Mon due to a multi-day entry spanning the
 * weekend) they remain in the same range.
 *
 * @param clashes - Sorted array of ClashDate objects (ascending by date)
 * @returns        - Array of ClashRange objects
 */
export function groupClashesIntoRanges(clashes: ClashDate[]): ClashRange[] {
  if (clashes.length === 0) return [];

  const sorted = [...clashes].sort((a, b) => a.date.localeCompare(b.date));

  const ranges: ClashRange[] = [];
  let rangeStart = sorted[0].date;
  let rangeEnd = sorted[0].date;
  let userNames = sorted[0].users.map((u) => u.name);
  let userKey = sorted[0].users
    .map((u) => u.id)
    .sort()
    .join(",");

  for (let i = 1; i < sorted.length; i++) {
    const clash = sorted[i];
    const clashKey = clash.users
      .map((u) => u.id)
      .sort()
      .join(",");

    const prevDate = new Date(rangeEnd);
    const curDate = new Date(clash.date);
    const dayDiff = Math.round(
      (curDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (dayDiff === 1 && clashKey === userKey) {
      // Extend the current range
      rangeEnd = clash.date;
    } else {
      // Commit the current range and start a new one
      ranges.push({ startDate: rangeStart, endDate: rangeEnd, userNames });
      rangeStart = clash.date;
      rangeEnd = clash.date;
      userNames = clash.users.map((u) => u.name);
      userKey = clashKey;
    }
  }

  ranges.push({ startDate: rangeStart, endDate: rangeEnd, userNames });
  return ranges;
}
