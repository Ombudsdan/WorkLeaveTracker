"use client";
import { useState, useMemo, useEffect } from "react";
import { LeaveStatus, LeaveType } from "@/types";
import type { PublicUser, BankHolidayEntry } from "@/types";
import { STATUS_DOT } from "@/variables/colours";
import { calcLeaveSummary } from "@/utils/leaveCalc";
import { countEntryDays, getActiveYearAllowance, formatYearWindow } from "@/utils/dateHelpers";
import { ChevronDown, ChevronUp } from "lucide-react";
import { SICK_LEAVE_ENABLED } from "@/utils/features";

interface SummaryCardProps {
  user: PublicUser;
  bankHolidays: BankHolidayEntry[];
  isOwnProfile: boolean;
}

// Chart segment colours — match the Tailwind status colours used elsewhere
const DONUT_COLORS = {
  approved: "#86efac", // green-300
  requested: "#93c5fd", // blue-300
  planned: "#fde047", // yellow-300
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

  const paths = useMemo(
    () =>
      segments
        .filter((s) => s.value > 0 && total > 0)
        .reduce<{ els: React.ReactNode[]; angle: number }>(
          ({ els, angle }, seg, i) => {
            const pct = seg.value / total;
            const endAngle = angle + pct * 360;
            const el =
              pct >= 1 ? (
                <circle
                  key={i}
                  cx={cx}
                  cy={cy}
                  r={R}
                  fill="none"
                  stroke={seg.color}
                  strokeWidth={strokeWidth}
                />
              ) : (
                <path
                  key={i}
                  fill="none"
                  stroke={seg.color}
                  strokeWidth={strokeWidth}
                  d={buildArcPath(cx, cy, R, angle, endAngle)}
                />
              );
            return { els: [...els, el], angle: endAngle };
          },
          { els: [], angle: -90 }
        ).els,
    [segments, total]
  );

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

export default function SummaryCard({ user, bankHolidays }: SummaryCardProps) {
  const [showBreakdown, setShowBreakdown] = useState(false);
  const [activeTab, setActiveTab] = useState<"holiday" | "sick">("holiday");
  /** null = show the automatically-selected active window */
  const [selectedYear, setSelectedYear] = useState<number | null>(null);

  // Reset the selected window whenever the viewed user changes
  useEffect(() => {
    setSelectedYear(null);
  }, [user.id]);

  const bankHolidayDates = bankHolidays.map((bh) => bh.date);
  const activeYa = getActiveYearAllowance(user.yearAllowances);

  /** Non-deactivated allowances sorted oldest → newest, used to populate the selector */
  const visibleAllowances = useMemo(() => {
    const pool = user.yearAllowances.filter((ya) => ya.active !== false);
    return [...(pool.length > 0 ? pool : user.yearAllowances)].sort((a, b) => a.year - b.year);
  }, [user.yearAllowances]);

  /** The year allowance whose window is currently displayed */
  const effectiveYa = useMemo(() => {
    if (selectedYear === null) return activeYa;
    return visibleAllowances.find((ya) => ya.year === selectedYear) ?? /* c8 ignore next */ activeYa;
  }, [selectedYear, visibleAllowances, activeYa]);

  const summary = calcLeaveSummary(user, bankHolidayDates, effectiveYa ?? undefined);

  const remaining = Math.max(0, summary.remaining);

  // Sick-leave day count (total, all statuses) — memoised so it doesn't recalculate on unrelated renders
  const sickDays = useMemo(() => {
    if (!SICK_LEAVE_ENABLED) return 0;
    return user.entries
      .filter((e) => e.type === LeaveType.Sick)
      .reduce(
        (sum, e) => sum + countEntryDays(e, user.profile.nonWorkingDays, bankHolidayDates),
        0
      );
  }, [user.entries, user.profile.nonWorkingDays, bankHolidayDates]);
  const hasSickEntries = sickDays > 0;
  // Show tabs only when sick leave feature is on AND the user has sick entries
  const showTabs = SICK_LEAVE_ENABLED && hasSickEntries;

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

  const allocationRows: { label: string; value: string }[] = [
    { label: "Core Days", value: String(effectiveYa?.core ?? 0) },
    { label: "Bought", value: `+${effectiveYa?.bought ?? 0}` },
    { label: "Carried Over", value: `+${effectiveYa?.carried ?? 0}` },
  ];

  return (
    <div className="bg-white rounded-2xl shadow p-5">
      {/* Name */}
      <div className="mb-1">
        <h2 className="font-bold text-gray-800">
          {user.profile.firstName} {user.profile.lastName}
        </h2>
      </div>

      {/* Leave window — text only when single allowance; select only when multiple */}
      <div className="mb-4">
        {visibleAllowances.length > 1 && effectiveYa ? (
          <select
            value={effectiveYa.year}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="text-xs text-gray-600 border border-gray-200 rounded px-1.5 py-0.5 bg-white cursor-pointer focus:outline-none focus:ring-1 focus:ring-indigo-300"
            aria-label="Select leave window"
          >
            {visibleAllowances.map((ya) => (
              <option key={ya.year} value={ya.year}>
                {formatYearWindow(ya)}
              </option>
            ))}
          </select>
        ) : (
          <p className="text-xs text-gray-400">
            {effectiveYa ? formatYearWindow(effectiveYa) : "–"}
          </p>
        )}
      </div>

      {/* Tab toggle — only shown when the user has sick entries */}
      {showTabs && (
        <div className="flex mb-4 border-b border-gray-200 -mx-1">
          {(["holiday", "sick"] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              role="tab"
              aria-selected={activeTab === tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3 py-1.5 text-xs font-medium border-b-2 transition-colors cursor-pointer ${
                activeTab === tab
                  ? "border-indigo-600 text-indigo-700"
                  : "border-transparent text-gray-400 hover:text-gray-600"
              }`}
            >
              {tab === "holiday" ? "Holiday" : "Sick"}
            </button>
          ))}
        </div>
      )}

      {activeTab === "holiday" ? (
        <>
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
            <div className="mt-3 border-t border-gray-100 pt-3">
              <div className="space-y-1">
                {allocationRows.map(({ label, value }) => (
                  <div key={label} className="flex justify-between text-xs text-gray-600">
                    <span>{label}</span>
                    <span>{value}</span>
                  </div>
                ))}
              </div>
              <div className="border-t border-gray-100 mt-2 pt-2">
                <div className="flex justify-between text-sm font-semibold text-gray-800">
                  <span>Used</span>
                  <span>
                    <span className={summary.used > summary.total ? "text-red-600" : ""}>
                      {summary.used}
                    </span>
                    {" / "}
                    {summary.total} days
                  </span>
                </div>
              </div>
            </div>
          )}
        </>
      ) : (
        /* Sick tab content */
        <div className="space-y-2">
          <p className="text-sm text-gray-600">
            Sick days logged: <span className="font-bold text-gray-900">{sickDays}</span>
          </p>
          <p className="text-xs text-gray-400">
            Sick leave is not deducted from your holiday allowance.
          </p>
        </div>
      )}
    </div>
  );
}
