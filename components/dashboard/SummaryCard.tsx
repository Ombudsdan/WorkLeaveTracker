"use client";
import { useState, useMemo, useEffect } from "react";
import { LeaveStatus, LeaveType, BankHolidayHandling } from "@/types";
import type { PublicUser, BankHolidayEntry } from "@/types";
import { STATUS_DOT, STATUS_HEX_COLORS } from "@/variables/colours";
import { calcLeaveSummary } from "@/utils/leaveCalc";
import { countEntryDays, getActiveYearAllowance, formatYearWindow } from "@/utils/dateHelpers";
import { ChevronDown, ChevronUp } from "lucide-react";
import { SICK_LEAVE_ENABLED } from "@/utils/features";
import DonutChart from "@/components/molecules/DonutChart";
import type { DonutSegment } from "@/components/molecules/DonutChart";

interface SummaryCardProps {
  user: PublicUser;
  bankHolidays: BankHolidayEntry[];
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
    return (
      visibleAllowances.find((ya) => ya.year === selectedYear) ?? /* c8 ignore next */ activeYa
    );
  }, [selectedYear, visibleAllowances, activeYa]);

  const summary = calcLeaveSummary(user, bankHolidayDates, effectiveYa ?? undefined);

  // Whether bank holidays consume annual leave for the active window
  const deductBankHolidays = effectiveYa?.bankHolidayHandling === BankHolidayHandling.Deduct;
  // Effective budget = raw total minus bank holidays on working days (only when deducting)
  const effectiveTotal = deductBankHolidays
    ? summary.total - summary.bankHolidaysOnWorkingDays
    : summary.total;
  const remaining = summary.remaining;

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

  // Single ring: approved → requested → planned; denominator is effective total
  // so the gray track represents the remaining bookable budget
  const ringSegments: DonutSegment[] = [
    { value: summary.approved, color: STATUS_HEX_COLORS[LeaveStatus.Approved] },
    { value: summary.requested, color: STATUS_HEX_COLORS[LeaveStatus.Requested] },
    { value: summary.planned, color: STATUS_HEX_COLORS[LeaveStatus.Planned] },
  ];

  const statusRows: { label: string; status: LeaveStatus; count: number }[] = [
    { label: "Approved", status: LeaveStatus.Approved, count: summary.approved },
    { label: "Requested", status: LeaveStatus.Requested, count: summary.requested },
    { label: "Planned", status: LeaveStatus.Planned, count: summary.planned },
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
          {/* Half-donut + status key */}
          <div className="flex items-center gap-4 mb-4">
            <div className="w-28 shrink-0">
              <DonutChart
                segments={ringSegments}
                total={Math.max(effectiveTotal, 1)}
                centerValue={remaining}
              />
            </div>
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
              <hr className="border-gray-200" />
              <div className="flex justify-between text-sm">
                <span
                  className={`flex items-center gap-1.5 font-medium ${summary.remaining < 0 ? "text-red-600" : "text-gray-800"}`}
                >
                  <span
                    className="w-2 h-2 rounded-full border border-gray-300"
                    style={{ backgroundColor: "#f3f4f6" }}
                  />
                  Remaining
                </span>
                <span
                  className={`font-semibold ${summary.remaining < 0 ? "text-red-600" : "text-gray-900"}`}
                >
                  {summary.remaining} days
                </span>
              </div>
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
              {/* Entitlement rows */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-gray-600">
                  <span>Core Days</span>
                  <span>+{effectiveYa?.core ?? 0}</span>
                </div>
                <div className="flex justify-between text-xs text-gray-600">
                  <span>Bought</span>
                  <span>+{effectiveYa?.bought ?? 0}</span>
                </div>
                <div className="flex justify-between text-xs text-gray-600">
                  <span>Carried Over</span>
                  <span>+{effectiveYa?.carried ?? 0}</span>
                </div>
              </div>
              {/* Total (bold) */}
              <div className="flex justify-between text-sm font-bold text-gray-900 mt-2">
                <span>Total</span>
                <span>{summary.total}</span>
              </div>
              {/* Divider */}
              <hr className="my-2 border-gray-200" />
              {/* Deduction rows */}
              <div className="space-y-1">
                {deductBankHolidays && (
                  <div className="flex justify-between text-xs text-gray-600">
                    <span>Bank holidays on working days</span>
                    <span>−{summary.bankHolidaysOnWorkingDays}</span>
                  </div>
                )}
                <div className="flex justify-between text-xs text-gray-600">
                  <span>Approved</span>
                  <span>−{summary.approved}</span>
                </div>
                <div className="flex justify-between text-xs text-gray-600">
                  <span>Requested</span>
                  <span>−{summary.requested}</span>
                </div>
                <div className="flex justify-between text-xs text-gray-600">
                  <span>Planned</span>
                  <span>−{summary.planned}</span>
                </div>
              </div>
              {/* Total Deductions (bold) */}
              <hr className="my-2 border-gray-200" />
              <div className="flex justify-between text-sm font-bold text-gray-900">
                <span>Total Deductions</span>
                <span>
                  −
                  {(deductBankHolidays ? summary.bankHolidaysOnWorkingDays : 0) +
                    summary.approved +
                    summary.requested +
                    summary.planned}
                </span>
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
