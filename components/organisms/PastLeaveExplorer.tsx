"use client";
import type { LeaveEntry, YearAllowance, BankHolidayEntry } from "@/types";
import LeaveEntryCard from "@/components/molecules/LeaveEntryCard";

export interface PastLeaveExplorerProps {
  /** Allowance periods available for selection. */
  pastPeriods: YearAllowance[];
  /**
   * Key of the currently-selected period in the format `"year-company"`.
   * Empty string means no period is selected.
   */
  selectedPastPeriod: string;
  onSelectPeriod: (key: string) => void;
  /** Leave entries for the selected period (filtered externally). */
  pastLeaveEntries: LeaveEntry[];
  nonWorkingDays: number[];
  bankHolidays: BankHolidayEntry[];
}

function periodKey(ya: YearAllowance): string {
  return `${ya.year}-${ya.company}`;
}

function periodLabel(ya: YearAllowance): string {
  const sm = ya.holidayStartMonth;
  if (sm === 1) {
    return `${ya.year}${ya.company ? ` — ${ya.company}` : ""}`;
  }
  const startDate = new Date(ya.year, sm - 1, 1);
  const endDate = new Date(ya.year + 1, sm - 1, 1);
  endDate.setDate(endDate.getDate() - 1);
  const opts: Intl.DateTimeFormatOptions = { month: "short", year: "numeric" };
  const range = `${startDate.toLocaleDateString("en-GB", opts)} – ${endDate.toLocaleDateString("en-GB", opts)}`;
  return `${range}${ya.company ? ` — ${ya.company}` : ""}`;
}

/**
 * Past leave explorer organism.
 *
 * Renders a row of period-selector chips and, once a period is selected,
 * the list of past leave entries within that period.
 *
 * All data is received as props (no internal fetching).
 */
export default function PastLeaveExplorer({
  pastPeriods,
  selectedPastPeriod,
  onSelectPeriod,
  pastLeaveEntries,
  nonWorkingDays,
  bankHolidays,
}: PastLeaveExplorerProps) {
  if (pastPeriods.length === 0) {
    return <p className="text-sm text-gray-400">No past leave allowance periods found.</p>;
  }

  const hasPeriodSelected = pastPeriods.some((ya) => periodKey(ya) === selectedPastPeriod);

  return (
    <div data-testid="past-leave-explorer" className="space-y-5">
      <p className="text-sm text-gray-500">
        Select a leave allowance period to view the leave you took during that time.
      </p>

      {/* Period chips */}
      <div className="flex gap-2 flex-wrap">
        {pastPeriods.map((ya) => {
          const key = periodKey(ya);
          const isSelected = selectedPastPeriod === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => onSelectPeriod(key)}
              aria-pressed={isSelected}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition cursor-pointer ${
                isSelected
                  ? "bg-indigo-600 text-white border-indigo-600"
                  : "bg-white text-gray-700 border-gray-300 hover:border-indigo-400 hover:text-indigo-600"
              }`}
            >
              {periodLabel(ya)}
            </button>
          );
        })}
      </div>

      {/* Results panel */}
      {hasPeriodSelected && (
        <div className="space-y-2 mt-4">
          {pastLeaveEntries.length === 0 ? (
            <p className="text-sm text-gray-400">No leave entries for this period.</p>
          ) : (
            [...pastLeaveEntries]
              .sort((a, b) => a.startDate.localeCompare(b.startDate))
              .map((entry) => (
                <LeaveEntryCard
                  key={entry.id}
                  entry={entry}
                  nonWorkingDays={nonWorkingDays}
                  bankHolidays={bankHolidays}
                />
              ))
          )}
        </div>
      )}
    </div>
  );
}
