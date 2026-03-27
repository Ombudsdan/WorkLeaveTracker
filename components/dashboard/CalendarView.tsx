"use client";
import { useState, useEffect, useRef } from "react";
import type { LeaveEntry, PublicUser, BankHolidayEntry } from "@/types";
import { LeaveStatus, LeaveType, LeaveDuration } from "@/types";
import {
  CALENDAR_CELL_BANK_HOLIDAY,
  CALENDAR_CELL_NON_WORKING,
  CALENDAR_CELL_DEFAULT,
  STATUS_COLORS,
  SICK_LEAVE_CARD_COLORS,
  getCalendarEntryClass,
} from "@/variables/colours";
import { DAY_NAMES_SHORT } from "@/variables/calendar";
import {
  getDaysInMonth,
  getFirstDayOfMonth,
  getEntriesForDate,
  isNonWorkingDay,
  toIsoDate,
  countEntryDays,
  getEntryDuration,
  getLeaveDataBounds,
} from "@/utils/dateHelpers";
import { SICK_LEAVE_ENABLED } from "@/utils/features";
import { Pencil, Trash2, X, ChevronLeft, ChevronRight } from "lucide-react";
import MonthYearPicker from "@/components/molecules/MonthYearPicker";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type CellLayout =
  | { kind: "empty" }
  | { kind: "full"; entry: LeaveEntry }
  | { kind: "top"; entry: LeaveEntry }
  | { kind: "bottom"; entry: LeaveEntry }
  | { kind: "split"; top: LeaveEntry; bottom: LeaveEntry };

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Priority for ordering two entries on the same day: lower = higher priority */
const STATUS_PRIORITY: Record<LeaveStatus, number> = {
  [LeaveStatus.Approved]: 0,
  [LeaveStatus.Requested]: 1,
  [LeaveStatus.Planned]: 2,
};

function statusPriority(entry: LeaveEntry): number {
  return STATUS_PRIORITY[entry.status] ?? 99;
}

function getNoteLabel(entry: LeaveEntry): string {
  const base = entry.notes ?? "";
  const dur = getEntryDuration(entry);
  if (dur === LeaveDuration.HalfMorning) return base ? `${base} (AM)` : "(AM)";
  if (dur === LeaveDuration.HalfAfternoon) return base ? `${base} (PM)` : "(PM)";
  return base;
}

function isAM(entry: LeaveEntry): boolean {
  return getEntryDuration(entry) === LeaveDuration.HalfMorning;
}

function isPM(entry: LeaveEntry): boolean {
  return getEntryDuration(entry) === LeaveDuration.HalfAfternoon;
}

function getCellLayout(entries: LeaveEntry[]): CellLayout {
  if (entries.length === 0) return { kind: "empty" };

  if (entries.length === 1) {
    const e = entries[0];
    const dur = getEntryDuration(e);
    if (dur === LeaveDuration.Full) return { kind: "full", entry: e };
    return dur === LeaveDuration.HalfMorning
      ? { kind: "top", entry: e }
      : { kind: "bottom", entry: e };
  }

  // Two entries — determine top/bottom placement
  const [a, b] = entries;
  const aIsAm = isAM(a);
  const aIsPm = isPM(a);
  const bIsAm = isAM(b);
  const bIsPm = isPM(b);

  // One is AM half-day, the other is PM half-day or full-day → AM goes top
  if (aIsAm && !bIsAm) return { kind: "split", top: a, bottom: b };
  if (bIsAm && !aIsAm) return { kind: "split", top: b, bottom: a };

  // One is PM half-day, the other must be full-day (AM already handled above)
  // → full-day goes top, PM goes bottom
  if (aIsPm && !bIsPm) return { kind: "split", top: b, bottom: a };
  if (bIsPm && !aIsPm) return { kind: "split", top: a, bottom: b };

  // Both have the same temporal position (both AM, both PM, or both full-day)
  // → order by status priority (Approved > Requested > Planned), then default order
  if (statusPriority(a) <= statusPriority(b)) return { kind: "split", top: a, bottom: b };
  return { kind: "split", top: b, bottom: a };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function CalendarView({
  user,
  bankHolidays,
  isOwnProfile,
  onAdd,
  onEdit,
  onDelete,
}: CalendarViewProps) {
  const today = new Date();
  const [calendarYear, setCalendarYear] = useState(today.getFullYear());
  const [calendarMonth, setCalendarMonth] = useState(today.getMonth());
  const [popover, setPopover] = useState<PopoverState | null>(null);
  const [isMobileSheet, setIsMobileSheet] = useState(false);
  const calendarRef = useRef<HTMLDivElement>(null);

  // Compute min/max picker bounds from the user's leave data
  const { min: pickerMin, max: pickerMax } = getLeaveDataBounds([user]);

  // Detect mobile layout to switch between bottom sheet and floating popover
  useEffect(() => {
    function checkMobile() {
      setIsMobileSheet(window.innerWidth < 640);
    }
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const todayStr = toIsoDate(today);
  const daysInMonth = getDaysInMonth(calendarYear, calendarMonth);
  const firstDay = getFirstDayOfMonth(calendarYear, calendarMonth);

  // Build lookup maps for bank holiday dates and names
  const bankHolidayDates = bankHolidays.map((bh) => bh.date);
  const bankHolidayNames = new Map(bankHolidays.map((bh) => [bh.date, bh.title]));

  // Close popover when clicking outside the calendar
  useEffect(() => {
    function handleOutsideClick(e: MouseEvent) {
      if (calendarRef.current && !calendarRef.current.contains(e.target as Node)) {
        setPopover(null);
      }
    }
    if (popover) {
      document.addEventListener("mousedown", handleOutsideClick);
    }
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [popover]);

  const atMin =
    calendarYear < pickerMin.year ||
    (calendarYear === pickerMin.year && calendarMonth <= pickerMin.month);
  const atMax =
    calendarYear > pickerMax.year ||
    (calendarYear === pickerMax.year && calendarMonth >= pickerMax.month);

  function prevMonth() {
    if (calendarMonth === 0) {
      setCalendarMonth(11);
      setCalendarYear((y) => y - 1);
    } else {
      setCalendarMonth((m) => m - 1);
    }
  }

  function nextMonth() {
    if (calendarMonth === 11) {
      setCalendarMonth(0);
      setCalendarYear((y) => y + 1);
    } else {
      setCalendarMonth((m) => m + 1);
    }
  }

  function handleCellClick(entry: LeaveEntry, cellEl: HTMLElement) {
    if (popover?.entry.id === entry.id) {
      setPopover(null);
      return;
    }
    const rect = cellEl.getBoundingClientRect();
    const calRect = calendarRef.current?.getBoundingClientRect();
    if (!calRect) return;
    const top = rect.bottom - calRect.top + 6;
    const left = Math.min(rect.left - calRect.left, calRect.width - 220);
    setPopover({ entry, top, left });
  }

  function formatDateRange(startDate: string, endDate: string): string {
    const opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short" };
    const start = new Date(startDate).toLocaleDateString("en-GB", opts);
    if (startDate === endDate) return start;
    const end = new Date(endDate).toLocaleDateString("en-GB", opts);
    return `${start} – ${end}`;
  }

  function renderCell(day: number) {
    const dateStr = `${calendarYear}-${String(calendarMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const entries = getEntriesForDate(dateStr, user.entries);
    const isBankHoliday = bankHolidayDates.includes(dateStr);
    const bankHolidayName = bankHolidayNames.get(dateStr);
    const isNWD = isNonWorkingDay(dateStr, user.profile.nonWorkingDays);
    // Compute day-of-week from the known first-day offset to avoid an extra Date allocation.
    // Show "Non-Working" label only for weekday non-working days (Mon–Fri that are
    // in nonWorkingDays), not for standard weekend days.
    const dow = (firstDay + day - 1) % 7;
    const isWeekdayNWD = isNWD && dow !== 0 && dow !== 6;
    const isToday = dateStr === todayStr;
    // Don't render leave entries on non-working days — the cell should always
    // display its NWD styling regardless of whether a leave entry spans that day.
    // Bank holidays with leave entries retain the leave colour (BH name is suppressed
    // by the cell layout logic since the layout is non-empty).
    const displayEntries = isNWD ? [] : entries;
    const layout = getCellLayout(displayEntries);

    const defaultClass =
      displayEntries.length === 0
        ? isBankHoliday
          ? CALENDAR_CELL_BANK_HOLIDAY
          : isNWD
            ? CALENDAR_CELL_NON_WORKING
            : CALENDAR_CELL_DEFAULT
        : "";

    const todayRing = isToday ? "ring-2 ring-indigo-500" : "";

    if (layout.kind === "empty") {
      const isClickable = !isNWD && !isBankHoliday && isOwnProfile && !!onAdd;
      return (
        <div
          key={day}
          className={`relative aspect-square rounded-lg overflow-hidden text-xs font-medium transition ${isClickable ? "cursor-pointer hover:ring-2 hover:ring-indigo-300" : "cursor-default"} ${defaultClass} ${todayRing}`}
          onClick={isClickable ? () => onAdd!(dateStr) : undefined}
        >
          <div className="h-full flex flex-col items-center justify-center">
            <span>{day}</span>
            {isBankHoliday && (
              <span className="text-purple-900 text-[8px] leading-none truncate w-full text-center px-0.5">
                {bankHolidayName ?? "BH"}
              </span>
            )}
            {isWeekdayNWD && (
              <span className="text-gray-400 text-[8px] leading-none truncate w-full text-center px-0.5">
                Non-Working
              </span>
            )}
          </div>
        </div>
      );
    }

    if (layout.kind === "full") {
      const e = layout.entry;
      const label = getNoteLabel(e);
      return (
        <div
          key={day}
          className={`relative aspect-square rounded-lg overflow-hidden text-xs font-medium transition cursor-pointer ${getCalendarEntryClass(e)} ${todayRing}`}
          onClick={(ev) => handleCellClick(e, ev.currentTarget as HTMLElement)}
          title={label}
        >
          <div className="h-full flex flex-col items-center justify-center">
            <span>{day}</span>
            {label && (
              <span className="text-[7px] leading-tight truncate w-full text-center px-0.5 opacity-80">
                {label}
              </span>
            )}
          </div>
        </div>
      );
    }

    if (layout.kind === "top") {
      const e = layout.entry;
      const label = getNoteLabel(e);
      return (
        <div
          key={day}
          className={`relative aspect-square rounded-lg overflow-hidden text-xs font-medium transition cursor-pointer ${todayRing}`}
          title={label}
        >
          <div className="flex flex-col h-full">
            <div
              className={`flex-1 flex items-center justify-center overflow-hidden px-0.5 ${getCalendarEntryClass(e)}`}
              onClick={(ev) => handleCellClick(e, ev.currentTarget as HTMLElement)}
            >
              {label && (
                <span className="text-[7px] leading-tight text-center truncate w-full">
                  {label}
                </span>
              )}
            </div>
            <div
              className={`flex-1 flex items-center justify-center ${defaultClass || CALENDAR_CELL_DEFAULT}`}
            />
          </div>
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <span className="w-4 h-4 rounded-full bg-white/90 flex items-center justify-center text-[9px] font-bold text-gray-700 shadow-sm">
              {day}
            </span>
          </div>
        </div>
      );
    }

    if (layout.kind === "bottom") {
      const e = layout.entry;
      const label = getNoteLabel(e);
      return (
        <div
          key={day}
          className={`relative aspect-square rounded-lg overflow-hidden text-xs font-medium transition cursor-pointer ${todayRing}`}
          title={label}
        >
          <div className="flex flex-col h-full">
            <div
              className={`flex-1 flex items-center justify-center ${defaultClass || CALENDAR_CELL_DEFAULT}`}
            />
            <div
              className={`flex-1 flex items-center justify-center overflow-hidden px-0.5 ${getCalendarEntryClass(e)}`}
              onClick={(ev) => handleCellClick(e, ev.currentTarget as HTMLElement)}
            >
              {label && (
                <span className="text-[7px] leading-tight text-center truncate w-full">
                  {label}
                </span>
              )}
            </div>
          </div>
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <span className="w-4 h-4 rounded-full bg-white/90 flex items-center justify-center text-[9px] font-bold text-gray-700 shadow-sm">
              {day}
            </span>
          </div>
        </div>
      );
    }

    // split
    const { top: topEntry, bottom: botEntry } = layout;
    const topLabel = getNoteLabel(topEntry);
    const botLabel = getNoteLabel(botEntry);
    return (
      <div
        key={day}
        className={`relative aspect-square rounded-lg overflow-hidden text-xs font-medium transition ${todayRing}`}
      >
        <div className="flex flex-col h-full">
          <div
            className={`flex-1 flex items-center justify-center overflow-hidden px-0.5 cursor-pointer ${getCalendarEntryClass(topEntry)}`}
            onClick={(e) => handleCellClick(topEntry, e.currentTarget as HTMLElement)}
          >
            {topLabel && (
              <span className="text-[7px] leading-tight text-center truncate w-full">
                {topLabel}
              </span>
            )}
          </div>
          <div
            className={`flex-1 flex items-center justify-center overflow-hidden px-0.5 cursor-pointer ${getCalendarEntryClass(botEntry)}`}
            onClick={(e) => handleCellClick(botEntry, e.currentTarget as HTMLElement)}
          >
            {botLabel && (
              <span className="text-[7px] leading-tight text-center truncate w-full">
                {botLabel}
              </span>
            )}
          </div>
        </div>
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <span className="w-4 h-4 rounded-full bg-white/90 flex items-center justify-center text-[9px] font-bold text-gray-700 shadow-sm">
            {day}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div ref={calendarRef} className="bg-white rounded-2xl shadow p-5 relative">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={prevMonth}
          disabled={atMin}
          className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-600 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
          aria-label="Previous month"
        >
          <ChevronLeft size={18} />
        </button>
        <MonthYearPicker
          year={calendarYear}
          month={calendarMonth}
          onChange={(y, m) => {
            setCalendarYear(y);
            setCalendarMonth(m);
          }}
          minYear={pickerMin.year}
          minMonth={pickerMin.month}
          maxYear={pickerMax.year}
          maxMonth={pickerMax.month}
        />
        <button
          onClick={nextMonth}
          disabled={atMax}
          className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-600 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
          aria-label="Next month"
        >
          <ChevronRight size={18} />
        </button>
      </div>

      {/* Day labels */}
      <div className="grid grid-cols-7 mb-1">
        {DAY_NAMES_SHORT.map((day) => (
          <div key={day} className="text-center text-xs font-medium text-gray-400 py-1">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-0.5">
        {Array.from({ length: firstDay }).map((_, index) => (
          <div key={`empty-${index}`} />
        ))}
        {Array.from({ length: daysInMonth }).map((_, index) => renderCell(index + 1))}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 mt-4 text-xs text-gray-500">
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded bg-green-400" /> Approved
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded bg-orange-300" /> Requested
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded bg-yellow-200" /> Planned
        </span>
        {SICK_LEAVE_ENABLED && (
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded bg-red-200" /> Sick
          </span>
        )}
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded bg-purple-400" /> Bank Holiday
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded bg-gray-100" /> Non-Working
        </span>
      </div>

      {/* Mobile backdrop — tap outside the sheet to dismiss */}
      {popover && isMobileSheet && (
        <div
          data-testid="mobile-backdrop"
          className="fixed inset-0 z-40 bg-black/30"
          onClick={() => setPopover(null)}
          aria-hidden="true"
        />
      )}

      {/* Leave entry popover — bottom sheet on mobile, floating card on desktop */}
      {popover && (
        <div
          className={
            isMobileSheet
              ? "fixed inset-x-0 bottom-0 z-50 bg-white rounded-t-2xl shadow-2xl border-t border-gray-200 p-5 text-sm"
              : "absolute z-30 bg-white rounded-xl shadow-xl border border-gray-200 p-3 w-52 text-xs"
          }
          style={!isMobileSheet ? { top: popover.top, left: popover.left } : undefined}
          role="tooltip"
        >
          <button
            onClick={() => setPopover(null)}
            className={
              isMobileSheet
                ? "absolute top-4 right-4 p-1 text-gray-400 hover:text-gray-600 cursor-pointer"
                : "absolute top-2 right-2 text-gray-400 hover:text-gray-600 cursor-pointer"
            }
            aria-label="Close"
          >
            <X className={isMobileSheet ? "w-5 h-5" : "w-3 h-3"} />
          </button>

          {/* Status / type badge */}
          {(() => {
            const isSick = popover.entry.type === LeaveType.Sick;
            const badgeClass = isSick
              ? SICK_LEAVE_CARD_COLORS
              : STATUS_COLORS[popover.entry.status];
            const badgeLabel = isSick
              ? "Sick Leave"
              : popover.entry.status.charAt(0).toUpperCase() + popover.entry.status.slice(1);
            return (
              <div
                className={`inline-flex items-center px-1.5 py-0.5 rounded font-semibold mb-2 border ${badgeClass} ${isMobileSheet ? "text-xs" : "text-[10px]"}`}
              >
                {badgeLabel}
              </div>
            );
          })()}

          <p
            className={`font-medium text-gray-800 mb-1 ${isMobileSheet ? "pr-8 text-base" : "pr-4"}`}
          >
            {getNoteLabel(popover.entry) || "No description"}
          </p>

          <p className="text-gray-500 mb-1">
            {formatDateRange(popover.entry.startDate, popover.entry.endDate)}
          </p>

          <p className={`text-gray-500 ${isMobileSheet ? "mb-4" : "mb-2"}`}>
            {(() => {
              const dur = getEntryDuration(popover.entry);
              if (dur === LeaveDuration.HalfMorning) return "Half day (AM)";
              if (dur === LeaveDuration.HalfAfternoon) return "Half day (PM)";
              return `${countEntryDays(popover.entry, user.profile.nonWorkingDays, bankHolidayDates)} working day(s)`;
            })()}
          </p>

          {isOwnProfile && (onEdit || onDelete) && (
            <div
              className={`flex border-t border-gray-100 ${isMobileSheet ? "gap-3 pt-4" : "gap-2 pt-2"}`}
            >
              {onEdit && (
                <button
                  onClick={() => {
                    onEdit(popover.entry);
                    setPopover(null);
                  }}
                  className={
                    isMobileSheet
                      ? "flex-1 flex items-center justify-center gap-2 py-3 text-indigo-600 hover:text-indigo-800 font-medium cursor-pointer rounded-xl border border-indigo-100 hover:bg-indigo-50"
                      : "flex items-center gap-1 text-indigo-600 hover:text-indigo-800 font-medium cursor-pointer"
                  }
                  aria-label="Edit"
                >
                  <Pencil className={isMobileSheet ? "w-4 h-4" : "w-3 h-3"} /> Edit
                </button>
              )}
              {onDelete && (
                <button
                  onClick={() => {
                    onDelete(popover.entry.id);
                    setPopover(null);
                  }}
                  className={
                    isMobileSheet
                      ? "flex-1 flex items-center justify-center gap-2 py-3 text-red-500 hover:text-red-700 font-medium cursor-pointer rounded-xl border border-red-100 hover:bg-red-50"
                      : "flex items-center gap-1 text-red-500 hover:text-red-700 font-medium cursor-pointer"
                  }
                  aria-label="Delete"
                >
                  <Trash2 className={isMobileSheet ? "w-4 h-4" : "w-3 h-3"} /> Delete
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

interface PopoverState {
  entry: LeaveEntry;
  top: number;
  left: number;
}

interface CalendarViewProps {
  user: PublicUser;
  bankHolidays: BankHolidayEntry[];
  isOwnProfile?: boolean;
  onAdd?: (date?: string) => void;
  onEdit?: (entry: LeaveEntry) => void;
  onDelete?: (id: string) => void;
}
