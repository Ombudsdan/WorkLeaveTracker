"use client";

export type PillVariant = "default" | "primary" | "success" | "warning" | "danger" | "muted";

const VARIANT_CLASSES: Record<PillVariant, string> = {
  default: "bg-gray-100 text-gray-700",
  primary: "bg-indigo-100 text-indigo-700",
  success: "bg-green-100 text-green-700",
  warning: "bg-amber-100 text-amber-700",
  danger: "bg-red-100 text-red-700",
  muted: "bg-gray-50 text-gray-400 border border-gray-200",
};

export interface PillProps {
  /** The text label rendered inside the pill */
  label: string;
  variant?: PillVariant;
  className?: string;
}

/**
 * A tiny inline pill/tag for short text labels such as "pending", "ended",
 * or status qualifiers. For numeric notification counts, prefer
 * NotificationBlob. For leave-status labels, prefer StatusBadge.
 */
export default function Pill({ label, variant = "default", className = "" }: PillProps) {
  return (
    <span
      className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full ${VARIANT_CLASSES[variant]} ${className}`.trim()}
    >
      {label}
    </span>
  );
}
