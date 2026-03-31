"use client";
import { Check } from "lucide-react";
import { DAY_NAMES_SHORT } from "@/variables/calendar";

export interface WorkingDaysPickerProps {
  /** Selected working days (0 = Sun, 1 = Mon, …, 6 = Sat). */
  value: number[];
  onChange: (days: number[]) => void;
  /** Optional helper text shown below the picker. */
  hint?: string;
}

/**
 * A row of day-of-week toggle buttons.
 * Selected days render with a green pill + check icon; deselected days are grey.
 */
export default function WorkingDaysPicker({ value, onChange, hint }: WorkingDaysPickerProps) {
  function toggle(day: number) {
    if (value.includes(day)) {
      onChange(value.filter((d) => d !== day));
    } else {
      onChange([...value, day]);
    }
  }

  return (
    <div data-testid="working-days-picker">
      <div className="flex gap-2 flex-wrap">
        {DAY_NAMES_SHORT.map((label, index) => (
          <button
            key={index}
            type="button"
            onClick={() => toggle(index)}
            aria-pressed={value.includes(index)}
            className={`flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium border transition cursor-pointer ${
              value.includes(index)
                ? "bg-green-100 border-green-300 text-green-700"
                : "bg-gray-100 border-gray-300 text-gray-400"
            }`}
          >
            {value.includes(index) && <Check size={12} strokeWidth={3} aria-hidden="true" />}
            {label}
          </button>
        ))}
      </div>
      {hint && <p className="text-xs text-gray-400 mt-1">{hint}</p>}
    </div>
  );
}
