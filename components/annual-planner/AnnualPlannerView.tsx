"use client";
import { useState, useMemo } from "react";
import type { PublicUser, BankHolidayEntry } from "@/types";
import { LeaveType, LeaveDuration } from "@/types";
import { ChevronDown, ChevronUp } from "lucide-react";
import { STATUS_COLORS, SICK_LEAVE_CARD_COLORS } from "@/variables/colours";
import { MONTH_NAMES_LONG } from "@/variables/calendar";
import { calcMonthlyLeaveBreakdown } from "@/utils/leaveCalc";
import { getActiveYearAllowance, formatYearWindow, countEntryDays, getEntryDuration } from "@/utils/dateHelpers";
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
 */
export default function AnnualPlannerView({ user, bankHolidays }: AnnualPlannerViewProps) {
  const bankHolidayDates = useMemo(() => bankHolidays.map((bh) => bh.date), [bankHolidays]);

  const activeYa = getActiveYearAllowance(user.yearAllowances);

  const monthlyData = useMemo(
    () => calcMonthlyLeaveBreakdown(user, bankHolidayDates, activeYa ?? undefined),
    [user, bankHolidayDates, activeYa]
  );

  // The scale denominator is the maximum totalCombined across all months (minimum 1)
  const maxDays = useMemo(
    () => Math.max(...monthlyData.map((m) => m.totalCombined), 1),
    [monthlyData]
  );

  // Accordion open state: set of "year-month" keys (e.g. "2026-0")
  const [openMonths, setOpenMonths] = useState<Set<string>>(new Set());

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
          <span className="text-xs text-gray-400">{formatYearWindow(activeYa)}</span>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-3 mb-4 mt-2">
          {[
            { label: "Approved", color: "bg-green-300" },
            { label: "Requested", color: "bg-blue-300" },
            { label: "Planned", color: "bg-yellow-300" },
            { label: "Bank Holidays", color: "bg-purple-300" },
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
