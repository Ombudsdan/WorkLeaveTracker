"use client";
import { useMemo } from "react";
import Link from "next/link";
import type { PublicUser, BankHolidayEntry } from "@/types";
import { LeaveStatus, LeaveType } from "@/types";
import { STATUS_DOT } from "@/variables/colours";
import { getDaysInMonth, getFirstDayOfMonth } from "@/utils/dateHelpers";

export interface MiniCalendarProps {
  user: PublicUser;
  bankHolidays: BankHolidayEntry[];
}

/** Priority for multi-entry days: Approved beats Requested beats Planned */
const STATUS_PRIORITY: Record<LeaveStatus, number> = {
  [LeaveStatus.Approved]: 0,
  [LeaveStatus.Requested]: 1,
  [LeaveStatus.Planned]: 2,
};

const DAY_HEADERS = ["M", "T", "W", "T", "F", "S", "S"];

interface CalendarCell {
  day: number | null;
  dateStr: string | null;
  isNonWorking: boolean;
  isBankHoliday: boolean;
  leaveStatus: LeaveStatus | null;
  isToday: boolean;
}

export default function MiniCalendar({ user, bankHolidays }: MiniCalendarProps) {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth(); // 0-indexed

  const cells = useMemo<CalendarCell[]>(() => {
    const daysInMonth = getDaysInMonth(year, month);
    const monthPadded = String(month + 1).padStart(2, "0");
    const monthStart = `${year}-${monthPadded}-01`;
    const monthEnd = `${year}-${monthPadded}-${String(daysInMonth).padStart(2, "0")}`;
    const todayStr = monthStart.slice(0, 8) + String(today.getDate()).padStart(2, "0");

    const bankHolidaySet = new Set(
      bankHolidays.map((bh) => bh.date).filter((d) => d >= monthStart && d <= monthEnd)
    );

    // Build leave map: dateStr → highest-priority LeaveStatus
    const leaveMap = new Map<string, LeaveStatus>();
    for (const entry of user.entries) {
      if (entry.type !== LeaveType.Holiday) continue;
      if (entry.endDate < monthStart || entry.startDate > monthEnd) continue;

      // Clamp entry to this month
      const clampedStart = entry.startDate < monthStart ? monthStart : entry.startDate;
      const clampedEnd = entry.endDate > monthEnd ? monthEnd : entry.endDate;

      const startDay = parseInt(clampedStart.slice(8, 10), 10);
      const endDay = parseInt(clampedEnd.slice(8, 10), 10);

      for (let d = startDay; d <= endDay; d++) {
        const dateStr = `${year}-${monthPadded}-${String(d).padStart(2, "0")}`;
        const existing = leaveMap.get(dateStr);
        if (existing === undefined || STATUS_PRIORITY[entry.status] < STATUS_PRIORITY[existing]) {
          leaveMap.set(dateStr, entry.status);
        }
      }
    }

    // Monday-first offset: getFirstDayOfMonth returns 0=Sun; convert to Mon=0 … Sun=6
    const rawFirst = getFirstDayOfMonth(year, month);
    const offset = (rawFirst + 6) % 7;

    const result: CalendarCell[] = [];

    // Blank leading cells
    for (let i = 0; i < offset; i++) {
      result.push({
        day: null,
        dateStr: null,
        isNonWorking: false,
        isBankHoliday: false,
        leaveStatus: null,
        isToday: false,
      });
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${monthPadded}-${String(d).padStart(2, "0")}`;
      const dow = new Date(year, month, d).getDay();
      const isNonWorking = user.profile.nonWorkingDays.includes(dow);
      result.push({
        day: d,
        dateStr,
        isNonWorking,
        isBankHoliday: bankHolidaySet.has(dateStr),
        leaveStatus: leaveMap.get(dateStr) ?? null,
        isToday: dateStr === todayStr,
      });
    }

    return result;
  }, [year, month, today, user.entries, user.profile.nonWorkingDays, bankHolidays]);

  const monthLabel = today.toLocaleString("en-GB", { month: "long", year: "numeric" });

  return (
    <div className="bg-white rounded-xl shadow border border-gray-100 p-4" data-testid="mini-calendar">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-sm font-semibold text-gray-700">{monthLabel}</h2>
        <Link
          href="/annual-planner"
          className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
        >
          View Calendar →
        </Link>
      </div>

      {/* Day-of-week headers */}
      <div className="grid grid-cols-7 mb-0.5" data-testid="day-headers">
        {DAY_HEADERS.map((d, i) => (
          <div key={i} className="text-center text-xs text-gray-400 font-medium py-0.5" data-testid="day-header">
            {d}
          </div>
        ))}
      </div>

      {/* Calendar cells */}
      <div className="grid grid-cols-7 gap-y-0.5">
        {cells.map((cell, i) => {
          if (!cell.day) {
            return <div key={i} />;
          }

          if (cell.leaveStatus !== null) {
            return (
              <div key={i} className="flex items-center justify-center aspect-square">
                <span
                  className={`w-5 h-5 rounded-full inline-flex items-center justify-center ${STATUS_DOT[cell.leaveStatus]}`}
                  title={`${cell.dateStr} — ${cell.leaveStatus}`}
                  data-testid="leave-dot"
                  aria-label={`Leave on ${cell.dateStr}: ${cell.leaveStatus}`}
                />
              </div>
            );
          }

          return (
            <div key={i} className="flex items-center justify-center aspect-square">
              <span
                className={`w-5 h-5 rounded-full inline-flex items-center justify-center text-xs select-none ${
                  cell.isToday
                    ? "bg-indigo-600 text-white font-bold"
                    : cell.isNonWorking || cell.isBankHoliday
                      ? "text-gray-300"
                      : "text-gray-600"
                }`}
              >
                {cell.day}
              </span>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex gap-3 mt-3 flex-wrap">
        <span className="flex items-center gap-1 text-xs text-gray-500">
          <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
          Approved
        </span>
        <span className="flex items-center gap-1 text-xs text-gray-500">
          <span className="w-2 h-2 rounded-full bg-blue-500 inline-block" />
          Requested
        </span>
        <span className="flex items-center gap-1 text-xs text-gray-500">
          <span className="w-2 h-2 rounded-full bg-yellow-400 inline-block" />
          Planned
        </span>
      </div>
    </div>
  );
}
