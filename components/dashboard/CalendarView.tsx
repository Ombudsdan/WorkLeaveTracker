"use client";
import { useState } from "react";
import type { LeaveEntry, PublicUser } from "@/types";
import {
  CALENDAR_COLORS,
  CALENDAR_CELL_BANK_HOLIDAY,
  CALENDAR_CELL_NON_WORKING,
  CALENDAR_CELL_DEFAULT,
} from "@/variables/colours";
import { MONTH_NAMES_SHORT, DAY_NAMES_SHORT } from "@/variables/calendar";
import {
  getDaysInMonth,
  getFirstDayOfMonth,
  getEntryForDate,
  isNonWorkingDay,
  toIsoDate,
} from "@/utils/dateHelpers";

export default function CalendarView({ user, bankHolidays }: CalendarViewProps) {
  const today = new Date();
  const [calendarYear, setCalendarYear] = useState(today.getFullYear());
  const [calendarMonth, setCalendarMonth] = useState(today.getMonth());

  const todayStr = toIsoDate(today);
  const daysInMonth = getDaysInMonth(calendarYear, calendarMonth);
  const firstDay = getFirstDayOfMonth(calendarYear, calendarMonth);

  return (
    <div className="bg-white rounded-2xl shadow p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={prevMonth}
          className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-600"
          aria-label="Previous month"
        >
          ‹
        </button>
        <h3 className="font-bold text-gray-800">
          {MONTH_NAMES_SHORT[calendarMonth]} {calendarYear}
        </h3>
        <button
          onClick={nextMonth}
          className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-600"
          aria-label="Next month"
        >
          ›
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
        {Array.from({ length: daysInMonth }).map((_, index) => {
          const day = index + 1;
          const cell = getCellProps(day);
          return (
            <div
              key={day}
              className={`relative aspect-square flex flex-col items-center justify-center rounded-lg text-xs font-medium transition cursor-default
                ${cell.isToday ? "ring-2 ring-indigo-500" : ""}
                ${cell.cellClass}`}
            >
              <span>{day}</span>
              {cell.isBankHoliday && !cell.entry && (
                <span className="text-purple-400 text-[8px] leading-none">BH</span>
              )}
            </div>
          );
        })}
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
          <span className="w-3 h-3 rounded bg-purple-100" /> Bank Holiday
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded bg-gray-100" /> Non-Working
        </span>
      </div>
    </div>
  );

  function getCellProps(day: number): CalendarCellProps {
    const dateStr = `${calendarYear}-${String(calendarMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const entry = getEntryForDate(dateStr, user.entries);
    const isBankHoliday = bankHolidays.includes(dateStr);
    const isNWD = isNonWorkingDay(dateStr, user.profile.nonWorkingDays);
    const isToday = dateStr === todayStr;
    const cellClass = resolveCellClass(entry, isBankHoliday, isNWD);
    return { dateStr, entry, isBankHoliday, cellClass, isToday };
  }

  function resolveCellClass(
    entry: LeaveEntry | undefined,
    isBankHoliday: boolean,
    isNonWorking: boolean
  ): string {
    if (entry) return CALENDAR_COLORS[entry.status];
    if (isBankHoliday) return CALENDAR_CELL_BANK_HOLIDAY;
    if (isNonWorking) return CALENDAR_CELL_NON_WORKING;
    return CALENDAR_CELL_DEFAULT;
  }

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

interface CalendarCellProps {
  dateStr: string;
  entry: LeaveEntry | undefined;
  isBankHoliday: boolean;
  cellClass: string;
  isToday: boolean;
}

interface CalendarViewProps {
  user: PublicUser;
  bankHolidays: string[];
}
