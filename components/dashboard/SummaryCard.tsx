"use client";
import { useState } from "react";
import { LeaveStatus } from "@/types";
import type { PublicUser } from "@/types";
import { STATUS_DOT } from "@/variables/colours";
import { calcLeaveSummary } from "@/utils/leaveCalc";
import { getHolidayYearBounds, getActiveYearAllowance } from "@/utils/dateHelpers";
import { ChevronDown, ChevronUp } from "lucide-react";

interface SummaryCardProps {
  user: PublicUser;
  bankHolidays: string[];
  isOwnProfile: boolean;
}

// Chart segment colours — match the Tailwind status colours used elsewhere
const DONUT_COLORS = {
  approved: "#86efac",   // green-300
  requested: "#93c5fd",  // blue-300
  planned: "#fde047",    // yellow-300
} as const;

// ---------------------------------------------------------------------------
// Single-ring donut (approved → requested → planned, no remaining segment)
// ---------------------------------------------------------------------------

interface DonutSegment {
  value: number;
  color: string;
}

function buildArcPath(
  cx: number,
  cy: number,
  r: number,
  startAngle: number,
  endAngle: number
): string {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const x1 = cx + r * Math.cos(toRad(startAngle));
  const y1 = cy + r * Math.sin(toRad(startAngle));
  const x2 = cx + r * Math.cos(toRad(endAngle));
  const y2 = cy + r * Math.sin(toRad(endAngle));
  const largeArc = endAngle - startAngle > 180 ? 1 : 0;
  return `M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2}`;
}

function SingleRingDonut({
  segments,
  total,
  centerValue,
}: {
  segments: DonutSegment[];
  total: number;
  centerValue: number;
}) {
  const cx = 50;
  const cy = 50;
  const R = 38;
  const strokeWidth = 14;
  let cumulativeAngle = -90;

  const paths = segments
    .filter((s) => s.value > 0 && total > 0)
    .map((seg, i) => {
      const pct = seg.value / total;
      const angle = pct * 360;
      const startAngle = cumulativeAngle;
      cumulativeAngle += angle;
      const endAngle = cumulativeAngle;

      if (pct >= 1) {
        return (
          <circle
            key={i}
            cx={cx}
            cy={cy}
            r={R}
            fill="none"
            stroke={seg.color}
            strokeWidth={strokeWidth}
          />
        );
      }

      return (
        <path
          key={i}
          fill="none"
          stroke={seg.color}
          strokeWidth={strokeWidth}
          d={buildArcPath(cx, cy, R, startAngle, endAngle)}
        />
      );
    });

  return (
    <svg viewBox="0 0 100 100" className="w-28 h-28 shrink-0">
      {/* Track (gray background ring) */}
      <circle cx={cx} cy={cy} r={R} fill="none" stroke="#f3f4f6" strokeWidth={strokeWidth} />
      {paths}
      {/* Centre: remaining days */}
      <text
        x="50"
        y="46"
        textAnchor="middle"
        dominantBaseline="middle"
        style={{ fontSize: 16, fontWeight: "bold", fill: "#111827" }}
      >
        {centerValue}
      </text>
      <text
        x="50"
        y="58"
        textAnchor="middle"
        dominantBaseline="middle"
        style={{ fontSize: 7, fill: "#9ca3af" }}
      >
        remaining
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

  const remaining = Math.max(0, summary.remaining);

  // Single ring: approved → requested → planned; denominator is total allowance
  // so the gray track naturally shows the remaining unused portion
  const ringSegments: DonutSegment[] = [
    { value: summary.approved, color: DONUT_COLORS.approved },
    { value: summary.requested, color: DONUT_COLORS.requested },
    { value: summary.planned, color: DONUT_COLORS.planned },
  ];

  const statusRows: { label: string; status: LeaveStatus; count: number }[] = [
    { label: "Approved", status: LeaveStatus.Approved, count: summary.approved },
    { label: "Requested", status: LeaveStatus.Requested, count: summary.requested },
    { label: "Planned", status: LeaveStatus.Planned, count: summary.planned },
  ];

  const breakdownRows: { label: string; value: string }[] = [
    { label: "Core Days", value: String(activeYa?.core ?? 0) },
    { label: "Bought", value: `+${activeYa?.bought ?? 0}` },
    { label: "Carried Over", value: `+${activeYa?.carried ?? 0}` },
    { label: "Total", value: String(summary.total) },
    { label: "Used so far", value: `${summary.used} days` },
    { label: "Remaining", value: `${summary.remaining} days` },
  ];

  return (
    <div className="bg-white rounded-2xl shadow p-5">
      {/* Name + badge */}
      <div className="flex items-center justify-between mb-1">
        <h2 className="font-bold text-gray-800">
          {user.profile.firstName} {user.profile.lastName}
        </h2>
        {!isOwnProfile && (
          <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
            Read-only
          </span>
        )}
      </div>

      {/* Holiday year */}
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

      {/* Donut + status key */}
      <div className="flex items-center gap-4 mb-4">
        <SingleRingDonut
          segments={ringSegments}
          total={summary.total || 1}
          centerValue={remaining}
        />
        <div className="flex-1 space-y-1.5">
          {statusRows.map(({ label, status, count }) => (
            <div key={status} className="flex justify-between text-sm">
              <span className="flex items-center gap-1.5 text-gray-800 font-medium">
                <span className={`w-2 h-2 rounded-full ${STATUS_DOT[status]}`} />
                {label}
              </span>
              <span className="text-gray-800 font-semibold">{count} days</span>
            </div>
          ))}
        </div>
      </div>

      {/* Breakdown toggle */}
      <button
        type="button"
        onClick={() => setShowBreakdown((v) => !v)}
        className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 font-medium transition-colors cursor-pointer"
        aria-expanded={showBreakdown}
      >
        {showBreakdown ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        {showBreakdown ? "Hide breakdown" : "View breakdown"}
      </button>

      {/* Breakdown details */}
      {showBreakdown && (
        <div className="mt-3 space-y-1 border-t border-gray-100 pt-3">
          {breakdownRows.map(({ label, value }, i) => {
            const isUsedSoFar = i === breakdownRows.length - 2;
            const isRemaining = i === breakdownRows.length - 1;
            return (
              <div
                key={label}
                className={[
                  "flex justify-between",
                  isRemaining
                    ? "font-bold text-sm text-gray-900 border-t border-gray-100 pt-1 mt-1"
                    : isUsedSoFar
                    ? "font-semibold text-sm text-gray-800"
                    : "text-xs text-gray-600",
                ].join(" ")}
              >
                <span>{label}</span>
                <span
                  className={
                    isRemaining
                      ? summary.remaining < 0
                        ? "text-red-600"
                        : "text-indigo-700"
                      : ""
                  }
                >
                  {value}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
