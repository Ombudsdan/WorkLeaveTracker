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

// Donut chart segment colors
const DONUT_COLORS = {
  approved: "#86efac",   // green-300
  requested: "#93c5fd",  // blue-300
  planned: "#fde047",    // yellow-300
  remaining: "#e5e7eb",  // gray-200
  used: "#6366f1",       // indigo-500 (inner ring used portion)
} as const;

// ---------------------------------------------------------------------------
// Dual-ring donut
// ---------------------------------------------------------------------------

interface DonutSegment {
  value: number;
  color: string;
}

function buildArcPath(
  cx: number,
  cy: number,
  r: number,
  startAngle: number, // degrees
  endAngle: number    // degrees
): string {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const x1 = cx + r * Math.cos(toRad(startAngle));
  const y1 = cy + r * Math.sin(toRad(startAngle));
  const x2 = cx + r * Math.cos(toRad(endAngle));
  const y2 = cy + r * Math.sin(toRad(endAngle));
  const largeArc = endAngle - startAngle > 180 ? 1 : 0;
  return `M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2}`;
}

function RingPaths({
  segments,
  total,
  r,
  strokeWidth,
}: {
  segments: DonutSegment[];
  total: number;
  r: number;
  strokeWidth: number;
}) {
  const cx = 50;
  const cy = 50;
  let cumulativeAngle = -90;

  return (
    <>
      {/* Track */}
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#f3f4f6" strokeWidth={strokeWidth} />
      {segments
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
                r={r}
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
              d={buildArcPath(cx, cy, r, startAngle, endAngle)}
            />
          );
        })}
    </>
  );
}

function DualRingDonut({
  outerSegments,
  innerSegments,
  outerTotal,
  innerTotal,
  centerValue,
}: {
  outerSegments: DonutSegment[];
  innerSegments: DonutSegment[];
  outerTotal: number;
  innerTotal: number;
  centerValue: number;
}) {
  return (
    <svg viewBox="0 0 100 100" className="w-28 h-28 shrink-0">
      {/* Inner ring (used %) — R=22, strokeWidth=9 */}
      <RingPaths
        segments={innerSegments}
        total={innerTotal || 1}
        r={22}
        strokeWidth={9}
      />
      {/* Outer ring (composition) — R=38, strokeWidth=9 */}
      <RingPaths
        segments={outerSegments}
        total={outerTotal || 1}
        r={38}
        strokeWidth={9}
      />
      {/* Center: remaining days */}
      <text
        x="50"
        y="46"
        textAnchor="middle"
        dominantBaseline="middle"
        style={{ fontSize: 14, fontWeight: "bold", fill: "#374151" }}
      >
        {centerValue}
      </text>
      <text
        x="50"
        y="57"
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

  // Outer ring: composition (approved, requested, planned, remaining)
  const outerSegments: DonutSegment[] = [
    { value: summary.approved, color: DONUT_COLORS.approved },
    { value: summary.requested, color: DONUT_COLORS.requested },
    { value: summary.planned, color: DONUT_COLORS.planned },
    { value: remaining, color: DONUT_COLORS.remaining },
  ];

  // Inner ring: total used vs remaining
  const innerSegments: DonutSegment[] = [
    { value: summary.used, color: DONUT_COLORS.used },
    { value: remaining, color: DONUT_COLORS.remaining },
  ];

  const statusRows: { label: string; status: LeaveStatus; count: number }[] = [
    { label: "Approved", status: LeaveStatus.Approved, count: summary.approved },
    { label: "Requested", status: LeaveStatus.Requested, count: summary.requested },
    { label: "Planned", status: LeaveStatus.Planned, count: summary.planned },
  ];

  const breakdownRows: { dot?: string; label: string; value: string }[] = [
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

      {/* Donut + key */}
      <div className="flex items-center gap-4 mb-4">
        <DualRingDonut
          outerSegments={outerSegments}
          innerSegments={innerSegments}
          outerTotal={summary.total || 1}
          innerTotal={summary.total || 1}
          centerValue={remaining}
        />
        <div className="flex-1 space-y-1.5">
          {statusRows.map(({ label, status, count }) => (
            <div key={status} className="flex justify-between text-sm">
              <span className="flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${STATUS_DOT[status]}`} />
                {label}
              </span>
              <span className="text-gray-700 font-medium">{count} days</span>
            </div>
          ))}
        </div>
      </div>

      {/* Breakdown toggle */}
      <button
        type="button"
        onClick={() => setShowBreakdown((v) => !v)}
        className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 font-medium transition-colors"
        aria-expanded={showBreakdown}
      >
        {showBreakdown ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        {showBreakdown ? "Hide breakdown" : "View breakdown"}
      </button>

      {/* Breakdown details */}
      {showBreakdown && (
        <div className="mt-3 space-y-1 border-t border-gray-100 pt-3">
          {breakdownRows.map(({ label, value }, i) => (
            <div
              key={label}
              className={`flex justify-between text-xs ${
                i === breakdownRows.length - 2 ? "border-t border-gray-100 pt-1 mt-1 font-semibold text-sm" : ""
              } ${i === breakdownRows.length - 1 ? "font-bold text-sm" : "text-gray-600"}`}
            >
              <span>{label}</span>
              <span
                className={
                  i === breakdownRows.length - 1 && summary.remaining < 0
                    ? "text-red-600"
                    : i === breakdownRows.length - 1
                    ? "text-indigo-700"
                    : ""
                }
              >
                {value}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
