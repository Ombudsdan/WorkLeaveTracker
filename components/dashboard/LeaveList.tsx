"use client";
import type { LeaveEntry, PublicUser } from "@/types";
import { STATUS_COLORS } from "@/variables/colours";
import { countWorkingDays } from "@/utils/dateHelpers";

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
  const sorted = [...user.entries].sort((a, b) =>
    a.startDate.localeCompare(b.startDate)
  );

  const title = isOwnProfile
    ? "My Leave"
    : `${user.profile.firstName}\u2019s Leave`;

  const emptyMessage = isOwnProfile
    ? "No leave entries yet."
    : "No leave entries.";

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
            return (
              <div
                key={entry.id}
                className={`border rounded-lg p-2 text-xs ${STATUS_COLORS[entry.status]}`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium">
                    {formatDateRange(entry.startDate, entry.endDate)}
                  </span>
                  <span>{days}d</span>
                </div>
                <div className="flex items-center justify-between mt-1">
                  <span className="capitalize">{entry.status}</span>
                  {isOwnProfile && (
                    <div className="flex gap-1">
                      <button
                        onClick={() => onEdit(entry)}
                        className="underline"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => onDelete(entry.id)}
                        className="underline text-red-600"
                      >
                        Del
                      </button>
                    </div>
                  )}
                </div>
                {entry.notes && (
                  <p className="mt-0.5 text-gray-500">{entry.notes}</p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
