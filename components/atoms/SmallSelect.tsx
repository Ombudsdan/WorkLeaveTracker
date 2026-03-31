"use client";

export interface SmallSelectOption {
  value: string;
  label: string;
}

export interface SmallSelectProps {
  /** Current selected value */
  value: string;
  onChange: (value: string) => void;
  options: SmallSelectOption[];
  /** Accessible label for the select (required for screen readers) */
  ariaLabel: string;
  id?: string;
  className?: string;
}

/**
 * A compact select control intended for secondary controls within card
 * headers, calendar toolbars, and small form regions. For primary form
 * fields, prefer FormField or a full-size select.
 */
export default function SmallSelect({
  value,
  onChange,
  options,
  ariaLabel,
  id,
  className = "",
}: SmallSelectProps) {
  return (
    <select
      id={id}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      aria-label={ariaLabel}
      className={`text-xs text-gray-600 border border-gray-200 rounded-md px-1.5 py-0.5 bg-white cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-400 ${className}`.trim()}
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}
