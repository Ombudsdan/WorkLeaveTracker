"use client";
import type { LeaveEntry, BankHolidayEntry, YearAllowance } from "@/types";
import { LeaveType, LeaveDuration } from "@/types";
import { STATUS_COLORS, SICK_LEAVE_CARD_COLORS } from "@/variables/colours";
import { countEntryDays, getEntryDuration } from "@/utils/dateHelpers";
import { Pencil, Trash2 } from "lucide-react";

export interface LeaveCardProps {
  entry: LeaveEntry;
  /** The user's non-working days (0=Sun … 6=Sat) */
  nonWorkingDays: number[];
  bankHolidays: BankHolidayEntry[];
  /** When true, shows edit and delete action buttons */
  isOwnProfile: boolean;
  onEdit: (entry: LeaveEntry) => void;
  onDelete: (id: string) => void;
}

function formatDateRange(startDate: string, endDate: string): string {
  const opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short" };
  const start = new Date(startDate).toLocaleDateString("en-GB", opts);
  if (startDate === endDate) return start;
  const end = new Date(endDate).toLocaleDateString("en-GB", opts);
  return `${start} – ${end}`;
}

/**
 * A coloured card representing a single leave entry.
 * Background and text colours are driven by the entry status; sick entries
 * always render with the sick-leave red palette.
 */
export default function LeaveCard({
  entry,
  nonWorkingDays,
  bankHolidays,
  isOwnProfile,
  onEdit,
  onDelete,
}: LeaveCardProps) {
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
    <div className={`border rounded-lg p-3 sm:p-2 text-sm sm:text-xs ${cardClass}`}>
      {/* Line 1: Reason (left) | Status (right) */}
      <div className="flex items-center justify-between">
        <span className="font-medium truncate mr-2">{noteText}</span>
        <span className="shrink-0">{statusLabel}</span>
      </div>
      {/* Line 2: Period + (days) (left) | action icons (right) */}
      <div className="flex items-center justify-between mt-1">
        <span>
          {formatDateRange(entry.startDate, entry.endDate)}{" "}
          <span className="opacity-70">({daysLabel})</span>
        </span>
        {isOwnProfile && (
          <div className="flex gap-1 shrink-0">
            <button
              onClick={() => onEdit(entry)}
              aria-label="Edit"
              className="p-2 sm:p-0.5 hover:opacity-70 cursor-pointer rounded"
            >
              <Pencil className="w-4 h-4 sm:w-3 sm:h-3" />
            </button>
            <button
              onClick={() => onDelete(entry.id)}
              aria-label="Delete"
              className="p-2 sm:p-0.5 hover:opacity-70 text-red-600 cursor-pointer rounded"
            >
              <Trash2 className="w-4 h-4 sm:w-3 sm:h-3" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
