"use client";
import { useState, useMemo, useEffect } from "react";
import { LeaveStatus, LeaveType, BankHolidayHandling } from "@/types";
import type { PublicUser, BankHolidayEntry } from "@/types";
import { STATUS_DOT, STATUS_HEX_COLORS } from "@/variables/colours";
import { calcLeaveSummary } from "@/utils/leaveCalc";
import { countEntryDays, getActiveYearAllowance, formatYearWindow } from "@/utils/dateHelpers";
import { ChevronDown, ChevronUp, Plus } from "lucide-react";
import { SICK_LEAVE_ENABLED } from "@/utils/features";
import DonutChart from "@/components/molecules/DonutChart";
import type { DonutSegment } from "@/components/molecules/DonutChart";

interface SummaryCardProps {
  user: PublicUser;
  bankHolidays: BankHolidayEntry[];
  /** Called when the user clicks "Add Leave" — omit to hide the button */
  onAddLeave?: () => void;
}

export default function SummaryCard({ user, bankHolidays, onAddLeave }: SummaryCardProps) {
  const [showBreakdown, setShowBreakdown] = useState(false);
  const [activeTab, setActiveTab] = useState<"holiday" | "sick">("holiday");
  const [selectedYear, setSelectedYear] = useState<number | null>(null);

  useEffect(() => {
    setSelectedYear(null);
  }, [user.id]);

  const bankHolidayDates = bankHolidays.map((bh) => bh.date);
  const activeYa = getActiveYearAllowance(user.yearAllowances);

  const visibleAllowances = useMemo(() => {
    const pool = user.yearAllowances.filter((ya) => ya.active !== false);
    return [...(pool.length > 0 ? pool : user.yearAllowances)].sort((a, b) => a.year - b.year);
  }, [user.yearAllowances]);

  const effectiveYa = useMemo(() => {
    if (selectedYear === null) return activeYa;
    return (
      visibleAllowances.find((ya) => ya.year === selectedYear) ?? /* c8 ignore next */ activeYa
    );
  }, [selectedYear, visibleAllowances, activeYa]);

  const summary = calcLeaveSummary(user, bankHolidayDates, effectiveYa ?? undefined);

  const deductBankHolidays = effectiveYa?.bankHolidayHandling === BankHolidayHandling.Deduct;
  const effectiveTotal = deductBankHolidays
    ? summary.total - summary.bankHolidaysOnWorkingDays
    : summary.total;
  const remaining = summary.remaining;

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
  const showTabs = SICK_LEAVE_ENABLED && hasSickEntries;

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

  const totalDeductions =
    (deductBankHolidays ? summary.bankHolidaysOnWorkingDays : 0) +
    summary.approved +
    summary.requested +
    summary.planned;

  return (
    <div className="bg-white rounded-2xl shadow p-5">
      {/* Header: name + optional Add Leave button */}
      <div className="flex items-start justify-between mb-1">
        <h2 className="font-bold text-gray-800">
          {user.profile.firstName} {user.profile.lastName}
        </h2>
        {onAddLeave && (
          <button
            onClick={onAddLeave}
            className="flex items-center gap-1 bg-indigo-600 text-white text-xs px-3 py-1.5 rounded-lg hover:bg-indigo-700 transition font-medium cursor-pointer shrink-0 ml-2"
          >
            <Plus size={12} />
            Add Leave
          </button>
        )}
      </div>

      {/* Leave window */}
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

      {/* Tab toggle */}
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
          {/* Donut (wider) + status key */}
          <div className="flex items-center gap-4 mb-4">
            <div className="w-36 shrink-0">
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

          {/* Breakdown — totals row + side-by-side detail columns */}
          {showBreakdown && (
            <div className="mt-3 border-t border-gray-100 pt-3">
              {/* Totals row — always at top */}
              <div className="flex gap-2 mb-2">
                <div className="flex-1 flex justify-between text-sm font-bold text-gray-900">
                  <span>Total</span>
                  <span>{summary.total}</span>
                </div>
                <div className="w-px bg-gray-200 mx-1 self-stretch" />
                <div className="flex-1 flex justify-between text-sm font-bold text-gray-900">
                  <span>Deductions</span>
                  <span>−{totalDeductions}</span>
                </div>
              </div>
              <hr className="mb-3 border-gray-200" />

              {/* Side-by-side detail columns */}
              <div className="flex gap-2">
                {/* Entitlement */}
                <div className="flex-1 space-y-1">
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
                {/* Faint vertical separator */}
                <div className="w-px bg-gray-200 mx-1 self-stretch" />
                {/* Deductions */}
                <div className="flex-1 space-y-1">
                  {deductBankHolidays && (
                    <div className="flex justify-between text-xs text-gray-600">
                      <span>Bank Hols</span>
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
              </div>
            </div>
          )}
        </>
      ) : (
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
