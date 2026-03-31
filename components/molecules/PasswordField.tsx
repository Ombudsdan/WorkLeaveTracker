"use client";
import FormField from "@/components/molecules/FormField";
import { FormValidationProvider } from "@/contexts/FormValidationContext";

export interface PasswordFieldProps {
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
 * A self-contained password input that uses the FormValidationContext.
 *
 * When used inside an existing `FormValidationProvider` (e.g. a change-password
 * form) it integrates with that form's validation. When used standalone, wrap
 * in its own `FormValidationProvider` so it doesn't interfere with sibling forms.
 */
export default function PasswordField({ ...props }: PasswordFieldProps) {
  return <FormField {...props} type="password" />;
}

/**
 * Standalone password input with its own isolated validation scope.
 * Use this inside modals or other UI that sits outside the main page form.
 */
export function StandalonePasswordField(props: PasswordFieldProps) {
  return (
    <FormValidationProvider>
      <PasswordField {...props} />
    </FormValidationProvider>
  );
}
