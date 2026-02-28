"use client";
import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useFormValidation } from "@/contexts/FormValidationContext";
import { MONTH_NAMES_SHORT, DAY_NAMES_SHORT } from "@/variables/calendar";
import { getDaysInMonth, getFirstDayOfMonth, toIsoDate } from "@/utils/dateHelpers";

interface DateRangePickerProps {
  id: string;
  startDate: string;
  endDate: string;
  onStartChange: (date: string) => void;
  onEndChange: (date: string) => void;
}

export default function DateRangePicker({
  id,
  startDate,
  endDate,
  onStartChange,
  onEndChange,
}: DateRangePickerProps) {
  const { getError, setError, clearError, registerValidator } = useFormValidation();
  const error = getError(id);

  const today = new Date();
  const todayStr = toIsoDate(today);

  const [calYear, setCalYear] = useState(() =>
    startDate ? parseInt(startDate.split("-")[0]) : today.getFullYear()
  );
  const [calMonth, setCalMonth] = useState(() =>
    startDate ? parseInt(startDate.split("-")[1]) - 1 : today.getMonth()
  );

  const daysInMonth = getDaysInMonth(calYear, calMonth);
  const firstDay = getFirstDayOfMonth(calYear, calMonth);

  /** True when start is chosen but end is not yet — next click sets end */
  const isPickingEnd = !!startDate && !endDate;

  const validateRef = useRef<() => boolean>(() => true);
  validateRef.current = () => validate(startDate, endDate);

  useEffect(() => {
    return registerValidator(id, () => validateRef.current());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  function validate(start: string, end: string): boolean {
    if (!start) {
      setError(id, "Please select a start date");
      return false;
    }
    if (!end) {
      setError(id, "Please select an end date");
      return false;
    }
    if (end < start) {
      setError(id, "End date must be on or after start date");
      return false;
    }
    clearError(id);
    return true;
  }

  function handleDayClick(dateStr: string) {
    if (!startDate || (startDate && endDate)) {
      // Start a fresh selection
      onStartChange(dateStr);
      onEndChange("");
      clearError(id);
    } else {
      // Picking end date — only dates >= startDate are enabled, so dateStr >= startDate
      onEndChange(dateStr);
      clearError(id);
    }
  }

  return (
    <div>
      {/* Selected range summary */}
      <div className="flex gap-4 mb-2 text-sm">
        <div>
          <span className="text-gray-500">From: </span>
          <span className={startDate ? "font-medium text-gray-900" : "text-gray-400"}>
            {startDate || "—"}
          </span>
        </div>
        <div>
          <span className="text-gray-500">To: </span>
          <span className={endDate ? "font-medium text-gray-900" : "text-gray-400"}>
            {endDate || "—"}
          </span>
        </div>
      </div>

      {/* Calendar */}
      <div className={`border rounded-lg p-3 ${error ? "border-red-400" : "border-gray-200"}`}>
        {/* Month navigation */}
        <div className="flex items-center justify-between mb-2">
          <button
            type="button"
            onClick={prevMonth}
            aria-label="Previous month"
            className="p-1 rounded hover:bg-gray-100 text-gray-600"
          >
            <ChevronLeft size={14} />
          </button>
          <span className="text-sm font-medium text-gray-700">
            {MONTH_NAMES_SHORT[calMonth]} {calYear}
          </span>
          <button
            type="button"
            onClick={nextMonth}
            aria-label="Next month"
            className="p-1 rounded hover:bg-gray-100 text-gray-600"
          >
            <ChevronRight size={14} />
          </button>
        </div>

        {/* Day-of-week headers */}
        <div className="grid grid-cols-7 mb-1">
          {DAY_NAMES_SHORT.map((day) => (
            <div key={day} className="text-center text-xs text-gray-400 py-0.5">
              {day}
            </div>
          ))}
        </div>

        {/* Day cells */}
        <div className="grid grid-cols-7 gap-0.5">
          {Array.from({ length: firstDay }).map((_, i) => (
            <div key={`pad-${i}`} />
          ))}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const dateStr = `${calYear}-${String(calMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
            const isStart = dateStr === startDate;
            const isEnd = dateStr === endDate;
            const inRange = !!(startDate && endDate && dateStr > startDate && dateStr < endDate);
            const isDisabled = isPickingEnd && dateStr < startDate;
            const isToday = dateStr === todayStr;

            return (
              <button
                key={day}
                type="button"
                disabled={!!isDisabled}
                onClick={() => handleDayClick(dateStr)}
                aria-label={dateStr}
                className={[
                  "aspect-square flex items-center justify-center rounded text-xs transition",
                  isStart || isEnd ? "bg-indigo-600 text-white font-bold" : "",
                  inRange ? "bg-indigo-100 text-indigo-800" : "",
                  !isStart && !isEnd && !inRange && !isDisabled
                    ? "hover:bg-gray-100 text-gray-700 cursor-pointer"
                    : "",
                  isDisabled ? "text-gray-300 cursor-not-allowed" : "",
                  isToday && !isStart && !isEnd ? "ring-1 ring-inset ring-indigo-400" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                {day}
              </button>
            );
          })}
        </div>
      </div>

      {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
      {isPickingEnd && !error && (
        <p className="text-indigo-600 text-xs mt-1">Now select an end date</p>
      )}
    </div>
  );

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
}
