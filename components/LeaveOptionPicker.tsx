"use client";
import { useEffect, useRef } from "react";
import { useFormValidation } from "@/contexts/FormValidationContext";

interface OptionItem<T extends string> {
  value: T;
  label: string;
}

interface LeaveOptionPickerProps<T extends string> {
  id: string;
  label: string;
  options: OptionItem<T>[];
  value: T | "";
  onChange: (value: T) => void;
  required?: boolean | string;
}

export default function LeaveOptionPicker<T extends string>({
  id,
  label,
  options,
  value,
  onChange,
  required,
}: LeaveOptionPickerProps<T>) {
  const { getError, setError, clearError, registerValidator } = useFormValidation();
  const error = getError(id);

  const validateRef = useRef<() => boolean>(() => true);
  validateRef.current = () => validate(value);

  useEffect(() => {
    return registerValidator(id, () => validateRef.current());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  function validate(v: T | ""): boolean {
    if (required && !v) {
      const message = typeof required === "string" ? required : `${label} is required`;
      setError(id, message);
      return false;
    }
    clearError(id);
    return true;
  }

  function handleClick(v: T) {
    onChange(v);
    validate(v);
  }

  return (
    <div>
      <span className="block text-sm font-medium text-gray-600 mb-2">{label}</span>
      <div className="flex gap-2 flex-wrap">
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => handleClick(option.value)}
            aria-pressed={value === option.value}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition ${
              value === option.value
                ? "bg-indigo-600 text-white border-indigo-600"
                : "bg-white text-gray-700 border-gray-300 hover:border-indigo-400 hover:text-indigo-600"
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>
      {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
    </div>
  );
}
