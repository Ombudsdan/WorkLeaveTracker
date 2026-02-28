import { renderHook, act } from "@testing-library/react";
import React from "react";
import { FormValidationProvider, useFormValidation } from "@/contexts/FormValidationContext";

function wrapper({ children }: { children: React.ReactNode }) {
  return <FormValidationProvider>{children}</FormValidationProvider>;
}

describe("useFormValidation — outside provider", () => {
  it("throws when used outside FormValidationProvider", () => {
    const consoleError = jest.spyOn(console, "error").mockImplementation(() => {});
    expect(() => renderHook(() => useFormValidation())).toThrow(
      "useFormValidation must be used within a FormValidationProvider"
    );
    consoleError.mockRestore();
  });
});

describe("useFormValidation — setError / getError / clearError", () => {
  it("setError stores a message retrievable by getError", () => {
    const { result } = renderHook(() => useFormValidation(), { wrapper });
    act(() => result.current.setError("name", "Name is required"));
    expect(result.current.getError("name")).toBe("Name is required");
  });

  it("clearError removes a specific error while leaving others intact", () => {
    const { result } = renderHook(() => useFormValidation(), { wrapper });
    act(() => {
      result.current.setError("name", "Name is required");
      result.current.setError("email", "Email is required");
    });
    act(() => result.current.clearError("name"));
    expect(result.current.getError("name")).toBeUndefined();
    expect(result.current.getError("email")).toBe("Email is required");
  });

  it("getError returns undefined for a field with no error", () => {
    const { result } = renderHook(() => useFormValidation(), { wrapper });
    expect(result.current.getError("unknown")).toBeUndefined();
  });

  it("setError overwrites an existing error for the same field", () => {
    const { result } = renderHook(() => useFormValidation(), { wrapper });
    act(() => result.current.setError("name", "First error"));
    act(() => result.current.setError("name", "Second error"));
    expect(result.current.getError("name")).toBe("Second error");
  });
});

describe("useFormValidation — clearAllErrors", () => {
  it("removes all errors at once", () => {
    const { result } = renderHook(() => useFormValidation(), { wrapper });
    act(() => {
      result.current.setError("a", "Error A");
      result.current.setError("b", "Error B");
    });
    act(() => result.current.clearAllErrors());
    expect(result.current.errors).toEqual({});
    expect(result.current.hasErrors).toBe(false);
  });
});

describe("useFormValidation — hasErrors", () => {
  it("is false when there are no errors", () => {
    const { result } = renderHook(() => useFormValidation(), { wrapper });
    expect(result.current.hasErrors).toBe(false);
  });

  it("is true when there is at least one error", () => {
    const { result } = renderHook(() => useFormValidation(), { wrapper });
    act(() => result.current.setError("x", "oops"));
    expect(result.current.hasErrors).toBe(true);
  });
});

describe("useFormValidation — registerValidator / triggerAllValidations", () => {
  it("triggerAllValidations runs all registered validators and returns true when all pass", () => {
    const { result } = renderHook(() => useFormValidation(), { wrapper });
    const validatorA = jest.fn().mockReturnValue(true);
    const validatorB = jest.fn().mockReturnValue(true);
    act(() => {
      result.current.registerValidator("a", validatorA);
      result.current.registerValidator("b", validatorB);
    });
    let allValid: boolean = false;
    act(() => {
      allValid = result.current.triggerAllValidations();
    });
    expect(validatorA).toHaveBeenCalledTimes(1);
    expect(validatorB).toHaveBeenCalledTimes(1);
    expect(allValid).toBe(true);
  });

  it("triggerAllValidations returns false when at least one validator fails", () => {
    const { result } = renderHook(() => useFormValidation(), { wrapper });
    act(() => {
      result.current.registerValidator("a", () => true);
      result.current.registerValidator("b", () => false);
    });
    let allValid: boolean = true;
    act(() => {
      allValid = result.current.triggerAllValidations();
    });
    expect(allValid).toBe(false);
  });

  it("unsubscribing removes the validator from triggerAllValidations", () => {
    const { result } = renderHook(() => useFormValidation(), { wrapper });
    const validator = jest.fn().mockReturnValue(true);
    let unsub: () => void;
    act(() => {
      unsub = result.current.registerValidator("a", validator);
    });
    act(() => unsub());
    act(() => result.current.triggerAllValidations());
    expect(validator).not.toHaveBeenCalled();
  });

  it("registerValidator overwrites a previously registered validator for the same id", () => {
    const { result } = renderHook(() => useFormValidation(), { wrapper });
    const first = jest.fn().mockReturnValue(false);
    const second = jest.fn().mockReturnValue(true);
    act(() => {
      result.current.registerValidator("a", first);
      result.current.registerValidator("a", second);
    });
    let allValid: boolean = false;
    act(() => {
      allValid = result.current.triggerAllValidations();
    });
    expect(second).toHaveBeenCalled();
    expect(allValid).toBe(true);
  });
});
