"use client";
import { useMemo } from "react";
import { LeaveStatus } from "@/types";
import { STATUS_HEX_COLORS } from "@/variables/colours";

export interface HalfDonutChartProps {
  /** Total allowance (denominator of the arc) */
  total: number;
  /** Amount used / booked for the given status (numerator of the arc) */
  used: number;
  /** The leave status — controls the arc colour */
  status: LeaveStatus;
}

// ---------------------------------------------------------------------------
// Geometry helpers
// ---------------------------------------------------------------------------

/**
 * Computes the SVG arc-path string for a half-donut segment.
 *
 * The track spans 180° — from the left end of the diameter to the right end
 * going through the top of the circle (mathematically: 180° → 0°, clockwise
 * in screen coordinates).
 *
 * @param cx   Centre x of the underlying circle
 * @param cy   Centre y  (y=cy is the flat base of the semi-circle)
 * @param r    Radius
 * @param fraction  Value in [0, 1] representing what portion to fill
 */
function buildUsedArcPath(cx: number, cy: number, r: number, fraction: number): string {
  const toRad = (deg: number) => (deg * Math.PI) / 180;

  // The arc always starts at the left end of the diameter
  const startX = cx - r;
  const startY = cy;

  // End angle in standard math coordinates (0° = right, 90° = up in screen coords)
  // At fraction=0 the end equals the start (180°); at fraction=1 it reaches 0°.
  const endAngleDeg = 180 - fraction * 180;
  const endX = cx + r * Math.cos(toRad(endAngleDeg));
  const endY = cy - r * Math.sin(toRad(endAngleDeg));

  // largeArc flag: 1 when the arc sweeps more than 180° — never true here since
  // the maximum is exactly 180°, so largeArc is always 0.
  const largeArc = 0;

  // sweep=1 → clockwise in SVG → goes through the top (upper semicircle)
  return `M ${startX} ${startY} A ${r} ${r} 0 ${largeArc} 1 ${endX} ${endY}`;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function HalfDonutChart({ total, used, status }: HalfDonutChartProps) {
  const cx = 50;
  const cy = 52; // push the centre down so there is room for text above the baseline
  const r = 38;
  const strokeWidth = 14;
  const capR = strokeWidth / 2;

  const trackColor = "#f3f4f6";
  const remaining = total - used;
  const color = STATUS_HEX_COLORS[status];

  // Clamp fraction to [0, 1] so the arc never overflows the track
  const fraction = useMemo(() => {
    if (total <= 0) return 0;
    return Math.min(Math.max(used / total, 0), 1);
  }, [used, total]);

  // Track — the full background semicircle (always rendered)
  const trackPath = `M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`;

  // Used arc — only rendered when there is something to show
  const showUsedArc = fraction > 0;
  // When the fraction is exactly 1 the start and end points of the arc path
  // would be identical, which SVG renders as nothing.  Use a near-full arc.
  const usedPath = buildUsedArcPath(cx, cy, r, fraction >= 1 ? 0.9999 : fraction);

  // Cap colours: restore round appearance only at the two outer arc endpoints
  const leftCapColor = fraction > 0 ? color : trackColor;
  const rightCapColor = fraction >= 1 ? color : trackColor;

  return (
    <svg
      viewBox="0 0 100 65"
      className="w-full h-auto"
      role="img"
      aria-label={`${remaining} days remaining`}
    >
      {/* Background track — butt ends; round caps are added explicitly below */}
      <path
        fill="none"
        stroke={trackColor}
        strokeWidth={strokeWidth}
        strokeLinecap="butt"
        d={trackPath}
      />

      {/* Used / booked arc — butt ends so the junction with the track is flat */}
      {showUsedArc && (
        <path
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="butt"
          d={usedPath}
        />
      )}

      {/* Round caps at the two outer endpoints of the arc */}
      <circle cx={cx - r} cy={cy} r={capR} fill={leftCapColor} />
      <circle cx={cx + r} cy={cy} r={capR} fill={rightCapColor} />

      {/* Remaining count — centred inside the curve */}
      <text
        x={cx}
        y={cy - 10}
        textAnchor="middle"
        dominantBaseline="middle"
        style={{ fontSize: 18, fontWeight: "bold", fill: "#111827" }}
      >
        {remaining}
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
