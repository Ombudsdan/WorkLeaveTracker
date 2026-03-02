"use client";
import { useState } from "react";
import { LeaveStatus } from "@/types";
import type { PublicUser } from "@/types";
import { STATUS_DOT } from "@/variables/colours";
import { calcLeaveSummary } from "@/utils/leaveCalc";
import { getHolidayYearBounds, getActiveYearAllowance } from "@/utils/dateHelpers";
import { X } from "lucide-react";

interface SummaryCardProps {
  user: PublicUser;
  bankHolidays: string[];
  isOwnProfile: boolean;
}

// ---------------------------------------------------------------------------
// Donut chart — pure SVG, no external dependencies
// ---------------------------------------------------------------------------

interface DonutSegment {
  value: number;
  color: string;
  label: string;
}

function DonutChart({ segments, total }: { segments: DonutSegment[]; total: number }) {
  const R = 40;
  const cx = 50;
  const cy = 50;
  const circumference = 2 * Math.PI * R;

  let cumulativeAngle = -90; // start from the top

  const paths = segments
    .filter((s) => s.value > 0 && total > 0)
    .map((seg, i) => {
      const pct = seg.value / total;
      const angle = pct * 360;
      const startRad = (cumulativeAngle * Math.PI) / 180;
      const endRad = ((cumulativeAngle + angle) * Math.PI) / 180;
      cumulativeAngle += angle;

      const x1 = cx + R * Math.cos(startRad);
      const y1 = cy + R * Math.sin(startRad);
      const x2 = cx + R * Math.cos(endRad);
      const y2 = cy + R * Math.sin(endRad);
      const largeArc = angle > 180 ? 1 : 0;

      // Full circle special case
      if (pct >= 1) {
        return (
          <circle key={i} cx={cx} cy={cy} r={R} fill="none" stroke={seg.color} strokeWidth={14} />
        );
      }

      return (
        <path
          key={i}
          fill="none"
          stroke={seg.color}
          strokeWidth={14}
          d={`M ${x1} ${y1} A ${R} ${R} 0 ${largeArc} 1 ${x2} ${y2}`}
        />
      );
    });

  return (
    <svg viewBox="0 0 100 100" className="w-24 h-24">
      {/* Track */}
      <circle cx={cx} cy={cy} r={R} fill="none" stroke="#f3f4f6" strokeWidth={14} />
      {paths}
      {/* Centre text: remaining days */}
      <text
        x={cx}
        y={cy - 4}
        textAnchor="middle"
        dominantBaseline="middle"
        className="text-[11px] font-bold fill-gray-700"
        style={{ fontSize: 13, fontWeight: "bold", fill: "#374151" }}
      >
        {segments.find((s) => s.label === "Remaining")?.value ?? 0}
      </text>
      <text
        x={cx}
        y={cy + 9}
        textAnchor="middle"
        dominantBaseline="middle"
        style={{ fontSize: 7, fill: "#9ca3af" }}
      >
        left
      </text>
    </svg>
  );
}

// ---------------------------------------------------------------------------
// SummaryCard
// ---------------------------------------------------------------------------

export default function SummaryCard({ user, bankHolidays, isOwnProfile }: SummaryCardProps) {
  const [showBreakdown, setShowBreakdown] = useState(false);
  const summary = calcLeaveSummary(user, bankHolidays);
  const activeYa = getActiveYearAllowance(user.yearAllowances);
  const { start: hyStart, end: hyEnd } = getHolidayYearBounds(activeYa?.holidayStartMonth ?? 1);

  const statusRows: { label: string; status: LeaveStatus; count: number }[] = [
    { label: "Approved", status: LeaveStatus.Approved, count: summary.approved },
    { label: "Requested", status: LeaveStatus.Requested, count: summary.requested },
    { label: "Planned", status: LeaveStatus.Planned, count: summary.planned },
  ];

  // Donut segments: approved (green), requested (blue), planned (yellow), remaining (light gray)
  const remaining = Math.max(0, summary.remaining);
  const donutSegments: DonutSegment[] = [
    { value: summary.approved, color: "#86efac", label: "Approved" },   // green-300
    { value: summary.requested, color: "#93c5fd", label: "Requested" }, // blue-300
    { value: summary.planned, color: "#fde047", label: "Planned" },     // yellow-300
    { value: remaining, color: "#e5e7eb", label: "Remaining" },         // gray-200
  ];

  return (
    <div className="bg-white rounded-2xl shadow p-5 relative">
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
        {/* Total Allowance — clickable to open breakdown popover */}
        <button
          type="button"
          onClick={() => setShowBreakdown((v) => !v)}
          className="flex justify-between text-sm w-full hover:bg-gray-50 -mx-1 px-1 py-0.5 rounded transition-colors group"
          aria-expanded={showBreakdown}
          aria-controls="allowance-breakdown"
        >
          <span className="text-gray-600 group-hover:text-indigo-700 transition-colors">
            Total Allowance
          </span>
          <span className="font-semibold text-gray-900 group-hover:text-indigo-700 transition-colors">
            {summary.total} days
            <span className="ml-1 text-gray-400 font-normal text-xs">(tap for breakdown)</span>
          </span>
        </button>

        {/* Inline breakdown popover */}
        {showBreakdown && (
          <div
            id="allowance-breakdown"
            className="bg-gray-50 border border-gray-200 rounded-xl p-3 mt-1"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                Allowance Breakdown
              </span>
              <button
                onClick={() => setShowBreakdown(false)}
                aria-label="Close breakdown"
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={13} />
              </button>
            </div>
            <div className="flex items-center gap-4">
              <DonutChart segments={donutSegments} total={summary.total || 1} />
              <div className="flex-1 space-y-1 text-xs text-gray-600">
                <div className="flex justify-between">
                  <span>Core Days</span>
                  <span>{activeYa?.core ?? 0}</span>
                </div>
                <div className="flex justify-between">
                  <span>Bought</span>
                  <span>+{activeYa?.bought ?? 0}</span>
                </div>
                <div className="flex justify-between">
                  <span>Carried Over</span>
                  <span>+{activeYa?.carried ?? 0}</span>
                </div>
                <div className="flex justify-between font-semibold border-t pt-1 mt-1">
                  <span>Total</span>
                  <span>{summary.total}</span>
                </div>
                <div className="flex items-center gap-1 mt-1 text-[10px] text-gray-400 flex-wrap">
                  <span className="flex items-center gap-0.5"><span className="w-2 h-2 rounded-full bg-green-300 inline-block" /> Approved</span>
                  <span className="flex items-center gap-0.5"><span className="w-2 h-2 rounded-full bg-blue-300 inline-block" /> Requested</span>
                  <span className="flex items-center gap-0.5"><span className="w-2 h-2 rounded-full bg-yellow-300 inline-block" /> Planned</span>
                  <span className="flex items-center gap-0.5"><span className="w-2 h-2 rounded-full bg-gray-200 inline-block" /> Remaining</span>
                </div>
              </div>
            </div>
          </div>
        )}

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
