"use client";
import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";

interface FormValidationContextValue {
  /** All current field errors keyed by field id */
  errors: Record<string, string>;
  /** Set (or replace) the error message for a field */
  setError: (id: string, message: string) => void;
  /** Remove the error for a specific field */
  clearError: (id: string) => void;
  /** Remove all field errors */
  clearAllErrors: () => void;
  /** Get the error message for a specific field (undefined when valid) */
  getError: (id: string) => string | undefined;
  /** True when any error is present */
  hasErrors: boolean;
  /**
   * Register a validator function for a field.
   * The registered function is called by triggerAllValidations.
   * Returns an unsubscribe callback to remove the validator.
   */
  registerValidator: (id: string, fn: () => boolean) => () => void;
  /**
   * Run every registered field validator.
   * Returns true if all fields are valid.
   */
  triggerAllValidations: () => boolean;
}

const FormValidationContext = createContext<FormValidationContextValue | null>(null);

export function FormValidationProvider({ children }: { children: ReactNode }) {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const validators = useRef<Map<string, () => boolean>>(new Map());

  const setError = useCallback((id: string, message: string) => {
    setErrors((prev) => ({ ...prev, [id]: message }));
  }, []);

  const clearError = useCallback((id: string) => {
    setErrors((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }, []);

  const clearAllErrors = useCallback(() => setErrors({}), []);

  const getError = useCallback((id: string) => errors[id], [errors]);

  const registerValidator = useCallback((id: string, fn: () => boolean) => {
    validators.current.set(id, fn);
    return () => validators.current.delete(id);
  }, []);

  const triggerAllValidations = useCallback(() => {
    let allValid = true;
    for (const validate of validators.current.values()) {
      if (!validate()) allValid = false;
    }
    return allValid;
  }, []);

  const hasErrors = Object.keys(errors).length > 0;

  return (
    <FormValidationContext.Provider
      value={{
        errors,
        setError,
        clearError,
        clearAllErrors,
        getError,
        hasErrors,
        registerValidator,
        triggerAllValidations,
      }}
    >
      {children}
    </FormValidationContext.Provider>
  );
}

/** Access the form validation state and helpers. Must be used inside FormValidationProvider. */
export function useFormValidation(): FormValidationContextValue {
  const ctx = useContext(FormValidationContext);
  if (!ctx) {
    throw new Error("useFormValidation must be used within a FormValidationProvider");
  }
  return ctx;
}
