"use client";
import type { LeaveEntry, PublicUser } from "@/types";
import { STATUS_COLORS } from "@/variables/colours";
import { countWorkingDays } from "@/utils/dateHelpers";
import { Pencil, Trash2 } from "lucide-react";

interface LeaveListProps {
  user: PublicUser;
  bankHolidays: string[];
  isOwnProfile: boolean;
  onAdd: () => void;
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
  onAdd,
  onEdit,
  onDelete,
}: LeaveListProps) {
  const sorted = [...user.entries].sort((a, b) => a.startDate.localeCompare(b.startDate));

  const title = isOwnProfile ? "My Leave" : `${user.profile.firstName}\u2019s Leave`;

  const emptyMessage = isOwnProfile ? "No leave entries yet." : "No leave entries.";

  return (
    <div className="bg-white rounded-2xl shadow p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-gray-700 text-sm">{title}</h3>
        {isOwnProfile && (
          <button
            onClick={onAdd}
            className="bg-indigo-600 text-white text-xs px-3 py-1 rounded-lg hover:bg-indigo-700 transition"
          >
            + Add
          </button>
        )}
      </div>

      {sorted.length === 0 ? (
        <p className="text-xs text-gray-400">{emptyMessage}</p>
      ) : (
        <div className="space-y-2">
          {sorted.map((entry) => {
            const days = countWorkingDays(
              entry.startDate,
              entry.endDate,
              user.profile.nonWorkingDays,
              bankHolidays
            );
            const statusLabel =
              entry.status.charAt(0).toUpperCase() + entry.status.slice(1);
            const noteText = entry.notes ?? "–";
            return (
              <div
                key={entry.id}
                className={`border rounded-lg p-2 text-xs ${STATUS_COLORS[entry.status]}`}
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
                    <span className="opacity-70">({days}d)</span>
                  </span>
                  {isOwnProfile && (
                    <div className="flex gap-1.5 shrink-0">
                      <button
                        onClick={() => onEdit(entry)}
                        aria-label="Edit"
                        className="hover:opacity-70"
                      >
                        <Pencil size={12} />
                      </button>
                      <button
                        onClick={() => onDelete(entry.id)}
                        aria-label="Delete"
                        className="hover:opacity-70 text-red-600"
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
