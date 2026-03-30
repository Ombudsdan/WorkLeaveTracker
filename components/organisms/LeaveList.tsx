"use client";
import type { LeaveEntry, PublicUser, BankHolidayEntry, YearAllowance } from "@/types";
import { formatYearWindow } from "@/utils/dateHelpers";
import LeaveCard from "@/components/molecules/LeaveCard";

interface LeaveListProps {
  user: PublicUser;
  bankHolidays: BankHolidayEntry[];
  isOwnProfile: boolean;
  onEdit?: (entry: LeaveEntry) => void;
  onDelete?: (id: string) => void;
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
                {group.entries.map((entry) => (
                  <LeaveCard
                    key={entry.id}
                    entry={entry}
                    nonWorkingDays={user.profile.nonWorkingDays}
                    bankHolidays={bankHolidays}
                    isOwnProfile={isOwnProfile}
                    onEdit={onEdit}
                    onDelete={onDelete}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
