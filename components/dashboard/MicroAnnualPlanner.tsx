"use client";
import { useState, useMemo, useRef, useEffect } from "react";
import Link from "next/link";
import type { PublicUser, BankHolidayEntry, LeaveEntry } from "@/types";
import { LeaveStatus, LeaveType, LeaveDuration } from "@/types";
import { STATUS_COLORS } from "@/variables/colours";
import {
  getDaysInMonth,
  getActiveYearAllowance,
  formatYearWindow,
  getEntryDuration,
  countEntryDays,
} from "@/utils/dateHelpers";
import { X, LayoutList } from "lucide-react";
import { LeaveKey, LEAVE_KEY_ITEMS_BASE } from "@/components/atoms/LeaveKey";

export interface MicroAnnualPlannerProps {
  user: PublicUser;
  bankHolidays: BankHolidayEntry[];
}

const STATUS_PRIORITY: Record<LeaveStatus, number> = {
  [LeaveStatus.Approved]: 0,
  [LeaveStatus.Requested]: 1,
  [LeaveStatus.Planned]: 2,
};

const BOX_COLORS: Record<LeaveStatus, string> = {
  [LeaveStatus.Approved]: "bg-green-300",
  [LeaveStatus.Requested]: "bg-orange-200",
  [LeaveStatus.Planned]: "bg-yellow-200",
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

const MAX_DAYS_IN_MONTH = 31;

interface DayBox {
  dateStr: string;
  status: LeaveStatus | null;
  leaveEntry: LeaveEntry | null;
  isWeekend: boolean;
  isBankHoliday: boolean;
  bankHolidayTitle?: string;
}

interface MonthRow {
  year: number;
  month: number;
  monthLabel: string;
  days: DayBox[];
}

interface PopoverInfo {
  dateStr: string;
  status: LeaveStatus | null;
  leaveEntry: LeaveEntry | null;
  bankHolidayTitle?: string;
  top: number;
  left: number;
}

function formatDateRange(startDate: string, endDate: string): string {
  const opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short" };
  const start = new Date(startDate).toLocaleDateString("en-GB", opts);
  if (startDate === endDate) return start;
  const end = new Date(endDate).toLocaleDateString("en-GB", opts);
  return `${start} – ${end}`;
}

function getDurationLabel(entry: LeaveEntry, nonWorkingDays: number[], bhDates: string[]): string {
  const dur = getEntryDuration(entry);
  if (dur === LeaveDuration.HalfMorning) return "Half day (AM)";
  if (dur === LeaveDuration.HalfAfternoon) return "Half day (PM)";
  const days = countEntryDays(entry, nonWorkingDays, bhDates);
  return `${days} working day${days === 1 ? "" : "s"}`;
}

function getEntryLabel(entry: LeaveEntry): string {
  const dur = getEntryDuration(entry);
  const base = entry.notes ?? "";
  if (dur === LeaveDuration.HalfMorning) return base ? `${base} (AM)` : "(AM)";
  if (dur === LeaveDuration.HalfAfternoon) return base ? `${base} (PM)` : "(PM)";
  return base || "No description";
}

export default function MicroAnnualPlanner({ user, bankHolidays }: MicroAnnualPlannerProps) {
  const activeYa = getActiveYearAllowance(user.yearAllowances);
  const [popover, setPopover] = useState<PopoverInfo | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const bankHolidayDates = useMemo(() => bankHolidays.map((bh) => bh.date), [bankHolidays]);

  const rows = useMemo<MonthRow[]>(() => {
    if (!activeYa) return [];

    const sm = activeYa.holidayStartMonth ?? 1;
    const bhMap = new Map(bankHolidays.map((bh) => [bh.date, bh.title]));

    return Array.from({ length: 12 }, (_, i) => {
      const monthDate = new Date(activeYa.year, sm - 1 + i, 1);
      const year = monthDate.getFullYear();
      const month = monthDate.getMonth();
      const daysInMonth = getDaysInMonth(year, month);
      const monthPadded = String(month + 1).padStart(2, "0");

      const days: DayBox[] = [];

      for (let d = 1; d <= daysInMonth; d++) {
        const dayPadded = String(d).padStart(2, "0");
        const dateStr = `${year}-${monthPadded}-${dayPadded}`;
        const dow = new Date(year, month, d).getDay();
        const isWeekend = user.profile.nonWorkingDays.includes(dow);
        const isBankHoliday = bhMap.has(dateStr);
        const bankHolidayTitle = bhMap.get(dateStr);

        const isNonWorking = isWeekend || isBankHoliday;

        let bestStatus: LeaveStatus | null = null;
        let leaveEntry: LeaveEntry | null = null;
        if (!isNonWorking) {
          for (const entry of user.entries) {
            if (entry.type !== LeaveType.Holiday) continue;
            if (entry.endDate < dateStr || entry.startDate > dateStr) continue;
            if (
              bestStatus === null ||
              STATUS_PRIORITY[entry.status] < STATUS_PRIORITY[bestStatus]
            ) {
              bestStatus = entry.status;
              leaveEntry = entry;
            }
          }
        }

        days.push({
          dateStr,
          status: bestStatus,
          leaveEntry,
          isWeekend,
          isBankHoliday,
          bankHolidayTitle,
        });
      }

      return { year, month, monthLabel: MONTH_ABBREV[month], days };
    });
  }, [activeYa, user.entries, user.profile.nonWorkingDays, bankHolidays]);

  useEffect(() => {
    if (!popover) return;
    function handleOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setPopover(null);
      }
    }
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [popover]);

  function handleDayClick(day: DayBox, boxEl: HTMLElement) {
    if (!day.status && !day.isBankHoliday) return;
    if (popover?.dateStr === day.dateStr) {
      setPopover(null);
      return;
    }
    const rect = boxEl.getBoundingClientRect();
    const containerRect = containerRef.current?.getBoundingClientRect();
    if (!containerRect) return;
    const top = rect.bottom - containerRect.top + 4;
    const left = Math.min(rect.left - containerRect.left, containerRect.width - 200);
    setPopover({
      dateStr: day.dateStr,
      status: day.status,
      leaveEntry: day.leaveEntry,
      bankHolidayTitle: day.bankHolidayTitle,
      top,
      left,
    });
  }

  if (!activeYa || rows.length === 0) return null;

  return (
    <div
      ref={containerRef}
      className="bg-white rounded-xl shadow border border-gray-100 p-4 relative"
      data-testid="micro-annual-planner"
    >
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-sm font-semibold text-gray-700">Annual Overview</h2>
        <Link
          href="/annual-planner"
          className="inline-flex items-center gap-1 text-xs font-medium text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-2 py-1 rounded-lg transition-colors"
        >
          <LayoutList size={11} />
          Full Planner
        </Link>
      </div>
      {/* Leave period subtitle */}
      <p className="text-xs text-gray-400 mb-3" data-testid="annual-planner-subtitle">
        {formatYearWindow(activeYa)}
      </p>

      <div className="space-y-1">
        {rows.map((row) => (
          <div
            key={`${row.year}-${row.month}`}
            className="flex items-center gap-1.5"
            data-testid={`month-row-${row.monthLabel}`}
          >
            <span className="text-xs text-gray-500 w-7 shrink-0">{row.monthLabel}</span>
            <div className="flex gap-px flex-1">
              {row.days.map((day) => {
                const isClickable = day.status !== null || day.isBankHoliday;
                const boxClass = `h-3 flex-1 rounded-[1px] ${
                  day.isBankHoliday
                    ? "bg-purple-300 cursor-pointer"
                    : day.isWeekend
                      ? "bg-gray-300"
                      : day.status !== null
                        ? `${BOX_COLORS[day.status]} cursor-pointer`
                        : "bg-gray-100"
                }`;
                return (
                  <div
                    key={day.dateStr}
                    title={
                      day.bankHolidayTitle ??
                      (day.status ? `${day.status}: ${day.dateStr}` : day.dateStr)
                    }
                    data-testid="day-box"
                    className={boxClass}
                    onClick={
                      isClickable ? (ev) => handleDayClick(day, ev.currentTarget) : undefined
                    }
                  />
                );
              })}
              {Array.from({ length: MAX_DAYS_IN_MONTH - row.days.length }, (_, k) => (
                <div key={`pad-${k}`} className="flex-1" />
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Legend */}
      <LeaveKey className="mt-3" items={LEAVE_KEY_ITEMS_BASE} />

      {/* Popover — styled to match CalendarView */}
      {popover && (
        <div
          className="absolute z-30 bg-white rounded-xl shadow-xl border border-gray-200 p-3 w-52 text-xs"
          style={{ top: popover.top, left: popover.left }}
          role="tooltip"
          data-testid="annual-planner-popover"
        >
          <button
            onClick={() => setPopover(null)}
            className="absolute top-2 right-2 text-gray-400 hover:text-gray-600 cursor-pointer"
            aria-label="Close popover"
          >
            <X className="w-3 h-3" />
          </button>

          {/* Bank holiday */}
          {popover.bankHolidayTitle && !popover.status && (
            <>
              <div className="inline-flex items-center px-1.5 py-0.5 rounded font-semibold mb-2 border text-[10px] bg-purple-300 text-purple-900 border-purple-500">
                Bank Holiday
              </div>
              <p className="font-medium text-gray-800 mb-1 pr-4">{popover.bankHolidayTitle}</p>
              <p className="text-gray-500">{formatDateRange(popover.dateStr, popover.dateStr)}</p>
            </>
          )}

          {/* Leave entry */}
          {popover.status && popover.leaveEntry && (
            <>
              <div
                className={`inline-flex items-center px-1.5 py-0.5 rounded font-semibold mb-2 border text-[10px] ${STATUS_COLORS[popover.status]}`}
              >
                {popover.status.charAt(0).toUpperCase() + popover.status.slice(1)}
              </div>
              <p className="font-medium text-gray-800 mb-1 pr-4">
                {getEntryLabel(popover.leaveEntry)}
              </p>
              <p className="text-gray-500 mb-1">
                {formatDateRange(popover.leaveEntry.startDate, popover.leaveEntry.endDate)}
              </p>
              <p className="text-gray-500">
                {getDurationLabel(
                  popover.leaveEntry,
                  user.profile.nonWorkingDays,
                  bankHolidayDates
                )}
              </p>
            </>
          )}
        </div>
      )}
    </div>
  );
}
