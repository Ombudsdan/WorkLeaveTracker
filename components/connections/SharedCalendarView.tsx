"use client";
import { useState, useMemo } from "react";
import type { PublicUser, BankHolidayEntry } from "@/types";
import { LeaveStatus, LeaveType } from "@/types";
import { MONTH_NAMES_LONG } from "@/variables/calendar";
import { getDaysInMonth, getEntriesForDate, toIsoDate } from "@/utils/dateHelpers";
import { findClashes } from "@/utils/clashFinder";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface SharedCalendarViewProps {
  /** The signed-in user, always shown as the first row */
  currentUser: PublicUser;
  /** The users the current user has pinned (their connections) */
  pinnedUsers: PublicUser[];
  bankHolidays: BankHolidayEntry[];
}

/** Tiny colour map for leave status within this component */
const CELL_CLASS: Record<LeaveStatus, string> = {
  [LeaveStatus.Approved]: "bg-green-300",
  [LeaveStatus.Requested]: "bg-blue-300",
  [LeaveStatus.Planned]: "bg-yellow-200",
};

/** Return initials from a first + last name */
function initials(first: string, last: string): string {
  return `${first.charAt(0)}${last.charAt(0)}`.toUpperCase();
}

export default function SharedCalendarView({
  currentUser,
  pinnedUsers,
  bankHolidays,
}: SharedCalendarViewProps) {
  const today = new Date();
  const [calYear, setCalYear] = useState(today.getFullYear());
  const [calMonth, setCalMonth] = useState(today.getMonth());

  const todayStr = toIsoDate(today);
  const daysInMonth = getDaysInMonth(calYear, calMonth);
  const bhDates = useMemo(() => bankHolidays.map((bh) => bh.date), [bankHolidays]);

  function prevMonth() {
    if (calMonth === 0) {
      setCalMonth(11);
      setCalYear((y) => y - 1);
    } else {
      setCalMonth((m) => m - 1);
    }
  }

  function nextMonth() {
    if (calMonth === 11) {
      setCalMonth(0);
      setCalYear((y) => y + 1);
    } else {
      setCalMonth((m) => m + 1);
    }
  }

  /** Build sorted day strings for the current month */
  const dayStrings = useMemo<string[]>(() => {
    return Array.from({ length: daysInMonth }, (_, i) => {
      const d = i + 1;
      return `${calYear}-${String(calMonth + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    });
  }, [calYear, calMonth, daysInMonth]);

  /** All rows: current user first, then pinned users */
  const allUsers = useMemo<PublicUser[]>(
    () => [currentUser, ...pinnedUsers],
    [currentUser, pinnedUsers]
  );

  /** Set of dates in this month where 2+ users clash */
  const clashDates = useMemo<Set<string>>(() => {
    const userEntryData = allUsers.map((u) => ({
      id: u.id,
      name: `${u.profile.firstName} ${u.profile.lastName}`,
      entries: u.entries,
    }));
    const startDate = dayStrings[0];
    const endDate = dayStrings[dayStrings.length - 1];
    const clashes = findClashes(userEntryData, startDate, endDate);
    return new Set(clashes.map((c) => c.date));
  }, [allUsers, dayStrings]);

  /** Render a single cell for one user on one day */
  function renderUserCell(user: PublicUser, dateStr: string) {
    const isToday = dateStr === todayStr;
    const isBH = bhDates.includes(dateStr);

    // Don't show leave on non-working days (weekends / bank holidays have no leave to display)
    const entries = getEntriesForDate(dateStr, user.entries).filter(
      (e) => e.type !== LeaveType.Sick
    );

    const topEntry = entries[0] ?? null;
    const isClash = clashDates.has(dateStr);

    let bgClass = "bg-white";
    if (topEntry) {
      /* c8 ignore next */
      bgClass = CELL_CLASS[topEntry.status] ?? "bg-white";
    } else if (isBH) {
      bgClass = "bg-purple-100";
    }

    const clashRing = isClash ? "ring-2 ring-red-500 ring-inset z-10" : "";
    const todayBorder = isToday ? "outline outline-2 outline-indigo-500 outline-offset-[-2px]" : "";

    return (
      <td
        key={dateStr}
        className={`min-w-[28px] h-7 border border-gray-100 text-center text-[10px] relative ${bgClass} ${clashRing} ${todayBorder}`}
        title={topEntry ? `${topEntry.status}: ${topEntry.startDate} – ${topEntry.endDate}` : undefined}
      >
        {topEntry && (
          <span className="sr-only">{topEntry.status}</span>
        )}
      </td>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow p-5">
      {/* Month navigation */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={prevMonth}
          className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-600 cursor-pointer"
          aria-label="Previous month"
        >
          <ChevronLeft size={18} />
        </button>
        <h3 className="font-bold text-gray-800">
          {MONTH_NAMES_LONG[calMonth]} {calYear}
        </h3>
        <button
          onClick={nextMonth}
          className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-600 cursor-pointer"
          aria-label="Next month"
        >
          <ChevronRight size={18} />
        </button>
      </div>

      {/* Scrollable calendar table */}
      <div className="overflow-x-auto">
        <table className="border-collapse w-full" style={{ tableLayout: "fixed", minWidth: `${daysInMonth * 28 + 100}px` }}>
          <colgroup>
            {/* Name column */}
            <col style={{ width: "100px" }} />
            {/* One column per day */}
            {dayStrings.map((d) => (
              <col key={d} style={{ width: "28px" }} />
            ))}
          </colgroup>

          {/* Header: day numbers */}
          <thead>
            <tr>
              <th className="text-left text-xs font-medium text-gray-400 pb-1 pr-2">Person</th>
              {dayStrings.map((dateStr) => {
                const day = parseInt(dateStr.slice(8), 10);
                const isClash = clashDates.has(dateStr);
                const isToday = dateStr === todayStr;
                return (
                  <th
                    key={dateStr}
                    className={`text-center text-[10px] font-medium pb-1 h-6 ${
                      isClash ? "text-red-600 font-bold" : isToday ? "text-indigo-600 font-bold" : "text-gray-400"
                    }`}
                  >
                    {day}
                  </th>
                );
              })}
            </tr>
          </thead>

          {/* Body: one row per user */}
          <tbody>
            {allUsers.map((user, idx) => (
              <tr key={user.id}>
                {/* User label */}
                <td className="text-xs font-medium text-gray-700 pr-2 py-0.5 truncate" title={`${user.profile.firstName} ${user.profile.lastName}`}>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 text-[9px] font-bold shrink-0">
                      {initials(user.profile.firstName, user.profile.lastName)}
                    </span>
                    <span className="truncate">
                      {idx === 0 ? "You" : user.profile.firstName}
                    </span>
                  </span>
                </td>

                {/* Day cells */}
                {dayStrings.map((dateStr) => renderUserCell(user, dateStr))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 mt-4 text-xs text-gray-500">
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded bg-green-300" /> Approved
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded bg-blue-300" /> Requested
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded bg-yellow-200" /> Planned
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded bg-purple-100" /> Bank Holiday
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded ring-2 ring-red-500" /> Clash
        </span>
      </div>
    </div>
  );
}
