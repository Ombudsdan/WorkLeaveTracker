import { LeaveStatus, LeaveType } from "@/types";

/** Human-readable labels for each LeaveStatus */
export const LEAVE_STATUS_LABELS: Record<LeaveStatus, string> = {
  [LeaveStatus.Planned]: "Planned (Draft)",
  [LeaveStatus.Requested]: "Requested (Pending)",
  [LeaveStatus.Approved]: "Approved (Confirmed)",
};

/**
 * Explicit display order for LeaveStatus.
 * Use this to iterate instead of Object.entries to maintain consistent ordering.
 */
export const LEAVE_STATUS_ORDER: LeaveStatus[] = [
  LeaveStatus.Planned,
  LeaveStatus.Requested,
  LeaveStatus.Approved,
];

/** Human-readable labels for each LeaveType */
export const LEAVE_TYPE_LABELS: Record<LeaveType, string> = {
  [LeaveType.Holiday]: "Holiday",
  [LeaveType.Sick]: "Sick",
  [LeaveType.Other]: "Other",
};

/**
 * Explicit display order for LeaveType.
 * Use this to iterate instead of Object.entries to maintain consistent ordering.
 */
export const LEAVE_TYPE_ORDER: LeaveType[] = [LeaveType.Holiday, LeaveType.Sick, LeaveType.Other];
