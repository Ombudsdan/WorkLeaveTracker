import { LeaveStatus, LeaveType } from "@/types";

/**
 * Hex colour values for leave statuses — used in SVG/canvas contexts where
 * Tailwind class strings cannot be applied directly.
 */
export const STATUS_HEX_COLORS: Record<LeaveStatus, string> = {
  [LeaveStatus.Approved]: "#86efac", // green-300
  [LeaveStatus.Requested]: "#fde047", // yellow-300
  [LeaveStatus.Planned]: "#93c5fd", // blue-300
};

/**
 * Hex colour values matching the STATUS_DOT Tailwind classes.
 * Used in inline style gradients (e.g. half-day circles in MiniCalendar).
 */
export const STATUS_DOT_HEX: Record<LeaveStatus, string> = {
  [LeaveStatus.Approved]: "#22c55e", // green-500
  [LeaveStatus.Requested]: "#facc15", // yellow-400
  [LeaveStatus.Planned]: "#3b82f6", // blue-500
};

/** Tailwind classes for leave entry card borders and backgrounds */
export const STATUS_COLORS: Record<LeaveStatus, string> = {
  [LeaveStatus.Planned]: "bg-blue-100 text-blue-800 border-blue-300",
  [LeaveStatus.Requested]: "bg-yellow-100 text-yellow-800 border-yellow-300",
  [LeaveStatus.Approved]: "bg-green-100 text-green-800 border-green-300",
};

/** Tailwind classes for summary dot indicators */
export const STATUS_DOT: Record<LeaveStatus, string> = {
  [LeaveStatus.Planned]: "bg-blue-500",
  [LeaveStatus.Requested]: "bg-yellow-400",
  [LeaveStatus.Approved]: "bg-green-500",
};

/** Tailwind classes for calendar day cell backgrounds (keyed by status) */
export const CALENDAR_COLORS: Record<LeaveStatus, string> = {
  [LeaveStatus.Planned]: "bg-blue-200 text-blue-800",
  [LeaveStatus.Requested]: "bg-yellow-200 text-yellow-800",
  [LeaveStatus.Approved]: "bg-green-200 text-green-800",
};

/** Tailwind classes for sick-leave entries in card/list/badge context (border + bg) */
export const SICK_LEAVE_CARD_COLORS = "bg-red-100 text-red-800 border-red-300";

/** Calendar cell class for sick-leave entries (overrides status colour) */
export const CALENDAR_CELL_SICK_LEAVE = "bg-red-200 text-red-800";

/** Calendar cell class for UK bank holidays */
export const CALENDAR_CELL_BANK_HOLIDAY = "bg-purple-200 text-purple-800";

/** Calendar cell class for the user's non-working days */
export const CALENDAR_CELL_NON_WORKING = "bg-gray-100 text-gray-400";

/** Calendar cell class for a standard working day with no leave */
export const CALENDAR_CELL_DEFAULT = "hover:bg-gray-50 text-gray-700";

/**
 * Returns the calendar colour class for a leave entry.
 * Sick-leave entries always use the red sick-leave colour regardless of status.
 */
export function getCalendarEntryClass(entry: { status: LeaveStatus; type: LeaveType }): string {
  if (entry.type === LeaveType.Sick) return CALENDAR_CELL_SICK_LEAVE;
  return CALENDAR_COLORS[entry.status];
}
