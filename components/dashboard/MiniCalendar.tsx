"use client";
import { useState, useMemo, useRef, useEffect } from "react";
import Link from "next/link";
import type { PublicUser, BankHolidayEntry, LeaveEntry } from "@/types";
import { LeaveStatus, LeaveType, LeaveDuration } from "@/types";
import { STATUS_DOT_HEX, STATUS_COLORS } from "@/variables/colours";
import {
  getDaysInMonth,
  getFirstDayOfMonth,
  getEntriesForDate,
  getEntryDuration,
  getLeaveDataBounds,
  countEntryDays,
} from "@/utils/dateHelpers";
import MonthYearPicker from "@/components/molecules/MonthYearPicker";
import { ChevronLeft, ChevronRight, X, CalendarDays } from "lucide-react";
import { LeaveKey, LEAVE_KEY_ITEMS_BASE } from "@/components/atoms/LeaveKey";

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
  bankHolidayTitle: string | null;
  /** Full-day entry or AM-half entry — fills the top half of the circle */
  topEntry: LeaveEntry | null;
  /** Full-day entry (same as topEntry) or PM-half entry — fills the bottom half */
  bottomEntry: LeaveEntry | null;
  isToday: boolean;
}

interface PopoverInfo {
  dateStr: string;
  topEntry: LeaveEntry | null;
  bottomEntry: LeaveEntry | null;
  bankHolidayTitle: string | null;
  top: number;
  left: number;
}

/** Return the highest-priority entry from an array */
function bestEntry(entries: LeaveEntry[]): LeaveEntry | null {
  if (entries.length === 0) return null;
  return entries.reduce((a, b) => (STATUS_PRIORITY[a.status] <= STATUS_PRIORITY[b.status] ? a : b));
}

/**
 * Split holiday entries for a day into top (AM/full) and bottom (PM/full) slots.
 * Full-day entries fill both slots. Half-day entries fill only their respective slot.
 */
function computeTopBottom(entries: LeaveEntry[]): {
  topEntry: LeaveEntry | null;
  bottomEntry: LeaveEntry | null;
} {
  if (entries.length === 0) return { topEntry: null, bottomEntry: null };

  const fullEntries = entries.filter((e) => getEntryDuration(e) === LeaveDuration.Full);
  const amEntries = entries.filter((e) => getEntryDuration(e) === LeaveDuration.HalfMorning);
  const pmEntries = entries.filter((e) => getEntryDuration(e) === LeaveDuration.HalfAfternoon);

  const bestFull = bestEntry(fullEntries);
  const bestAm = bestEntry(amEntries);
  const bestPm = bestEntry(pmEntries);

  const top = bestFull ?? bestAm;
  const bottom = bestFull ?? bestPm;

  return { topEntry: top ?? null, bottomEntry: bottom ?? null };
}

/**
 * Return an inline CSS style that renders a full, top-half, or bottom-half coloured circle.
 * When topEntry === bottomEntry (same object) the circle is solid-coloured.
 */
function getCircleStyle(
  topEntry: LeaveEntry | null,
  bottomEntry: LeaveEntry | null
): React.CSSProperties {
  const topHex = topEntry ? STATUS_DOT_HEX[topEntry.status] : null;
  const bottomHex = bottomEntry ? STATUS_DOT_HEX[bottomEntry.status] : null;

  if (!topHex && !bottomHex) return {};
  if (topHex === bottomHex && topHex) return { backgroundColor: topHex };

  const t = topHex ?? "#ffffff";
  const b = bottomHex ?? "#ffffff";
  return { background: `linear-gradient(to bottom, ${t} 50%, ${b} 50%)` };
}

function formatDateRange(startDate: string, endDate: string): string {
  const opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short" };
  const start = new Date(startDate).toLocaleDateString("en-GB", opts);
  if (startDate === endDate) return start;
  const end = new Date(endDate).toLocaleDateString("en-GB", opts);
  return `${start} – ${end}`;
}

function getEntryLabel(entry: LeaveEntry): string {
  const dur = getEntryDuration(entry);
  const base = entry.notes ?? "";
  if (dur === LeaveDuration.HalfMorning) return base ? `${base} (AM)` : "(AM)";
  if (dur === LeaveDuration.HalfAfternoon) return base ? `${base} (PM)` : "(PM)";
  return base || "No description";
}

function getDurationLabel(entry: LeaveEntry, nonWorkingDays: number[], bhDates: string[]): string {
  const dur = getEntryDuration(entry);
  if (dur === LeaveDuration.HalfMorning) return "Half day (AM)";
  if (dur === LeaveDuration.HalfAfternoon) return "Half day (PM)";
  const days = countEntryDays(entry, nonWorkingDays, bhDates);
  return `${days} working day${days === 1 ? "" : "s"}`;
}

export default function MiniCalendar({ user, bankHolidays }: MiniCalendarProps) {
  const today = new Date();
  const [calYear, setCalYear] = useState(today.getFullYear());
  const [calMonth, setCalMonth] = useState(today.getMonth());
  const [popover, setPopover] = useState<PopoverInfo | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  const bankHolidayDates = useMemo(() => bankHolidays.map((bh) => bh.date), [bankHolidays]);

  const { min: pickerMin, max: pickerMax } = useMemo(() => getLeaveDataBounds([user]), [user]);

  const atMin =
    calYear < pickerMin.year || (calYear === pickerMin.year && calMonth <= pickerMin.month);
  const atMax =
    calYear > pickerMax.year || (calYear === pickerMax.year && calMonth >= pickerMax.month);

  const bhMap = useMemo<Map<string, string>>(() => {
    const m = new Map<string, string>();
    for (const bh of bankHolidays) m.set(bh.date, bh.title);
    return m;
  }, [bankHolidays]);

  const cells = useMemo<CalendarCell[]>(() => {
    const daysInMonth = getDaysInMonth(calYear, calMonth);
    const monthPadded = String(calMonth + 1).padStart(2, "0");
    const monthStart = `${calYear}-${monthPadded}-01`;
    const monthEnd = `${calYear}-${monthPadded}-${String(daysInMonth).padStart(2, "0")}`;

    const rawFirst = getFirstDayOfMonth(calYear, calMonth);
    const offset = (rawFirst + 6) % 7;

    const result: CalendarCell[] = [];

    for (let i = 0; i < offset; i++) {
      result.push({
        day: null,
        dateStr: null,
        isNonWorking: false,
        isBankHoliday: false,
        bankHolidayTitle: null,
        topEntry: null,
        bottomEntry: null,
        isToday: false,
      });
    }

    const relevantEntries = user.entries.filter(
      (e) => e.type === LeaveType.Holiday && e.endDate >= monthStart && e.startDate <= monthEnd
    );

    for (let d = 1; d <= daysInMonth; d++) {
      const dayStr = String(d).padStart(2, "0");
      const dateStr = `${calYear}-${monthPadded}-${dayStr}`;
      const dow = new Date(calYear, calMonth, d).getDay();
      const isNonWorking = user.profile.nonWorkingDays.includes(dow);
      const isBankHoliday = bhMap.has(dateStr);
      const bankHolidayTitle = bhMap.get(dateStr) ?? null;

      const dayEntries = getEntriesForDate(dateStr, relevantEntries);
      const { topEntry, bottomEntry } = computeTopBottom(dayEntries);

      result.push({
        day: d,
        dateStr,
        isNonWorking,
        isBankHoliday,
        bankHolidayTitle,
        topEntry,
        bottomEntry,
        isToday: dateStr === todayStr,
      });
    }

    return result;
  }, [calYear, calMonth, user.entries, user.profile.nonWorkingDays, bhMap, todayStr]);

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

  function handleCellClick(cell: CalendarCell, cellEl: HTMLElement) {
    if (!cell.topEntry && !cell.bottomEntry && !cell.isBankHoliday) return;
    if (popover?.dateStr === cell.dateStr) {
      setPopover(null);
      return;
    }
    const rect = cellEl.getBoundingClientRect();
    const containerRect = containerRef.current?.getBoundingClientRect();
    if (!containerRect) return;
    const top = rect.bottom - containerRect.top + 4;
    const left = Math.min(rect.left - containerRect.left, containerRect.width - 200);
    setPopover({
      dateStr: cell.dateStr!,
      topEntry: cell.topEntry,
      bottomEntry: cell.bottomEntry,
      bankHolidayTitle: cell.bankHolidayTitle,
      top,
      left,
    });
  }

  return (
    <div
      ref={containerRef}
      className="bg-white rounded-xl shadow border border-gray-100 p-4 relative"
      data-testid="mini-calendar"
    >
      {/* Navigation row */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center">
          <button
            onClick={prevMonth}
            disabled={atMin}
            className="p-0.5 rounded hover:bg-gray-100 text-gray-500 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
            aria-label="Previous month"
          >
            <ChevronLeft size={14} />
          </button>
          <MonthYearPicker
            year={calYear}
            month={calMonth}
            onChange={(y, m) => {
              setCalYear(y);
              setCalMonth(m);
            }}
            minYear={pickerMin.year}
            minMonth={pickerMin.month}
            maxYear={pickerMax.year}
            maxMonth={pickerMax.month}
          />
          <button
            onClick={nextMonth}
            disabled={atMax}
            className="p-0.5 rounded hover:bg-gray-100 text-gray-500 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
            aria-label="Next month"
          >
            <ChevronRight size={14} />
          </button>
        </div>
        <Link
          href="/annual-planner"
          className="inline-flex items-center gap-1 text-xs font-medium text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-2 py-1 rounded-lg transition-colors"
        >
          <CalendarDays size={11} />
          View Calendar
        </Link>
      </div>

      {/* Day-of-week headers */}
      <div className="grid grid-cols-7 mb-0.5" data-testid="day-headers">
        {DAY_HEADERS.map((d, i) => (
          <div
            key={i}
            className="text-center text-xs text-gray-400 font-medium py-0.5"
            data-testid="day-header"
          >
            {d}
          </div>
        ))}
      </div>

      {/* Calendar cells */}
      <div className="grid grid-cols-7 gap-y-0.5">
        {cells.map((cell, i) => {
          if (!cell.day) return <div key={i} />;

          const hasLeave = cell.topEntry !== null || cell.bottomEntry !== null;
          // today indicator: ring border (not solid fill) so leave colour shows through
          const todayRing = cell.isToday ? "ring-2 ring-indigo-600 ring-offset-0" : "";

          if (hasLeave) {
            const circleStyle = getCircleStyle(cell.topEntry, cell.bottomEntry);
            const primaryStatus = cell.topEntry?.status ?? cell.bottomEntry?.status;
            return (
              <div
                key={i}
                className="flex items-center justify-center aspect-square"
                onClick={(ev) => handleCellClick(cell, ev.currentTarget as HTMLElement)}
              >
                <span
                  className={`w-5 h-5 rounded-full inline-flex items-center justify-center text-[10px] font-bold text-gray-900 cursor-pointer ${todayRing}`}
                  style={circleStyle}
                  title={`${cell.dateStr} — ${primaryStatus}`}
                  data-testid="leave-dot"
                  aria-label={`Leave on ${cell.dateStr}: ${primaryStatus}`}
                >
                  {cell.day}
                </span>
              </div>
            );
          }

          if (cell.isBankHoliday) {
            return (
              <div
                key={i}
                className="flex items-center justify-center aspect-square"
                onClick={(ev) => handleCellClick(cell, ev.currentTarget as HTMLElement)}
              >
                <span
                  className={`w-5 h-5 rounded-full inline-flex items-center justify-center text-[10px] select-none bg-purple-300 text-purple-900 cursor-pointer font-medium ${todayRing}`}
                  title={cell.bankHolidayTitle ?? cell.dateStr ?? undefined}
                  data-testid="bank-holiday-dot"
                  aria-label={cell.bankHolidayTitle ?? `Bank holiday on ${cell.dateStr}`}
                >
                  {cell.day}
                </span>
              </div>
            );
          }

          return (
            <div key={i} className="flex items-center justify-center aspect-square">
              <span
                className={`w-5 h-5 rounded-full inline-flex items-center justify-center text-[10px] select-none font-medium ${
                  cell.isToday
                    ? "ring-2 ring-indigo-600 text-indigo-700 font-bold"
                    : cell.isNonWorking
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
      <LeaveKey className="mt-3" items={LEAVE_KEY_ITEMS_BASE} />

      {/* Popover — styled to match CalendarView */}
      {popover && (
        <div
          className="absolute z-30 bg-white rounded-xl shadow-xl border border-gray-200 p-3 w-52 text-xs"
          style={{ top: popover.top, left: popover.left }}
          role="tooltip"
          data-testid="mini-calendar-popover"
        >
          <button
            onClick={() => setPopover(null)}
            className="absolute top-2 right-2 text-gray-400 hover:text-gray-600 cursor-pointer"
            aria-label="Close popover"
          >
            <X className="w-3 h-3" />
          </button>

          {/* Bank holiday with no leave */}
          {popover.bankHolidayTitle && !popover.topEntry && !popover.bottomEntry && (
            <>
              <div className="inline-flex items-center px-1.5 py-0.5 rounded font-semibold mb-2 border text-[10px] bg-purple-300 text-purple-900 border-purple-500">
                Bank Holiday
              </div>
              <p className="font-medium text-gray-800 mb-1 pr-4">{popover.bankHolidayTitle}</p>
              <p className="text-gray-500">{formatDateRange(popover.dateStr, popover.dateStr)}</p>
            </>
          )}

          {/* Primary leave entry (full-day or AM half) */}
          {popover.topEntry && (
            <div
              className={
                popover.bottomEntry && popover.bottomEntry !== popover.topEntry ? "mb-3" : ""
              }
            >
              <div
                className={`inline-flex items-center px-1.5 py-0.5 rounded font-semibold mb-2 border text-[10px] ${STATUS_COLORS[popover.topEntry.status]}`}
              >
                {popover.topEntry.status.charAt(0).toUpperCase() + popover.topEntry.status.slice(1)}
              </div>
              <p className="font-medium text-gray-800 mb-1 pr-4">
                {getEntryLabel(popover.topEntry)}
              </p>
              <p className="text-gray-500 mb-1">
                {formatDateRange(popover.topEntry.startDate, popover.topEntry.endDate)}
              </p>
              <p className="text-gray-500">
                {getDurationLabel(popover.topEntry, user.profile.nonWorkingDays, bankHolidayDates)}
              </p>
            </div>
          )}

          {/* Bottom-half PM entry (only when different from top) */}
          {popover.bottomEntry && popover.bottomEntry !== popover.topEntry && (
            <div className="border-t border-gray-100 pt-2 mt-1">
              <div
                className={`inline-flex items-center px-1.5 py-0.5 rounded font-semibold mb-2 border text-[10px] ${STATUS_COLORS[popover.bottomEntry.status]}`}
              >
                {popover.bottomEntry.status.charAt(0).toUpperCase() +
                  popover.bottomEntry.status.slice(1)}
              </div>
              <p className="font-medium text-gray-800 mb-1 pr-4">
                {getEntryLabel(popover.bottomEntry)}
              </p>
              <p className="text-gray-500 mb-1">
                {formatDateRange(popover.bottomEntry.startDate, popover.bottomEntry.endDate)}
              </p>
              <p className="text-gray-500">
                {getDurationLabel(
                  popover.bottomEntry,
                  user.profile.nonWorkingDays,
                  bankHolidayDates
                )}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
