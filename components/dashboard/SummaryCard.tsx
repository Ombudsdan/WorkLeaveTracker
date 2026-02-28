"use client";
import { LeaveStatus } from "@/types";
import type { PublicUser } from "@/types";
import { STATUS_DOT } from "@/variables/colours";
import { calcLeaveSummary } from "@/utils/leaveCalc";
import { getHolidayYearBounds } from "@/utils/dateHelpers";

interface SummaryCardProps {
  user: PublicUser;
  bankHolidays: string[];
  isOwnProfile: boolean;
}

export default function SummaryCard({ user, bankHolidays, isOwnProfile }: SummaryCardProps) {
  const summary = calcLeaveSummary(user, bankHolidays);
  const { start: hyStart, end: hyEnd } = getHolidayYearBounds(user.profile.holidayStartMonth);

  const statusRows: { label: string; status: LeaveStatus; count: number }[] = [
    { label: "Approved", status: LeaveStatus.Approved, count: summary.approved },
    { label: "Requested", status: LeaveStatus.Requested, count: summary.requested },
    { label: "Planned", status: LeaveStatus.Planned, count: summary.planned },
  ];

  return (
    <div className="bg-white rounded-2xl shadow p-5">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-bold text-gray-800">
          {user.profile.firstName} {user.profile.lastName}
        </h2>
        {!isOwnProfile && (
          <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
            Read-only
          </span>
        )}
      </div>

      <p className="text-xs text-gray-400 mb-4">
        Holiday year:{" "}
        {hyStart.toLocaleDateString("en-GB", {
          day: "numeric",
          month: "short",
          year: "numeric",
        })}{" "}
        –{" "}
        {hyEnd.toLocaleDateString("en-GB", {
          day: "numeric",
          month: "short",
          year: "numeric",
        })}
      </p>

      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Total Allowance</span>
          <span className="font-semibold">{summary.total} days</span>
        </div>

        <div className="h-px bg-gray-100" />

        {statusRows.map(({ label, status, count }) => (
          <div key={status} className="flex justify-between text-sm">
            <span className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${STATUS_DOT[status]}`} />
              {label}
            </span>
            <span>{count} days</span>
          </div>
        ))}

        <div className="h-px bg-gray-100" />

        <div className="flex justify-between text-sm font-semibold">
          <span>Used So Far</span>
          <span>{summary.used} days</span>
        </div>
        <div className="flex justify-between text-sm font-bold">
          <span className="text-indigo-700">Remaining</span>
          <span className={summary.remaining < 0 ? "text-red-600" : "text-indigo-700"}>
            {summary.remaining} days
          </span>
        </div>
      </div>

      <div className="mt-4 bg-gray-100 rounded-full h-2">
        <div
          className="bg-indigo-500 rounded-full h-2 transition-all"
          style={{
            width: `${Math.min(100, (summary.used / (summary.total || 1)) * 100)}%`,
          }}
        />
      </div>
      <p className="text-xs text-gray-400 mt-1 text-right">
        {summary.total > 0 ? Math.round((summary.used / summary.total) * 100) : 0}% used
      </p>
    </div>
  );
}
