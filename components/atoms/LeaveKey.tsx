"use client";

import React from "react";

export type LeaveKeyItem = {
  label: string;
  /** Tailwind bg-* class for the colour swatch */
  colorClass: string;
  /** Optional inline style applied to the swatch (e.g. for stripe patterns) */
  style?: React.CSSProperties;
};

type Props = {
  items: LeaveKeyItem[];
  /** Extra Tailwind classes added to the wrapper, e.g. "mt-4" or "mt-3" */
  className?: string;
};

/**
 * A standardised leave-status colour key row.
 * Every swatch is a `w-3 h-3 rounded` square, matching the big CalendarView key.
 * Pass `items` using the exported constants below (or compose your own).
 */
export function LeaveKey({ items, className = "" }: Props) {
  return (
    <div
      data-testid="leave-key"
      className={`flex flex-wrap gap-3 text-xs text-gray-500 ${className}`.trim()}
    >
      {items.map(({ label, colorClass, style }) => (
        <span key={label} className="flex items-center gap-1">
          <span
            data-testid={`leave-key-swatch-${label.toLowerCase().replace(/\s+/g, "-")}`}
            className={`w-3 h-3 rounded ${colorClass}`}
            style={style}
          />
          {label}
        </span>
      ))}
    </div>
  );
}

// ─── Standard item constants ──────────────────────────────────────────────────

export const LEAVE_KEY_APPROVED: LeaveKeyItem = {
  label: "Approved",
  colorClass: "bg-green-300",
};
export const LEAVE_KEY_REQUESTED: LeaveKeyItem = {
  label: "Requested",
  colorClass: "bg-orange-200",
};
export const LEAVE_KEY_PLANNED: LeaveKeyItem = {
  label: "Planned",
  colorClass: "bg-yellow-200",
};
export const LEAVE_KEY_SICK: LeaveKeyItem = {
  label: "Sick",
  colorClass: "bg-red-200",
};
export const LEAVE_KEY_BANK_HOLIDAY: LeaveKeyItem = {
  label: "Bank Holiday",
  colorClass: "bg-purple-300",
};
export const LEAVE_KEY_NON_WORKING: LeaveKeyItem = {
  label: "Non-Working",
  colorClass: "bg-gray-100",
};

/**
 * Diagonal stripe background-image used to mark bank holidays that fall on
 * non-working days.  Applied as an inline style so Tailwind purging does not
 * remove it.
 */
export const NON_WORKING_BH_STRIPE_STYLE: React.CSSProperties = {
  backgroundImage:
    "repeating-linear-gradient(-45deg, transparent 0px, transparent 3px, rgba(156,163,175,0.7) 3px, rgba(156,163,175,0.7) 4.5px)",
};

export const LEAVE_KEY_BANK_HOLIDAY_NWD: LeaveKeyItem = {
  label: "Bank Holiday (non-working day)",
  colorClass: "bg-purple-300",
  style: NON_WORKING_BH_STRIPE_STYLE,
};

/**
 * The four items shown on most calendar-like views
 * (Approved / Requested / Planned / Bank Holiday).
 */
export const LEAVE_KEY_ITEMS_BASE: LeaveKeyItem[] = [
  LEAVE_KEY_APPROVED,
  LEAVE_KEY_REQUESTED,
  LEAVE_KEY_PLANNED,
  LEAVE_KEY_BANK_HOLIDAY,
];

/**
 * Extended set used by the Overview and Annual Calendar bar charts.
 * Includes a fifth item for bank holidays that fall on non-working days
 * (shown with diagonal stripes).
 */
export const LEAVE_KEY_ITEMS_OVERVIEW: LeaveKeyItem[] = [
  ...LEAVE_KEY_ITEMS_BASE,
  LEAVE_KEY_BANK_HOLIDAY_NWD,
];
