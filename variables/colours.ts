import { LeaveStatus } from "@/types";

/** Tailwind classes for leave entry card borders and backgrounds */
export const STATUS_COLORS: Record<LeaveStatus, string> = {
  [LeaveStatus.Planned]: "bg-yellow-100 text-yellow-800 border-yellow-300",
  [LeaveStatus.Requested]: "bg-blue-100 text-blue-800 border-blue-300",
  [LeaveStatus.Approved]: "bg-green-100 text-green-800 border-green-300",
};

/** Tailwind classes for summary dot indicators */
export const STATUS_DOT: Record<LeaveStatus, string> = {
  [LeaveStatus.Planned]: "bg-yellow-400",
  [LeaveStatus.Requested]: "bg-blue-500",
  [LeaveStatus.Approved]: "bg-green-500",
};

/** Tailwind classes for calendar day cell backgrounds */
export const CALENDAR_COLORS: Record<LeaveStatus, string> = {
  [LeaveStatus.Planned]: "bg-yellow-200 text-yellow-800",
  [LeaveStatus.Requested]: "bg-blue-200 text-blue-800",
  [LeaveStatus.Approved]: "bg-green-200 text-green-800",
};

/** Calendar cell class for UK bank holidays */
export const CALENDAR_CELL_BANK_HOLIDAY = "bg-purple-100 text-purple-700";

/** Calendar cell class for the user's non-working days */
export const CALENDAR_CELL_NON_WORKING = "bg-gray-100 text-gray-400";

/** Calendar cell class for a standard working day with no leave */
export const CALENDAR_CELL_DEFAULT = "hover:bg-gray-50 text-gray-700";
