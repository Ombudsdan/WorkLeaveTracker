"use client";
import { useState, useEffect, useRef } from "react";
import type { LeaveEntry, PublicUser } from "@/types";
import {
  CALENDAR_CELL_BANK_HOLIDAY,
  CALENDAR_CELL_NON_WORKING,
  CALENDAR_CELL_DEFAULT,
  STATUS_COLORS,
  getCalendarEntryClass,
} from "@/variables/colours";
import { MONTH_NAMES_SHORT, DAY_NAMES_SHORT } from "@/variables/calendar";
import {
  getDaysInMonth,
  getFirstDayOfMonth,
  getEntriesForDate,
  isNonWorkingDay,
  toIsoDate,
  countEntryDays,
} from "@/utils/dateHelpers";
import { ChevronLeft, ChevronRight, Plus, Pencil, Trash2, X } from "lucide-react";

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

function getNoteLabel(entry: LeaveEntry): string {
  const base = entry.notes ?? "";
  if (!entry.halfDay) return base;
  const suffix = entry.halfDayPeriod === "am" ? " (AM)" : " (PM)";
  return base ? `${base}${suffix}` : suffix.trim();
}

function getCellLayout(entries: LeaveEntry[]): CellLayout {
  if (entries.length === 0) return { kind: "empty" };

  if (entries.length === 1) {
    const e = entries[0];
    if (!e.halfDay) return { kind: "full", entry: e };
    return e.halfDayPeriod === "am" ? { kind: "top", entry: e } : { kind: "bottom", entry: e };
  }

  // Two entries — order: AM on top, PM on bottom (for half-days)
  const [a, b] = entries;
  const aIsAm = a.halfDay && a.halfDayPeriod === "am";
  const bIsAm = b.halfDay && b.halfDayPeriod === "am";
  const aIsPm = a.halfDay && a.halfDayPeriod === "pm";

  let top: LeaveEntry;
  let bottom: LeaveEntry;

  if (aIsAm && !bIsAm) {
    top = a; bottom = b;
  } else if (bIsAm && !aIsAm) {
    top = b; bottom = a;
  } else if (aIsPm) {
    top = b; bottom = a;
  } else {
    top = a; bottom = b;
  }

  return { kind: "split", top, bottom };
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
  const calendarRef = useRef<HTMLDivElement>(null);

  const todayStr = toIsoDate(today);
  const daysInMonth = getDaysInMonth(calendarYear, calendarMonth);
  const firstDay = getFirstDayOfMonth(calendarYear, calendarMonth);

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
    const isBankHoliday = bankHolidays.includes(dateStr);
    const isNWD = isNonWorkingDay(dateStr, user.profile.nonWorkingDays);
    const isToday = dateStr === todayStr;
    const layout = getCellLayout(entries);

    const defaultClass =
      entries.length === 0
        ? isBankHoliday
          ? CALENDAR_CELL_BANK_HOLIDAY
          : isNWD
          ? CALENDAR_CELL_NON_WORKING
          : CALENDAR_CELL_DEFAULT
        : "";

    const todayRing = isToday ? "ring-2 ring-indigo-500" : "";

    if (layout.kind === "empty") {
      return (
        <div
          key={day}
          className={`relative aspect-square rounded-lg overflow-hidden text-xs font-medium transition cursor-default ${defaultClass} ${todayRing}`}
        >
          <div className="h-full flex flex-col items-center justify-center">
            <span>{day}</span>
            {isBankHoliday && (
              <span className="text-purple-400 text-[8px] leading-none">BH</span>
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
                <span className="text-[7px] leading-tight text-center truncate w-full">{label}</span>
              )}
            </div>
            <div className={`flex-1 flex items-center justify-center ${defaultClass || CALENDAR_CELL_DEFAULT}`} />
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
            <div className={`flex-1 flex items-center justify-center ${defaultClass || CALENDAR_CELL_DEFAULT}`} />
            <div
              className={`flex-1 flex items-center justify-center overflow-hidden px-0.5 ${getCalendarEntryClass(e)}`}
              onClick={(ev) => handleCellClick(e, ev.currentTarget as HTMLElement)}
            >
              {label && (
                <span className="text-[7px] leading-tight text-center truncate w-full">{label}</span>
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
              <span className="text-[7px] leading-tight text-center truncate w-full">{topLabel}</span>
            )}
          </div>
          <div
            className={`flex-1 flex items-center justify-center overflow-hidden px-0.5 cursor-pointer ${getCalendarEntryClass(botEntry)}`}
            onClick={(e) => handleCellClick(botEntry, e.currentTarget as HTMLElement)}
          >
            {botLabel && (
              <span className="text-[7px] leading-tight text-center truncate w-full">{botLabel}</span>
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
          className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-600"
          aria-label="Previous month"
        >
          <ChevronLeft size={18} />
        </button>
        <h3 className="font-bold text-gray-800">
          {MONTH_NAMES_SHORT[calendarMonth]} {calendarYear}
        </h3>
        <div className="flex items-center gap-2">
          {isOwnProfile && onAdd && (
            <button
              onClick={onAdd}
              className="flex items-center gap-1.5 bg-indigo-600 text-white text-sm px-4 py-1.5 rounded-lg hover:bg-indigo-700 transition font-medium"
            >
              <Plus size={14} />
              Add Leave
            </button>
          )}
          <button
            onClick={nextMonth}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-600"
            aria-label="Next month"
          >
            <ChevronRight size={18} />
          </button>
        </div>
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
          <span className="w-3 h-3 rounded bg-green-200" /> Approved
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded bg-blue-200" /> Requested
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded bg-yellow-200" /> Planned
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded bg-red-200" /> Sick
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded bg-purple-100" /> Bank Holiday
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded bg-gray-100" /> Non-Working
        </span>
      </div>

      {/* Leave entry popover */}
      {popover && (
        <div
          className="absolute z-30 bg-white rounded-xl shadow-xl border border-gray-200 p-3 w-52 text-xs"
          style={{ top: popover.top, left: popover.left }}
          role="tooltip"
        >
          <button
            onClick={() => setPopover(null)}
            className="absolute top-2 right-2 text-gray-400 hover:text-gray-600"
            aria-label="Close"
          >
            <X size={12} />
          </button>

          {/* Status badge */}
          <div className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold mb-2 border ${STATUS_COLORS[popover.entry.status]}`}>
            {popover.entry.status.charAt(0).toUpperCase() + popover.entry.status.slice(1)}
          </div>

          <p className="font-medium text-gray-800 mb-1 pr-4">
            {getNoteLabel(popover.entry) || "No description"}
          </p>

          <p className="text-gray-500 mb-1">
            {formatDateRange(popover.entry.startDate, popover.entry.endDate)}
            {popover.entry.halfDay && (
              <span className="ml-1 text-indigo-600 font-medium">
                ({popover.entry.halfDayPeriod?.toUpperCase()})
              </span>
            )}
          </p>

          <p className="text-gray-500 mb-2">
            {countEntryDays(popover.entry, user.profile.nonWorkingDays, bankHolidays)}{" "}
            working day(s)
          </p>

          {isOwnProfile && (onEdit || onDelete) && (
            <div className="flex gap-2 pt-2 border-t border-gray-100">
              {onEdit && (
                <button
                  onClick={() => { onEdit(popover.entry); setPopover(null); }}
                  className="flex items-center gap-1 text-indigo-600 hover:text-indigo-800 font-medium"
                  aria-label="Edit"
                >
                  <Pencil size={11} /> Edit
                </button>
              )}
              {onDelete && (
                <button
                  onClick={() => { onDelete(popover.entry.id); setPopover(null); }}
                  className="flex items-center gap-1 text-red-500 hover:text-red-700 font-medium"
                  aria-label="Delete"
                >
                  <Trash2 size={11} /> Delete
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );

  function prevMonth() {
    if (calendarMonth === 0) {
      setCalendarMonth(11);
      setCalendarYear((year) => year - 1);
    } else {
      setCalendarMonth((month) => month - 1);
    }
  }

  function nextMonth() {
    if (calendarMonth === 11) {
      setCalendarMonth(0);
      setCalendarYear((year) => year + 1);
    } else {
      setCalendarMonth((month) => month + 1);
    }
  }
}

interface PopoverState {
  entry: LeaveEntry;
  top: number;
  left: number;
}

interface CalendarViewProps {
  user: PublicUser;
  bankHolidays: string[];
  isOwnProfile?: boolean;
  onAdd?: () => void;
  onEdit?: (entry: LeaveEntry) => void;
  onDelete?: (id: string) => void;
}
