"use client";
import { useMemo } from "react";
import type { PublicUser, BankHolidayEntry } from "@/types";
import { findClashes, groupClashesIntoRanges } from "@/utils/clashFinder";
import type { ClashRange } from "@/utils/clashFinder";
import { AlertTriangle } from "lucide-react";

interface ClashSummaryProps {
  /** The signed-in user */
  currentUser: PublicUser;
  /** The users the current user has pinned */
  pinnedUsers: PublicUser[];
  bankHolidays: BankHolidayEntry[];
  /**
   * How many days ahead to scan for clashes.
   * Defaults to 90.
   */
  lookAheadDays?: number;
}

/** Format a date string as "10 Mar 2026" */
function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/** Format a ClashRange as a human-readable date label */
function formatRange(range: ClashRange): string {
  if (range.startDate === range.endDate) {
    return formatDate(range.startDate);
  }
  const startOpts: Intl.DateTimeFormatOptions = {
    day: "numeric",
    month: "short",
  };
  const start = new Date(range.startDate).toLocaleDateString("en-GB", startOpts);
  const end = formatDate(range.endDate);
  return `${start} – ${end}`;
}

/** Join an array of names as "A, B and C" */
function joinNames(names: string[]): string {
  /* c8 ignore next */
  if (names.length === 0) return "";
  /* c8 ignore next */
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

export default function ClashSummary({
  currentUser,
  pinnedUsers,
  bankHolidays: _bankHolidays,
  lookAheadDays = 90,
}: ClashSummaryProps) {
  const upcomingRanges = useMemo<ClashRange[]>(() => {
    const allUsers = [currentUser, ...pinnedUsers];
    const userEntryData = allUsers.map((u) => ({
      id: u.id,
      name: u.id === currentUser.id ? "You" : u.profile.firstName,
      entries: u.entries,
    }));

    const today = new Date();
    const startDate = today.toISOString().slice(0, 10);
    const endDate = new Date(today.getTime() + lookAheadDays * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);

    const clashes = findClashes(userEntryData, startDate, endDate);
    return groupClashesIntoRanges(clashes);
  }, [currentUser, pinnedUsers, lookAheadDays]);

  return (
    <div className="bg-white rounded-2xl shadow p-5 h-fit">
      <div className="flex items-center gap-2 mb-4">
        <AlertTriangle size={16} className="text-red-500 shrink-0" />
        <h3 className="font-bold text-gray-800">Clash Summary</h3>
      </div>

      {pinnedUsers.length === 0 ? (
        <p className="text-sm text-gray-500">
          Add connections to see upcoming leave clashes.
        </p>
      ) : upcomingRanges.length === 0 ? (
        <p className="text-sm text-gray-500">
          No upcoming leave clashes in the next {lookAheadDays} days.
        </p>
      ) : (
        <ul className="space-y-3">
          {upcomingRanges.map((range, idx) => (
            <li key={idx} className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm">
              <p className="font-semibold text-red-700 mb-0.5">{formatRange(range)}</p>
              <p className="text-red-600">{joinNames(range.userNames)} are both off</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
