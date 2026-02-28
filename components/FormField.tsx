"use client";
import { useFormValidation } from "@/contexts/FormValidationContext";

interface FormFieldProps {
  /** Must match the id used with setError/clearError in the validation hook */
  id: string;
  label: string;
  type?: "text" | "email" | "number" | "password";
  value: string | number;
  onChange?: (value: string) => void;
  readOnly?: boolean;
  placeholder?: string;
  min?: number;
  max?: number;
}

/**
 * A labelled form input that reads its own error state from FormValidationContext
 * and displays the error message beneath the field.
 */
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
}: FormFieldProps) {
  const { getError } = useFormValidation();
  const error = getError(id);

  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-gray-600 mb-1">
        {label}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={onChange ? (e) => onChange(e.target.value) : undefined}
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
}
