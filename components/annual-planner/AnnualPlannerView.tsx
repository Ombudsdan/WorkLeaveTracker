"use client";
import { useState, useMemo, useEffect } from "react";
import type { PublicUser, BankHolidayEntry, YearAllowance } from "@/types";
import { LeaveType, LeaveDuration } from "@/types";
import { ChevronDown, ChevronUp } from "lucide-react";
import { STATUS_COLORS, SICK_LEAVE_CARD_COLORS } from "@/variables/colours";
import { MONTH_NAMES_LONG } from "@/variables/calendar";
import { calcMonthlyLeaveBreakdown, calcLeaveSummary } from "@/utils/leaveCalc";
import { BankHolidayHandling } from "@/types";
import {
  getActiveYearAllowance,
  formatYearWindow,
  countEntryDays,
  getEntryDuration,
} from "@/utils/dateHelpers";
import MonthlyLeaveBar from "@/components/molecules/MonthlyLeaveBar";

interface AnnualPlannerViewProps {
  user: PublicUser;
  bankHolidays: BankHolidayEntry[];
}

function formatDateRange(startDate: string, endDate: string): string {
  const opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short" };
  const start = new Date(startDate).toLocaleDateString("en-GB", opts);
  if (startDate === endDate) return start;
  const end = new Date(endDate).toLocaleDateString("en-GB", opts);
  return `${start} – ${end}`;
}

/**
 * AnnualPlannerView
 *
 * Renders the full-year planner for a user:
 *  1. A "Roundup" bar chart — one MonthlyLeaveBar per month showing Approved,
 *     Requested, Planned and Bank Holiday segments.
 *  2. A colour legend for the bar segments.
 *  3. An accordion list view of all leave entries grouped by month.
 *
 * When the user has multiple non-deactivated allowances a `<select>` lets them
 * switch between leave periods; otherwise the current period is shown as text.
 */
export default function AnnualPlannerView({ user, bankHolidays }: AnnualPlannerViewProps) {
  const bankHolidayDates = useMemo(() => bankHolidays.map((bh) => bh.date), [bankHolidays]);

  const activeYa = getActiveYearAllowance(user.yearAllowances);

  /** null = show the automatically-selected active window */
  const [selectedYear, setSelectedYear] = useState<number | null>(null);

  /** Non-deactivated allowances sorted oldest → newest, used to populate the selector */
  const visibleAllowances = useMemo(() => {
    const pool = user.yearAllowances.filter((ya) => ya.active !== false);
    return [...(pool.length > 0 ? pool : user.yearAllowances)].sort((a, b) => a.year - b.year);
  }, [user.yearAllowances]);

  /** The year allowance whose window is currently displayed */
  const effectiveYa = useMemo((): YearAllowance | null | undefined => {
    if (selectedYear === null) return activeYa;
    return (
      visibleAllowances.find((ya) => ya.year === selectedYear) ?? /* c8 ignore next */ activeYa
    );
  }, [selectedYear, visibleAllowances, activeYa]);

  const monthlyData = useMemo(
    () => calcMonthlyLeaveBreakdown(user, bankHolidayDates, effectiveYa ?? undefined),
    [user, bankHolidayDates, effectiveYa]
  );

  // Year-level summary derived from the same utility as the Dashboard's SummaryCard,
  // ensuring the two views always agree on totals.
  const yearlySummary = useMemo(
    () => calcLeaveSummary(user, bankHolidayDates, effectiveYa ?? undefined),
    [user, bankHolidayDates, effectiveYa]
  );
  const deductBankHolidays =
    effectiveYa?.bankHolidayHandling === BankHolidayHandling.Deduct;

  // The scale denominator is the maximum totalCombined across all months (minimum 1)
  const maxDays = useMemo(
    () => Math.max(...monthlyData.map((m) => m.totalCombined), 1),
    [monthlyData]
  );

  // Accordion open state: set of "year-month" keys (e.g. "2026-0")
  const [openMonths, setOpenMonths] = useState<Set<string>>(new Set());

  // Close all open accordion rows when the displayed year changes
  useEffect(() => {
    setOpenMonths(new Set());
  }, [effectiveYa?.year]);

  // Reset the selected window whenever the viewed user changes
  /* c8 ignore next 3 */
  useEffect(() => {
    setSelectedYear(null);
  }, [user.id]);

  function toggleMonth(key: string) {
    setOpenMonths((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }

  if (!activeYa) {
    return (
      <div className="bg-white rounded-2xl shadow p-5">
        <p className="text-sm text-gray-400">No active leave allowance found.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── Bar chart card ─────────────────────────────────────── */}
      <div className="bg-white rounded-2xl shadow p-5">
        <div className="flex items-center justify-between mb-1">
          <h2 className="font-semibold text-gray-800 text-sm">Monthly Leave Roundup</h2>

          {/* Leave-period selector: dropdown when multiple windows, plain text otherwise */}
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
            <span className="text-xs text-gray-400">
              {effectiveYa ? formatYearWindow(effectiveYa) : "–"}
            </span>
          )}
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-3 mb-4 mt-2">
          {[
            { label: "Approved", color: "bg-green-300" },
            { label: "Requested", color: "bg-blue-300" },
            { label: "Planned", color: "bg-yellow-300" },
            { label: "Bank Holidays", color: "bg-gray-400" },
          ].map(({ label, color }) => (
            <span key={label} className="flex items-center gap-1 text-xs text-gray-600">
              <span className={`inline-block w-3 h-3 rounded-sm ${color}`} />
              {label}
            </span>
          ))}
        </div>

        {/* One bar per month */}
        <div className="space-y-0.5">
          {monthlyData.map((m) => (
            <MonthlyLeaveBar
              key={`${m.year}-${m.month}`}
              monthName={MONTH_NAMES_LONG[m.month]}
              approved={m.approved}
              requested={m.requested}
              planned={m.planned}
              bankHolidays={m.bankHolidays}
              maxDays={maxDays}
            />
          ))}
        </div>
      </div>

      {/* ── Year totals summary ────────────────────────────────── */}
      {/* Derived from calcLeaveSummary — the same function used by the Dashboard
          SummaryCard — so the two views always show consistent totals. */}
      <div className="bg-white rounded-2xl shadow p-5" data-testid="year-summary">
        <h2 className="font-semibold text-gray-800 text-sm mb-3">Year Summary</h2>
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs text-gray-600">
            <span>Total Entitlement</span>
            <span className="font-medium text-gray-800">{yearlySummary.total} days</span>
          </div>
          {deductBankHolidays && yearlySummary.bankHolidaysOnWorkingDays > 0 && (
            <div className="flex justify-between text-xs text-gray-600">
              <span>Bank holidays on working days</span>
              <span>−{yearlySummary.bankHolidaysOnWorkingDays}</span>
            </div>
          )}
          {!deductBankHolidays && yearlySummary.bankHolidaysOnWorkingDays > 0 && (
            <div className="flex justify-between text-xs text-gray-600">
              <span>Bank holidays on working days</span>
              <span className="text-gray-500">{yearlySummary.bankHolidaysOnWorkingDays}</span>
            </div>
          )}
          <div className="flex justify-between text-xs text-gray-600">
            <span>Approved</span>
            <span>−{yearlySummary.approved}</span>
          </div>
          <div className="flex justify-between text-xs text-gray-600">
            <span>Requested</span>
            <span>−{yearlySummary.requested}</span>
          </div>
          <div className="flex justify-between text-xs text-gray-600">
            <span>Planned</span>
            <span>−{yearlySummary.planned}</span>
          </div>
          <hr className="border-gray-100" />
          <div className="flex justify-between text-sm font-semibold">
            <span className={yearlySummary.remaining < 0 ? "text-red-600" : "text-gray-800"}>
              Remaining
            </span>
            <span className={yearlySummary.remaining < 0 ? "text-red-600" : "text-gray-800"}>
              {yearlySummary.remaining} days
            </span>
          </div>
        </div>
      </div>

      {/* ── Accordion list view ────────────────────────────────── */}
      <div className="bg-white rounded-2xl shadow p-5">
        <h2 className="font-semibold text-gray-800 text-sm mb-3">Entries by Month</h2>

        {monthlyData.every((m) => m.entries.length === 0) ? (
          <p className="text-xs text-gray-400">No leave entries in this period.</p>
        ) : (
          <div className="space-y-1">
            {monthlyData.map((m) => {
              const key = `${m.year}-${m.month}`;
              const isOpen = openMonths.has(key);
              const hasEntries = m.entries.length > 0;
              const monthLabel = `${MONTH_NAMES_LONG[m.month]} ${m.year}`;

              return (
                <div key={key} className="border border-gray-100 rounded-lg overflow-hidden">
                  <button
                    type="button"
                    onClick={() => toggleMonth(key)}
                    disabled={!hasEntries}
                    aria-expanded={isOpen}
                    className={`w-full flex items-center justify-between px-3 py-2 text-sm font-medium text-left transition-colors ${
                      hasEntries
                        ? "hover:bg-gray-50 cursor-pointer"
                        : "cursor-default text-gray-400"
                    }`}
                  >
                    <span className={hasEntries ? "text-gray-700" : "text-gray-400"}>
                      {monthLabel}
                    </span>
                    <span className="flex items-center gap-2 shrink-0">
                      {hasEntries && (
                        <span className="text-xs text-gray-400">
                          {m.entries.length} {m.entries.length === 1 ? "entry" : "entries"}
                        </span>
                      )}
                      {hasEntries &&
                        (isOpen ? (
                          <ChevronUp size={14} className="text-gray-400" />
                        ) : (
                          <ChevronDown size={14} className="text-gray-400" />
                        ))}
                    </span>
                  </button>

                  {isOpen && hasEntries && (
                    <div className="px-3 pb-3 space-y-2">
                      {m.entries.map((entry) => {
                        const dur = getEntryDuration(entry);
                        const isHalf = dur !== LeaveDuration.Full;
                        const periodLabel =
                          dur === LeaveDuration.HalfMorning
                            ? "AM"
                            : dur === LeaveDuration.HalfAfternoon
                              ? "PM"
                              : "";
                        const days = countEntryDays(
                          entry,
                          user.profile.nonWorkingDays,
                          bankHolidayDates
                        );
                        const daysLabel = isHalf ? `Half Day ${periodLabel}` : `${days}d`;
                        const isSick = entry.type === LeaveType.Sick;
                        const statusLabel = isSick
                          ? "Sick"
                          : entry.status.charAt(0).toUpperCase() + entry.status.slice(1);
                        const cardClass = isSick
                          ? SICK_LEAVE_CARD_COLORS
                          : STATUS_COLORS[entry.status];
                        const noteText = entry.notes ?? "–";

                        return (
                          <div
                            key={entry.id}
                            className={`border rounded-lg p-2 text-xs ${cardClass}`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-medium truncate mr-2">{noteText}</span>
                              <span className="shrink-0">{statusLabel}</span>
                            </div>
                            <div className="mt-0.5 text-xs opacity-80">
                              {formatDateRange(entry.startDate, entry.endDate)}{" "}
                              <span className="opacity-70">({daysLabel})</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
