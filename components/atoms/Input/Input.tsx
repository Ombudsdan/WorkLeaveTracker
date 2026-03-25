"use client";
import type { ChangeEvent } from "react";

export default function Input({
  id,
  type = "text",
  value,
  onChange,
  placeholder,
  disabled,
  readOnly,
  required,
  min,
  max,
  step,
  maxLength,
  className = "",
  "aria-label": ariaLabel,
  "aria-describedby": ariaDescribedby,
  "aria-invalid": ariaInvalid,
}: InputProps) {
  return (
    <input
      id={id}
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      disabled={disabled}
      readOnly={readOnly}
      required={required}
      min={min}
      max={max}
      step={step}
      maxLength={maxLength}
      aria-label={ariaLabel}
      aria-describedby={ariaDescribedby}
      aria-invalid={ariaInvalid}
      className={`w-full border rounded-lg px-3 py-2 text-sm text-gray-900 focus:ring-2 focus:ring-indigo-400 focus:outline-none
        ${readOnly ? "bg-gray-50 text-gray-400" : "bg-white"}
        ${ariaInvalid ? "border-red-400" : "border-gray-300"}
        ${disabled ? "opacity-50 cursor-not-allowed" : ""}
        ${className}`.trim()}
    />
  );
}

export type InputType =
  | "text"
  | "email"
  | "number"
  | "password"
  | "date"
  | "search"
  | "tel"
  | "url";

export interface InputProps {
  id?: string;
  type?: InputType;
  value?: string | number;
  onChange?: (e: ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  disabled?: boolean;
  readOnly?: boolean;
  required?: boolean;
  min?: number;
  max?: number;
  step?: number | "any";
  maxLength?: number;
  className?: string;
  "aria-label"?: string;
  "aria-describedby"?: string;
  "aria-invalid"?: boolean;
}
