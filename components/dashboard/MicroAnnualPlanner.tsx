"use client";
import { useState, useMemo, useRef, useEffect } from "react";
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
import { X } from "lucide-react";
import {
  LeaveKey,
  LEAVE_KEY_ITEMS_BASE,
  LEAVE_KEY_BANK_HOLIDAY_NWD,
  NON_WORKING_BH_STRIPE_STYLE,
} from "@/components/atoms/LeaveKey";

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

const BOX_HEX_COLORS: Record<LeaveStatus, string> = {
  [LeaveStatus.Approved]: "#86efac",
  [LeaveStatus.Requested]: "#fed7aa",
  [LeaveStatus.Planned]: "#fef08a",
};

const GRAY_100_HEX = "#f3f4f6";
const POPOVER_WIDTH = 208;

function halfDayGradient(topLeft: string, bottomRight: string): string {
  return `linear-gradient(to bottom right, ${topLeft} calc(50% - 0.5px), white calc(50% - 0.5px), white calc(50% + 0.5px), ${bottomRight} calc(50% + 0.5px))`;
}

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
  allLeaveEntries: LeaveEntry[];
  isWeekend: boolean;
  isBankHoliday: boolean;
  bankHolidayTitle?: string;
  amEntry: LeaveEntry | null;
  pmEntry: LeaveEntry | null;
  isFullDay: boolean;
}

interface MonthRow {
  year: number;
  month: number;
  monthLabel: string;
  days: DayBox[];
}

interface PopoverInfo {
  dateStr: string;
  leaveEntries: LeaveEntry[];
  isBankHoliday: boolean;
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
        const allLeaveEntries: LeaveEntry[] = [];
        let amEntry: LeaveEntry | null = null;
        let pmEntry: LeaveEntry | null = null;
        let isFullDay = false;

        if (!isNonWorking) {
          for (const entry of user.entries) {
            if (entry.type !== LeaveType.Holiday) continue;
            if (entry.endDate < dateStr || entry.startDate > dateStr) continue;

            allLeaveEntries.push(entry);

            if (
              bestStatus === null ||
              STATUS_PRIORITY[entry.status] < STATUS_PRIORITY[bestStatus]
            ) {
              bestStatus = entry.status;
              leaveEntry = entry;
            }

            const dur = getEntryDuration(entry);
            if (dur === LeaveDuration.HalfMorning) amEntry = entry;
            else if (dur === LeaveDuration.HalfAfternoon) pmEntry = entry;
            else isFullDay = true;
          }
        }

        days.push({
          dateStr,
          status: bestStatus,
          leaveEntry,
          allLeaveEntries,
          isWeekend,
          isBankHoliday,
          bankHolidayTitle,
          amEntry,
          pmEntry,
          isFullDay,
        });
      }

      return { year, month, monthLabel: MONTH_ABBREV[month], days };
    });
  }, [activeYa, user.entries, user.profile.nonWorkingDays, bankHolidays]);

  // True when at least one bank holiday in this period falls on a non-working day —
  // used to conditionally show the NWD key item in the legend.
  const hasBhOnNwd = useMemo(
    () => rows.some((row) => row.days.some((day) => day.isBankHoliday && day.isWeekend)),
    [rows]
  );

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
    if (!day.allLeaveEntries.length && !day.isBankHoliday) return;
    if (popover?.dateStr === day.dateStr) {
      setPopover(null);
      return;
    }
    const rect = boxEl.getBoundingClientRect();
    const containerRect = containerRef.current?.getBoundingClientRect();
    if (!containerRect) return;
    const top = rect.bottom - containerRect.top + 4;
    const left = Math.min(rect.left - containerRect.left, containerRect.width - POPOVER_WIDTH);
    setPopover({
      dateStr: day.dateStr,
      leaveEntries: day.allLeaveEntries,
      isBankHoliday: day.isBankHoliday,
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
        <h2 className="text-sm font-semibold text-gray-700">Annual Calendar</h2>
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
                const isClickable = day.allLeaveEntries.length > 0 || day.isBankHoliday;

                // Compute box style for half-day diagonal display
                let boxClassName = "h-5 flex-1 rounded-[1px]";
                let boxStyle: React.CSSProperties | undefined;

                if (day.isBankHoliday) {
                  boxClassName += " bg-purple-300 cursor-pointer";
                  if (day.isWeekend) {
                    boxStyle = NON_WORKING_BH_STRIPE_STYLE;
                  }
                } else if (day.isWeekend) {
                  boxClassName += " bg-gray-300";
                } else if (day.isFullDay && day.status !== null) {
                  boxClassName += ` ${BOX_COLORS[day.status]} cursor-pointer`;
                } else if (day.amEntry && day.pmEntry) {
                  const amColor = BOX_HEX_COLORS[day.amEntry.status];
                  const pmColor = BOX_HEX_COLORS[day.pmEntry.status];
                  boxClassName += " cursor-pointer";
                  boxStyle = { background: halfDayGradient(amColor, pmColor) };
                } else if (day.amEntry) {
                  const amColor = BOX_HEX_COLORS[day.amEntry.status];
                  boxClassName += " cursor-pointer";
                  boxStyle = { background: halfDayGradient(amColor, GRAY_100_HEX) };
                } else if (day.pmEntry) {
                  const pmColor = BOX_HEX_COLORS[day.pmEntry.status];
                  boxClassName += " cursor-pointer";
                  boxStyle = { background: halfDayGradient(GRAY_100_HEX, pmColor) };
                } else if (day.status !== null) {
                  boxClassName += ` ${BOX_COLORS[day.status]} cursor-pointer`;
                } else {
                  boxClassName += " bg-gray-100";
                }

                return (
                  <div
                    key={day.dateStr}
                    title={
                      day.isBankHoliday
                        ? day.bankHolidayTitle
                        : day.allLeaveEntries.length > 0
                          ? day.allLeaveEntries.map((e) => `${e.status}: ${e.startDate}`).join(", ")
                          : day.dateStr
                    }
                    data-testid="day-box"
                    className={boxClassName}
                    style={boxStyle}
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
      <LeaveKey
        className="mt-3"
        items={
          hasBhOnNwd ? [...LEAVE_KEY_ITEMS_BASE, LEAVE_KEY_BANK_HOLIDAY_NWD] : LEAVE_KEY_ITEMS_BASE
        }
      />

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
          {popover.isBankHoliday && (
            <>
              <div className="inline-flex items-center px-1.5 py-0.5 rounded font-semibold mb-2 border text-[10px] bg-purple-300 text-purple-900 border-purple-500">
                Bank Holiday
              </div>
              <p className="font-medium text-gray-800 mb-1 pr-4">{popover.bankHolidayTitle}</p>
              <p className="text-gray-500">{formatDateRange(popover.dateStr, popover.dateStr)}</p>
            </>
          )}

          {/* Leave entries */}
          {popover.leaveEntries.map((entry, idx) => (
            <div key={entry.id} className={idx > 0 ? "mt-2 pt-2 border-t border-gray-100" : ""}>
              <div
                className={`inline-flex items-center px-1.5 py-0.5 rounded font-semibold mb-2 border text-[10px] ${STATUS_COLORS[entry.status]}`}
              >
                {entry.status.charAt(0).toUpperCase() + entry.status.slice(1)}
              </div>
              <p className="font-medium text-gray-800 mb-1 pr-4">{getEntryLabel(entry)}</p>
              <p className="text-gray-500 mb-1">
                {formatDateRange(entry.startDate, entry.endDate)}
              </p>
              <p className="text-gray-500">
                {getDurationLabel(entry, user.profile.nonWorkingDays, bankHolidayDates)}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
