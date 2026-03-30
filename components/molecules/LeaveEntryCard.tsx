"use client";
import type { LeaveEntry, BankHolidayEntry } from "@/types";
import { LeaveType, LeaveDuration } from "@/types";
import { STATUS_COLORS, SICK_LEAVE_CARD_COLORS } from "@/variables/colours";
import { countEntryDays, getEntryDuration } from "@/utils/dateHelpers";

export interface LeaveEntryCardProps {
  entry: LeaveEntry;
  /** The user's non-working days (0 = Sun … 6 = Sat). */
  nonWorkingDays: number[];
  bankHolidays: BankHolidayEntry[];
}

function formatDateRange(startDate: string, endDate: string): string {
  const opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short" };
  const start = new Date(startDate).toLocaleDateString("en-GB", opts);
  if (startDate === endDate) return start;
  const end = new Date(endDate).toLocaleDateString("en-GB", opts);
  return `${start} – ${end}`;
}

/**
 * A compact read-only card showing a single past leave entry.
 * Coloured by status (sick entries always red).
 * Displays: notes or "–", status/sick label, date range, days count.
 */
export default function LeaveEntryCard({
  entry,
  nonWorkingDays,
  bankHolidays,
}: LeaveEntryCardProps) {
  const bankHolidayDates = bankHolidays.map((bh) => bh.date);
  const dur = getEntryDuration(entry);
  const isHalf = dur !== LeaveDuration.Full;
  const periodLabel =
    dur === LeaveDuration.HalfMorning ? "AM" : dur === LeaveDuration.HalfAfternoon ? "PM" : "";
  const days = countEntryDays(entry, nonWorkingDays, bankHolidayDates);
  const daysLabel = isHalf ? `Half Day ${periodLabel}` : `${days}d`;
  const isSick = entry.type === LeaveType.Sick;
  const statusLabel = isSick
    ? "Sick"
    : entry.status.charAt(0).toUpperCase() + entry.status.slice(1);
  const cardClass = isSick ? SICK_LEAVE_CARD_COLORS : STATUS_COLORS[entry.status];
  const baseNote = entry.notes ?? "–";
  const noteText = isHalf && entry.notes ? `${entry.notes} (${periodLabel})` : baseNote;

  return (
    <div
      data-testid="leave-entry-card"
      className={`border rounded-lg p-2 text-xs ${cardClass}`}
    >
      <div className="flex items-center justify-between">
        <span className="font-medium truncate mr-2">{noteText}</span>
        <span className="shrink-0">{statusLabel}</span>
      </div>
      <div className="mt-1 text-gray-600">
        {formatDateRange(entry.startDate, entry.endDate)}{" "}
        <span className="opacity-70">({daysLabel})</span>
      </div>
    </div>
  );
}
