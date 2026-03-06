"use client";
import type { LeaveEntry, PublicUser, BankHolidayEntry, YearAllowance } from "@/types";
import { LeaveType, LeaveDuration } from "@/types";
import { STATUS_COLORS, SICK_LEAVE_CARD_COLORS } from "@/variables/colours";
import { countEntryDays, getEntryDuration, formatYearWindow } from "@/utils/dateHelpers";
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

/** Find the YearAllowance whose window contains the given ISO date string */
function getAllowanceForDate(date: string, allowances: YearAllowance[]): YearAllowance | null {
  const d = new Date(date);
  for (const ya of allowances) {
    const sm = ya.holidayStartMonth ?? 1;
    const start = new Date(ya.year, sm - 1, 1);
    const end = new Date(ya.year + 1, sm - 1, 1); // exclusive upper bound
    if (d >= start && d < end) return ya;
  }
  return null;
}

/** Group a sorted array of entries by their leave-window year allowance. */
function groupByWindow(
  entries: LeaveEntry[],
  allowances: YearAllowance[]
): Array<{ ya: YearAllowance | null; key: string; entries: LeaveEntry[] }> {
  const groups: Array<{ ya: YearAllowance | null; key: string; entries: LeaveEntry[] }> = [];
  for (const entry of entries) {
    const ya = getAllowanceForDate(entry.startDate, allowances);
    const key = ya ? String(ya.year) : "unknown";
    const last = groups[groups.length - 1];
    if (last && last.key === key) {
      last.entries.push(entry);
    } else {
      groups.push({ ya, key, entries: [entry] });
    }
  }
  return groups;
}

export default function LeaveList({
  user,
  bankHolidays,
  isOwnProfile,
  onEdit,
  onDelete,
}: LeaveListProps) {
  const bankHolidayDates = bankHolidays.map((bh) => bh.date);
  const today = new Date().toISOString().slice(0, 10);
  // Upcoming Leave = entries that are in-progress (started but end hasn't passed)
  // or entirely in the future. Past entries (endDate < today) are excluded.
  const upcoming = user.entries.filter((e) => e.endDate >= today);
  const sorted = [...upcoming].sort((a, b) => a.startDate.localeCompare(b.startDate));

  const title = isOwnProfile ? "Upcoming Leave" : `${user.profile.firstName}\u2019s Leave`;

  const emptyMessage = isOwnProfile ? "No upcoming leave." : "No upcoming leave.";

  return (
    <div className="bg-white rounded-2xl shadow p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-gray-700 text-sm">{title}</h3>
      </div>

      {sorted.length === 0 ? (
        <p className="text-xs text-gray-400">{emptyMessage}</p>
      ) : (
        <div>
          {groupByWindow(sorted, user.yearAllowances).map((group, groupIdx) => (
            <div key={group.key}>
              {groupIdx > 0 && <hr className="border-gray-100 my-3" />}
              <p className="text-xs text-gray-400 mb-2">
                {group.ya ? formatYearWindow(group.ya) : "–"}
              </p>
              <div className="space-y-2">
                {group.entries.map((entry) => {
                  const dur = getEntryDuration(entry);
                  const isHalf = dur !== LeaveDuration.Full;
                  const periodLabel =
                    dur === LeaveDuration.HalfMorning
                      ? "AM"
                      : dur === LeaveDuration.HalfAfternoon
                        ? "PM"
                        : "";
                  const days = countEntryDays(entry, user.profile.nonWorkingDays, bankHolidayDates);
                  const daysLabel = isHalf ? `Half Day ${periodLabel}` : `${days}d`;
                  const isSick = entry.type === LeaveType.Sick;
                  const statusLabel = isSick
                    ? "Sick"
                    : entry.status.charAt(0).toUpperCase() + entry.status.slice(1);
                  const cardClass = isSick ? SICK_LEAVE_CARD_COLORS : STATUS_COLORS[entry.status];
                  const baseNote = entry.notes ?? "–";
                  const noteText =
                    isHalf && entry.notes ? `${entry.notes} (${periodLabel})` : baseNote;
                  return (
                    <div
                      key={entry.id}
                      className={`border rounded-lg p-3 sm:p-2 text-sm sm:text-xs ${cardClass}`}
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
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
