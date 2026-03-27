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
   * The maximum `totalCombined` across all months.  The bar chart rounds this
   * up to the nearest 5 (minimum 5) to produce the `chartScale`, which is the
   * denominator used for all segment widths.  All months share the same scale
   * so their bar lengths are directly comparable.
   */
  maxDays: number;
}

/**
 * MonthlyLeaveBar molecule.
 *
 * Renders a single horizontal row representing one calendar month:
 *   [Month name]  [Total days]  [█ Approved ][█ Requested ][█ Planned ][█ Bank Hols ]░░░
 *
 * The bar is drawn against a chart scale rounded up to the nearest 5 from
 * `maxDays`, so a month with fewer days shows a proportionally shorter fill.
 * Faint vertical lines mark every integer day position for easy reading.
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

  // Round up to the nearest 5 (minimum 5) — the full-width scale denominator
  const chartScale = Math.max(Math.ceil(maxDays / 5) * 5, 5);

  function pct(value: number): string {
    return `${Math.min((value / chartScale) * 100, 100)}%`;
  }

  return (
    <div className="flex items-center gap-3 py-1.5" data-testid="monthly-leave-bar">
      {/* Month name */}
      <span className="w-24 text-sm font-medium text-gray-700 shrink-0">{monthName}</span>

      {/* Total combined days label */}
      <span className="w-10 text-xs text-gray-500 text-right shrink-0 tabular-nums">
        {totalCombined > 0 ? `${totalCombined}d` : "–"}
      </span>

      {/* Segmented bar with per-day grid overlay */}
      <div
        className="flex-1 relative h-5 rounded-sm overflow-hidden bg-gray-100"
        role="img"
        aria-label={`${monthName}: ${approved} approved, ${requested} requested, ${planned} planned, ${bankHolidays} bank holidays`}
      >
        {/* Coloured fill segments */}
        <div className="absolute inset-0 flex">
          {approved > 0 && (
            <div
              className="bg-green-300 h-full"
              style={{ width: pct(approved) }}
              title={`Approved: ${approved}d`}
            />
          )}
          {requested > 0 && (
            <div
              className="bg-orange-200 h-full"
              style={{ width: pct(requested) }}
              title={`Requested: ${requested}d`}
            />
          )}
          {planned > 0 && (
            <div
              className="bg-yellow-200 h-full"
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

        {/* Per-day grid lines: one faint white vertical line per integer day */}
        {Array.from({ length: chartScale - 1 }, (_, i) => (
          <div
            key={i + 1}
            data-testid="chart-grid-line"
            className="absolute top-0 bottom-0"
            style={{
              left: `${((i + 1) / chartScale) * 100}%`,
              width: 1,
              backgroundColor: "rgba(255, 255, 255, 0.5)",
            }}
          />
        ))}
      </div>
    </div>
  );
}
