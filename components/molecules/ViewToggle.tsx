"use client";

export interface ViewToggleOption<T extends string = string> {
  value: T;
  label: string;
}

export interface ViewToggleProps<T extends string = string> {
  options: [ViewToggleOption<T>, ViewToggleOption<T>];
  value: T;
  onChange: (value: T) => void;
  /** Extra Tailwind classes applied to the outer container. */
  className?: string;
}

/**
 * A two-segment toggle control (e.g. "Upcoming Leave" / "Calendar").
 * Renders as a rounded pill strip; the active segment shows an indigo underline.
 * Typically shown only on mobile (`flex lg:hidden`).
 */
export default function ViewToggle<T extends string = string>({
  options,
  value,
  onChange,
  className = "",
}: ViewToggleProps<T>) {
  return (
    <div
      role="group"
      aria-label="View toggle"
      data-testid="view-toggle"
      className={`flex bg-white rounded-xl shadow border border-gray-100 overflow-hidden ${className}`}
    >
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          aria-pressed={value === opt.value}
          onClick={() => onChange(opt.value)}
          className={`flex-1 py-2 text-sm font-medium border-b-2 transition-colors cursor-pointer ${
            value === opt.value
              ? "border-indigo-500 text-indigo-700"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
