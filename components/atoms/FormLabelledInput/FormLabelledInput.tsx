"use client";
import type { InputHTMLAttributes } from "react";

export type FormLabelledInputType = "text" | "email" | "password" | "number" | "tel" | "url";

export interface FormLabelledInputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "id" | "type" | "value" | "onChange"> {
  id: string;
  label: string;
  type?: FormLabelledInputType;
  value: string | number;
  /** Called with the raw string value of the input on every change */
  onChange?: (value: string) => void;
  /** Inline error message shown below the input */
  error?: string;
}

/**
 * A self-contained labeled input atom. Unlike FormField, this component has
 * no dependency on FormValidationContext and is suitable for standalone
 * forms such as Login, Register, and modal inputs where validation is
 * managed externally.
 *
 * For forms that use FormValidationContext-driven validation, continue to
 * use FormField instead.
 */
export default function FormLabelledInput({
  id,
  label,
  type = "text",
  value,
  onChange,
  error,
  className = "",
  ...rest
}: FormLabelledInputProps) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1">
        {label}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={onChange ? (e) => onChange(e.target.value) : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        aria-invalid={error ? true : undefined}
        className={`w-full border rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-400 ${
          error ? "border-red-400" : "border-gray-300"
        } ${className}`.trim()}
        {...rest}
      />
      {error && (
        <p id={`${id}-error`} className="text-red-500 text-xs mt-1">
          {error}
        </p>
      )}
    </div>
  );
}
