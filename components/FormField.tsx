"use client";
import { useEffect, useRef } from "react";
import { useFormValidation } from "@/contexts/FormValidationContext";

export default function FormField({
  id,
  label,
  type = "text",
  value,
  onChange,
  readOnly,
  placeholder,
  min,
  max,
  required,
}: FormFieldProps) {
  const { getError, setError, clearError, registerValidator } = useFormValidation();
  const error = getError(id);

  // Keep validateRef in sync with the latest props so triggerAllValidations
  // always uses the current value and rules without re-registering each render.
  const validateRef = useRef<() => boolean>(() => true);
  validateRef.current = () => validate(String(value ?? ""));

  useEffect(() => {
    return registerValidator(id, () => validateRef.current());
  // registerValidator is stable (useCallback with no deps), id changes are intentional
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-gray-600 mb-1">
        {label}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={onChange ? (e) => handleChange(e.target.value) : undefined}
        readOnly={readOnly}
        placeholder={placeholder}
        min={min}
        max={max}
        className={`w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-400 focus:outline-none
          ${readOnly ? "bg-gray-50 text-gray-400" : ""}
          ${error ? "border-red-400" : "border-gray-300"}`}
      />
      {error && (
        <p className="text-red-500 text-xs mt-1">{error}</p>
      )}
    </div>
  );

  function handleChange(rawValue: string) {
    onChange?.(rawValue);
    validate(rawValue);
  }

  function validate(rawValue: string): boolean {
    const trimmed = rawValue.trim();

    if (required && trimmed === "") {
      const message = typeof required === "string" ? required : `${label} is required`;
      setError(id, message);
      return false;
    }

    if (type === "number" && trimmed !== "") {
      const num = Number(rawValue);
      if (isNaN(num)) {
        setError(id, `${label} must be a valid number`);
        return false;
      }
      if (min !== undefined && num < min) {
        setError(id, `${label} must be at least ${min}`);
        return false;
      }
      if (max !== undefined && num > max) {
        setError(id, `${label} must be no more than ${max}`);
        return false;
      }
    }

    clearError(id);
    return true;
  }
}

interface FormFieldProps {
  /** Must match the id used with setError/clearError in the validation hook */
  id: string;
  label: string;
  type?: "text" | "email" | "number" | "password" | "date";
  value: string | number;
  onChange?: (value: string) => void;
  readOnly?: boolean;
  placeholder?: string;
  min?: number;
  max?: number;
  /**
   * Built-in required validation.
   * Pass `true` to use the default "{label} is required" message,
   * or a custom string to override it.
   */
  required?: boolean | string;
}
