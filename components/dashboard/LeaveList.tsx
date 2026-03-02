"use client";
import type { LeaveEntry, PublicUser, BankHolidayEntry } from "@/types";
import { LeaveType, LeaveDuration } from "@/types";
import { STATUS_COLORS, SICK_LEAVE_CARD_COLORS } from "@/variables/colours";
import { countEntryDays, getEntryDuration } from "@/utils/dateHelpers";
import { Pencil, Trash2 } from "lucide-react";

interface LeaveListProps {
  user: PublicUser;
  bankHolidays: BankHolidayEntry[];
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

export default function LeaveList({
  user,
  bankHolidays,
  isOwnProfile,
  onEdit,
  onDelete,
}: LeaveListProps) {
  const bankHolidayDates = bankHolidays.map((bh) => bh.date);
  const sorted = [...user.entries].sort((a, b) => a.startDate.localeCompare(b.startDate));

  const title = isOwnProfile ? "My Leave" : `${user.profile.firstName}\u2019s Leave`;

  const emptyMessage = isOwnProfile ? "No leave entries yet." : "No leave entries.";

  return (
    <div className="bg-white rounded-2xl shadow p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-gray-700 text-sm">{title}</h3>
      </div>

      {sorted.length === 0 ? (
        <p className="text-xs text-gray-400">{emptyMessage}</p>
      ) : (
        <div className="space-y-2">
          {sorted.map((entry) => {
            const dur = getEntryDuration(entry);
            const isHalf = dur !== LeaveDuration.Full;
            const periodLabel =
              dur === LeaveDuration.HalfMorning ? "AM" :
              dur === LeaveDuration.HalfAfternoon ? "PM" : "";
            const days = countEntryDays(entry, user.profile.nonWorkingDays, bankHolidayDates);
            const daysLabel = isHalf ? `0.5d ${periodLabel}` : `${days}d`;
            const isSick = entry.type === LeaveType.Sick;
            const statusLabel = isSick
              ? "Sick"
              : entry.status.charAt(0).toUpperCase() + entry.status.slice(1);
            const cardClass = isSick ? SICK_LEAVE_CARD_COLORS : STATUS_COLORS[entry.status];
            const baseNote = entry.notes ?? "–";
            const noteText =
              isHalf && entry.notes
                ? `${entry.notes} (${periodLabel})`
                : baseNote;
            return (
              <div
                key={entry.id}
                className={`border rounded-lg p-2 text-xs ${cardClass}`}
              >
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
                    <div className="flex gap-1.5 shrink-0">
                      <button
                        onClick={() => onEdit(entry)}
                        aria-label="Edit"
                        className="hover:opacity-70 cursor-pointer"
                      >
                        <Pencil size={12} />
                      </button>
                      <button
                        onClick={() => onDelete(entry.id)}
                        aria-label="Delete"
                        className="hover:opacity-70 text-red-600 cursor-pointer"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
