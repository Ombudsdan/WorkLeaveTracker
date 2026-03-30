"use client";
import { useEffect, useRef } from "react";
import { useFormValidation } from "@/contexts/FormValidationContext";

export default function FormSelect<T extends string>({
  id,
  label,
  value,
  onChange,
  options,
  required,
}: FormSelectProps<T>) {
  const { getError, setError, clearError, registerValidator } = useFormValidation();
  const error = getError(id);

  const validateRef = useRef<() => boolean>(() => true);
  validateRef.current = () => validate(value);

  useEffect(() => {
    return registerValidator(id, () => validateRef.current());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-gray-600 mb-1">
        {label}
      </label>
      <select
        id={id}
        value={value}
        onChange={(e) => handleChange(e.target.value as T)}
        className={`w-full border rounded-lg px-3 py-2 text-sm text-gray-900 focus:ring-2 focus:ring-indigo-400 focus:outline-none
          ${error ? "border-red-400" : "border-gray-300"}`}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
    </div>
  );

  function handleChange(rawValue: T) {
    onChange(rawValue);
    validate(rawValue);
  }

  function validate(rawValue: T): boolean {
    if (required && !rawValue) {
      const message = typeof required === "string" ? required : `${label} is required`;
      setError(id, message);
      return false;
    }
    clearError(id);
    return true;
  }
}

interface SelectOption<T extends string> {
  value: T;
  label: string;
}

interface FormSelectProps<T extends string> {
  id: string;
  label: string;
  value: T;
  onChange: (value: T) => void;
  options: SelectOption<T>[];
  required?: boolean | string;
}
