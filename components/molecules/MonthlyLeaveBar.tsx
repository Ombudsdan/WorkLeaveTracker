"use client";

export interface MonthlyLeaveBarProps {
  /** Short month name displayed to the left of the bar (e.g. "January") */
  monthName: string;
  /** Working days of approved holiday in this month */
  approved: number;
  /** Working days of requested holiday in this month */
  requested: number;
  /** Working days of planned holiday in this month */
  planned: number;
  /** Bank holidays that fall on a working day in this month */
  bankHolidays: number;
  /**
   * The scale denominator used to convert day counts to bar widths.
   * Typically the maximum `totalCombined` across all months, or the
   * average monthly allowance — ensures all months share the same scale.
   */
  maxDays: number;
}

/**
 * MonthlyLeaveBar molecule.
 *
 * Renders a single horizontal row representing one calendar month:
 *   [Month name]  [Total days]  [█ Approved ][█ Requested ][█ Planned ][█ Bank Hols ]░░░
 *
 * Segment widths are proportional to `maxDays` so all months are on the
 * same visual scale and are directly comparable.
 */
export default function MonthlyLeaveBar({
  monthName,
  approved,
  requested,
  planned,
  bankHolidays,
  maxDays,
}: MonthlyLeaveBarProps) {
  const totalCombined = approved + requested + planned + bankHolidays;
  const scale = maxDays > 0 ? maxDays : 1;

  function pct(value: number): string {
    return `${Math.min((value / scale) * 100, 100)}%`;
  }

  return (
    <div className="flex items-center gap-3 py-1.5" data-testid="monthly-leave-bar">
      {/* Month name */}
      <span className="w-24 text-sm font-medium text-gray-700 shrink-0">{monthName}</span>

      {/* Total combined days label */}
      <span className="w-10 text-xs text-gray-500 text-right shrink-0 tabular-nums">
        {totalCombined > 0 ? `${totalCombined}d` : "–"}
      </span>

      {/* Segmented bar */}
      <div
        className="flex-1 flex h-5 rounded-sm overflow-hidden bg-gray-100"
        role="img"
        aria-label={`${monthName}: ${approved} approved, ${requested} requested, ${planned} planned, ${bankHolidays} bank holidays`}
      >
        {approved > 0 && (
          <div
            className="bg-green-300 h-full"
            style={{ width: pct(approved) }}
            title={`Approved: ${approved}d`}
          />
        )}
        {requested > 0 && (
          <div
            className="bg-blue-300 h-full"
            style={{ width: pct(requested) }}
            title={`Requested: ${requested}d`}
          />
        )}
        {planned > 0 && (
          <div
            className="bg-yellow-300 h-full"
            style={{ width: pct(planned) }}
            title={`Planned: ${planned}d`}
          />
        )}
        {bankHolidays > 0 && (
          <div
            className="bg-purple-300 h-full"
            style={{ width: pct(bankHolidays) }}
            title={`Bank Holidays: ${bankHolidays}`}
          />
        )}
      </div>
    </div>
  );
}
