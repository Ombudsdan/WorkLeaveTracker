"use client";
import { useMemo } from "react";
import Link from "next/link";
import type { PublicUser, BankHolidayEntry } from "@/types";
import { LeaveStatus, LeaveType } from "@/types";
import { getDaysInMonth, getActiveYearAllowance } from "@/utils/dateHelpers";

export interface MicroAnnualPlannerProps {
  user: PublicUser;
  bankHolidays: BankHolidayEntry[];
}

/** Priority for multi-entry days: Approved beats Requested beats Planned */
const STATUS_PRIORITY: Record<LeaveStatus, number> = {
  [LeaveStatus.Approved]: 0,
  [LeaveStatus.Requested]: 1,
  [LeaveStatus.Planned]: 2,
};

/** Tailwind bg classes for each leave status (day boxes) */
const BOX_COLORS: Record<LeaveStatus, string> = {
  [LeaveStatus.Approved]: "bg-green-400",
  [LeaveStatus.Requested]: "bg-blue-400",
  [LeaveStatus.Planned]: "bg-yellow-300",
};

const MONTH_ABBREV = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

/** Maximum number of days in any month — used to pad shorter months for alignment */
const MAX_DAYS_IN_MONTH = 31;

interface DayBox {
  dateStr: string;
  /** null = working day with no leave; string = leave status */
  status: LeaveStatus | null;
  isNonWorking: boolean;
}

interface MonthRow {
  year: number;
  month: number;
  monthLabel: string;
  days: DayBox[];
}

export default function MicroAnnualPlanner({ user, bankHolidays }: MicroAnnualPlannerProps) {
  const activeYa = getActiveYearAllowance(user.yearAllowances);

  const rows = useMemo<MonthRow[]>(() => {
    if (!activeYa) return [];

    const sm = activeYa.holidayStartMonth ?? 1;
    const bankHolidaySet = new Set(bankHolidays.map((bh) => bh.date));

    return Array.from({ length: 12 }, (_, i) => {
      const monthDate = new Date(activeYa.year, sm - 1 + i, 1);
      const year = monthDate.getFullYear();
      const month = monthDate.getMonth(); // 0-indexed
      const daysInMonth = getDaysInMonth(year, month);
      const monthPadded = String(month + 1).padStart(2, "0");

      const days: DayBox[] = [];

      for (let d = 1; d <= daysInMonth; d++) {
        const dayPadded = String(d).padStart(2, "0");
        const dateStr = `${year}-${monthPadded}-${dayPadded}`;
        const dow = new Date(year, month, d).getDay();
        const isNonWorking =
          user.profile.nonWorkingDays.includes(dow) || bankHolidaySet.has(dateStr);

        // Find highest-priority leave status for this day
        let bestStatus: LeaveStatus | null = null;
        if (!isNonWorking) {
          for (const entry of user.entries) {
            if (entry.type !== LeaveType.Holiday) continue;
            if (entry.endDate < dateStr || entry.startDate > dateStr) continue;
            if (
              bestStatus === null ||
              STATUS_PRIORITY[entry.status] < STATUS_PRIORITY[bestStatus]
            ) {
              bestStatus = entry.status;
            }
          }
        }

        days.push({ dateStr, status: bestStatus, isNonWorking });
      }

      return { year, month, monthLabel: MONTH_ABBREV[month], days };
    });
  }, [activeYa, user.entries, user.profile.nonWorkingDays, bankHolidays]);

  if (!activeYa || rows.length === 0) return null;

  return (
    <div
      className="bg-white rounded-xl shadow border border-gray-100 p-4"
      data-testid="micro-annual-planner"
    >
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-gray-700">Annual Overview</h2>
        <Link
          href="/annual-planner"
          className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
        >
          Full Planner →
        </Link>
      </div>

      <div className="space-y-1">
        {rows.map((row) => (
          <div
            key={`${row.year}-${row.month}`}
            className="flex items-center gap-1.5"
            data-testid={`month-row-${row.monthLabel}`}
          >
            <span className="text-xs text-gray-500 w-7 shrink-0">{row.monthLabel}</span>
            <div className="flex gap-px flex-1">
              {row.days.map((day) => (
                <div
                  key={day.dateStr}
                  title={day.dateStr}
                  data-testid="day-box"
                  className={`h-3 flex-1 rounded-[1px] ${
                    day.isNonWorking
                      ? "bg-gray-100"
                      : day.status !== null
                        ? BOX_COLORS[day.status]
                        : "bg-gray-200"
                  }`}
                />
              ))}
              {/* Padding boxes to align all months to MAX_DAYS_IN_MONTH columns */}
              {Array.from({ length: MAX_DAYS_IN_MONTH - row.days.length }, (_, k) => (
                <div key={`pad-${k}`} className="flex-1" />
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="flex gap-3 mt-3 flex-wrap">
        <span className="flex items-center gap-1 text-xs text-gray-500">
          <span className="w-2.5 h-2.5 rounded-[1px] bg-green-400 inline-block" />
          Approved
        </span>
        <span className="flex items-center gap-1 text-xs text-gray-500">
          <span className="w-2.5 h-2.5 rounded-[1px] bg-blue-400 inline-block" />
          Requested
        </span>
        <span className="flex items-center gap-1 text-xs text-gray-500">
          <span className="w-2.5 h-2.5 rounded-[1px] bg-yellow-300 inline-block" />
          Planned
        </span>
      </div>
    </div>
  );
}
