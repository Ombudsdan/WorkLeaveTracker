"use client";
import { useMemo } from "react";

export interface DonutSegment {
  /** Numeric value for this segment */
  value: number;
  /** Hex colour string for this segment */
  color: string;
}

export interface DonutChartProps {
  /** Ordered segments to render (approved → requested → planned) */
  segments: DonutSegment[];
  /** Total allowance (denominator — the full 180° arc) */
  total: number;
  /** Value displayed in the centre of the arc (remaining days) */
  centerValue: number;
}

// ---------------------------------------------------------------------------
// Geometry helpers
// ---------------------------------------------------------------------------

/**
 * Builds the SVG arc-path string for a single half-donut segment.
 *
 * The half-donut spans 180° — from the left end of the diameter to the right
 * end, passing through the top of the circle.
 *
 * Angle convention (standard maths, y-up):
 *   - 180° = left end  (cx - r, cy)
 *   - 90°  = top       (cx, cy - r)
 *   - 0°   = right end (cx + r, cy)
 *
 * @param cx          Centre x
 * @param cy          Centre y (sits at the flat base of the visible semicircle)
 * @param r           Radius
 * @param startFrac   Start position in [0, 1] (0 = left end, 1 = right end)
 * @param endFrac     End position in [0, 1]
 */
function buildSegmentPath(
  cx: number,
  cy: number,
  r: number,
  startFrac: number,
  endFrac: number
): string {
  const toRad = (deg: number) => (deg * Math.PI) / 180;

  const startAngleDeg = 180 - startFrac * 180;
  const startX = cx + r * Math.cos(toRad(startAngleDeg));
  const startY = cy - r * Math.sin(toRad(startAngleDeg));

  const endAngleDeg = 180 - endFrac * 180;
  const endX = cx + r * Math.cos(toRad(endAngleDeg));
  const endY = cy - r * Math.sin(toRad(endAngleDeg));

  // Each segment spans at most 180°, so largeArc is always 0
  const largeArc = 0;

  // sweep=1 draws through the top of the circle (upper semicircle)
  return `M ${startX} ${startY} A ${r} ${r} 0 ${largeArc} 1 ${endX} ${endY}`;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * A multi-segment half-donut (semicircle) chart used to visualise leave
 * allocation split by status (Approved / Requested / Planned).
 *
 * The remaining count is displayed inside the curve, vertically centred
 * within the visible half of the SVG.
 */
export default function DonutChart({ segments, total, centerValue }: DonutChartProps) {
  const cx = 50;
  const cy = 52; // push centre down so there is room for text above the baseline
  const r = 38;
  const strokeWidth = 14;

  // Background track — full upper semicircle
  const trackPath = `M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`;

  const segmentPaths = useMemo(() => {
    if (total <= 0) return [];

    let cumFrac = 0;
    const els: React.ReactNode[] = [];

    for (let i = 0; i < segments.length; i++) {
      const seg = segments[i];
      if (seg.value <= 0) continue;

      const rawFrac = seg.value / total;
      const available = Math.max(0, 1 - cumFrac);
      const frac = Math.min(rawFrac, available);
      if (frac <= 0) continue;

      const startFrac = cumFrac;
      const endFrac = cumFrac + frac;
      // Avoid degenerate arc when end point equals start (SVG renders nothing)
      const clampedEnd = endFrac >= 1 ? 0.9999 : endFrac;

      els.push(
        <path
          key={i}
          fill="none"
          stroke={seg.color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          d={buildSegmentPath(cx, cy, r, startFrac, clampedEnd)}
        />
      );

      cumFrac = endFrac;
    }

    return els;
  }, [segments, total]);

  return (
    <svg
      viewBox="0 0 100 65"
      className="w-full h-auto"
      role="img"
      aria-label={`${centerValue} days remaining`}
    >
      {/* Background track */}
      <path
        fill="none"
        stroke="#f3f4f6"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        d={trackPath}
      />

      {/* Coloured segments */}
      {segmentPaths}

      {/* Remaining count — centred inside the curve */}
      <text
        x={cx}
        y={cy - 10}
        textAnchor="middle"
        dominantBaseline="middle"
        style={{ fontSize: 18, fontWeight: "bold", fill: "#111827" }}
      >
        {centerValue}
      </text>

      {/* "Remaining" label — sits just below the number, above the baseline */}
      <text
        x={cx}
        y={cy + 6}
        textAnchor="middle"
        dominantBaseline="middle"
        style={{ fontSize: 9, fill: "#6b7280" }}
      >
        Remaining
      </text>
    </svg>
  );
}
