"use client";
import { CheckCircle, Circle } from "lucide-react";
import type { YearAllowance } from "@/types";

export interface AllowanceListItemProps {
  allowance: YearAllowance;
  /** The year that is currently active (drives the active highlighting). */
  currentYear: number;
  /** When provided, an "Edit" link is rendered for active allowances. */
  onEdit?: (allowance: YearAllowance) => void;
}

/**
 * A single row in the Leave Allowances list.
 * Active year → indigo highlight + CheckCircle icon.
 * Inactive (ended) → muted grey + opacity.
 */
export default function AllowanceListItem({
  allowance,
  currentYear,
  onEdit,
}: AllowanceListItemProps) {
  const isInactive = allowance.active === false;
  const isCurrentYear = allowance.year === currentYear && !isInactive;

  const containerClass = isInactive
    ? "bg-gray-50 border-gray-200 text-gray-400 opacity-60"
    : isCurrentYear
      ? "bg-indigo-50 border-indigo-200 text-indigo-800"
      : "bg-gray-50 border-gray-200 text-gray-600";

  return (
    <div
      data-testid="allowance-list-item"
      className={`flex items-center gap-3 text-sm rounded-lg px-3 py-2 border ${containerClass}`}
    >
      {isCurrentYear ? (
        <CheckCircle size={16} className="shrink-0 text-indigo-600" aria-hidden="true" />
      ) : (
        <Circle size={16} className="shrink-0 text-gray-300" aria-hidden="true" />
      )}

      <span className="font-medium flex-1">
        {allowance.year}
        {allowance.company ? (
          <span className="ml-1 font-normal text-xs opacity-70">— {allowance.company}</span>
        ) : null}
        {isInactive && (
          <span className="ml-2 text-xs text-gray-400">(ended)</span>
        )}
      </span>

      {!isInactive && onEdit && (
        <button
          type="button"
          onClick={() => onEdit(allowance)}
          className="underline text-xs text-indigo-600 cursor-pointer"
        >
          Edit
        </button>
      )}
    </div>
  );
}
