"use client";
import { LeaveStatus } from "@/types";

const BADGE_CLASSES: Record<LeaveStatus, string> = {
  [LeaveStatus.Approved]: "bg-green-100 text-green-800",
  [LeaveStatus.Requested]: "bg-yellow-100 text-yellow-800",
  [LeaveStatus.Planned]: "bg-blue-100 text-blue-800",
};

const SICK_BADGE_CLASSES = "bg-red-100 text-red-800";

export interface StatusBadgeProps {
  /** The leave status to display */
  status: LeaveStatus;
  /** When true, renders the badge as a Sick badge regardless of status */
  isSick?: boolean;
  className?: string;
}

/**
 * A small pill badge that displays the leave status label with appropriate
 * colour styling. Sick entries override the status colour with red.
 */
export default function StatusBadge({ status, isSick = false, className = "" }: StatusBadgeProps) {
  const colorClasses = isSick ? SICK_BADGE_CLASSES : BADGE_CLASSES[status];
  const label = isSick ? "Sick" : status.charAt(0).toUpperCase() + status.slice(1);

  return (
    <span
      className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full ${colorClasses} ${className}`.trim()}
    >
      {label}
    </span>
  );
}
