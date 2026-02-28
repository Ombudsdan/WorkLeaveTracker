"use client";
import FormField from "@/components/FormField";
import { FormValidationProvider } from "@/contexts/FormValidationContext";

interface EmailFieldProps {
  id: string;
  label: string;
  value: string;
  onChange?: (value: string) => void;
  readOnly?: boolean;
  placeholder?: string;
  /**
   * Built-in required validation.
   * Pass `true` to use the default "{label} is required" message,
   * or a custom string to override it.
   */
  required?: boolean | string;
}

/**
 * A self-contained email input that uses the FormValidationContext.
 *
 * When used inside an existing `FormValidationProvider` (e.g. a profile form)
 * it integrates with that form's validation. When used standalone, wrap in its
 * own `FormValidationProvider` so it doesn't interfere with sibling forms.
 *
 * Email format validation (`x@y.z`) is provided automatically via FormField's
 * `type="email"` path.
 */
export default function EmailField({ ...props }: EmailFieldProps) {
  return <FormField {...props} type="email" />;
}

/**
 * Standalone email input with its own isolated validation scope.
 * Use this inside modals or other UI that sits outside the main page form.
 */
export function StandaloneEmailField(props: EmailFieldProps) {
  return (
    <FormValidationProvider>
      <EmailField {...props} />
    </FormValidationProvider>
  );
}
