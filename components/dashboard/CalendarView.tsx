"use client";
import { useState } from "react";
import type { PublicUser } from "@/types";
import { CALENDAR_COLORS } from "@/variables/colours";
import { MONTH_NAMES_SHORT, DAY_NAMES_SHORT } from "@/variables/calendar";
import {
  getDaysInMonth,
  getFirstDayOfMonth,
  getEntryForDate,
  isNonWorkingDay,
  toIsoDate,
} from "@/utils/dateHelpers";

interface CalendarViewProps {
  user: PublicUser;
  bankHolidays: string[];
}

export default function CalendarView({ user, bankHolidays }: CalendarViewProps) {
  const today = new Date();
  const [calendarYear, setCalendarYear] = useState(today.getFullYear());
  const [calendarMonth, setCalendarMonth] = useState(today.getMonth());

  const todayStr = toIsoDate(today);
  const daysInMonth = getDaysInMonth(calendarYear, calendarMonth);
  const firstDay = getFirstDayOfMonth(calendarYear, calendarMonth);

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
        {DAY_NAMES_SHORT.map((d) => (
          <div
            key={d}
            className="text-center text-xs font-medium text-gray-400 py-1"
          >
            {d}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-0.5">
        {Array.from({ length: firstDay }).map((_, i) => (
          <div key={`empty-${i}`} />
        ))}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1;
          const dateStr = `${calendarYear}-${String(calendarMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
          const entry = getEntryForDate(dateStr, user.entries);
          const isBH = bankHolidays.includes(dateStr);
          const isNWD = isNonWorkingDay(dateStr, user.profile.nonWorkingDays);
          const isToday = dateStr === todayStr;

          let cellClass = "hover:bg-gray-50 text-gray-700";
          if (entry) {
            cellClass = CALENDAR_COLORS[entry.status];
          } else if (isBH) {
            cellClass = "bg-purple-100 text-purple-700";
          } else if (isNWD) {
            cellClass = "bg-gray-100 text-gray-400";
          }

          return (
            <div
              key={day}
              className={`relative aspect-square flex flex-col items-center justify-center rounded-lg text-xs font-medium transition cursor-default
                ${isToday ? "ring-2 ring-indigo-500" : ""}
                ${cellClass}`}
            >
              <span>{day}</span>
              {isBH && !entry && (
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
}
