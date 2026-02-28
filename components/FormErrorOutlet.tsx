"use client";
import { useFormValidation } from "@/contexts/FormValidationContext";

/**
 * Displays a red alert banner listing all current form errors.
 * Each error message is a clickable link that focuses the associated input field.
 * Place this at the top of any form that uses useFormValidation.
 */
export default function FormErrorOutlet() {
  const { errors } = useFormValidation();
  const errorEntries = Object.entries(errors);

  if (errorEntries.length === 0) return null;

  function scrollToField(id: string) {
    const el = document.getElementById(id);
    if (el) {
      el.focus();
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }

  return (
    <div
      role="alert"
      className="bg-red-50 border border-red-200 rounded-lg p-4"
    >
      <h4 className="font-semibold text-red-700 text-sm mb-2">
        Please fix the following before saving:
      </h4>
      <ul className="space-y-1 list-disc list-inside">
        {errorEntries.map(([id, message]) => (
          <li key={id}>
            <button
              type="button"
              onClick={() => scrollToField(id)}
              className="text-sm text-red-600 hover:text-red-800 underline text-left"
            >
              {message}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
