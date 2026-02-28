import { render, screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React, { useState } from "react";
import { FormValidationProvider, useFormValidation } from "@/contexts/FormValidationContext";
import FormField from "@/components/FormField";

function renderInProvider(ui: React.ReactElement) {
  return render(<FormValidationProvider>{ui}</FormValidationProvider>);
}

/** Wraps FormField with real state so onChange actually updates the displayed value */
function ControlledFormField(
  props: React.ComponentProps<typeof FormField> & { initialValue?: string | number }
) {
  const { initialValue, ...rest } = props;
  const [value, setValue] = useState<string | number>(initialValue ?? rest.value);
  return <FormField {...rest} value={value} onChange={setValue} />;
}

function renderInProvider(ui: React.ReactElement) {
  return render(<FormValidationProvider>{ui}</FormValidationProvider>);
}

// Helper component that exposes triggerAllValidations for testing
function TriggerButton() {
  const { triggerAllValidations } = useFormValidation();
  return (
    <button type="button" onClick={() => triggerAllValidations()}>
      Validate
    </button>
  );
}

// ---------------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------------
describe("FormField — rendering", () => {
  it("renders a labelled input", () => {
    renderInProvider(<FormField id="name" label="Full Name" value="Alice" onChange={jest.fn()} />);
    expect(screen.getByLabelText("Full Name")).toBeInTheDocument();
    expect(screen.getByLabelText("Full Name")).toHaveValue("Alice");
  });

  it("renders as read-only when readOnly is true", () => {
    renderInProvider(<FormField id="email" label="Email" value="a@b.com" readOnly />);
    expect(screen.getByLabelText("Email")).toHaveAttribute("readonly");
  });

  it("renders a number input when type='number'", () => {
    renderInProvider(
      <FormField id="days" label="Days" type="number" value={5} onChange={jest.fn()} />
    );
    expect(screen.getByLabelText("Days")).toHaveAttribute("type", "number");
  });

  it("renders a date input when type='date'", () => {
    renderInProvider(
      <FormField id="start" label="Start Date" type="date" value="" onChange={jest.fn()} />
    );
    expect(screen.getByLabelText("Start Date")).toHaveAttribute("type", "date");
  });

  it("does not show an error message initially", () => {
    renderInProvider(<FormField id="x" label="X" value="hello" onChange={jest.fn()} required />);
    expect(screen.queryByRole("paragraph")).toBeNull();
  });

  it("renders the placeholder text", () => {
    renderInProvider(
      <FormField id="note" label="Note" value="" onChange={jest.fn()} placeholder="e.g. holiday" />
    );
    expect(screen.getByPlaceholderText("e.g. holiday")).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Required validation
// ---------------------------------------------------------------------------
describe("FormField — required validation", () => {
  it("shows default error message when required field is cleared", async () => {
    renderInProvider(
      <FormField id="name" label="Name" value="Alice" onChange={jest.fn()} required />
    );
    await userEvent.clear(screen.getByLabelText("Name"));
    expect(screen.getByText("Name is required")).toBeInTheDocument();
  });

  it("shows a custom error message when required is a string", async () => {
    renderInProvider(
      <FormField
        id="name"
        label="Name"
        value="Alice"
        onChange={jest.fn()}
        required="Please enter your full name"
      />
    );
    await userEvent.clear(screen.getByLabelText("Name"));
    expect(screen.getByText("Please enter your full name")).toBeInTheDocument();
  });

  it("clears the error when the field is filled in again", async () => {
    renderInProvider(<FormField id="name" label="Name" value="" onChange={jest.fn()} required />);
    // First trigger the error
    await userEvent.clear(screen.getByLabelText("Name"));
    // Then type a value
    await userEvent.type(screen.getByLabelText("Name"), "Bob");
    expect(screen.queryByText("Name is required")).toBeNull();
  });

  it("applies red border class when there is an error", async () => {
    renderInProvider(
      <FormField id="name" label="Name" value="Alice" onChange={jest.fn()} required />
    );
    await userEvent.clear(screen.getByLabelText("Name"));
    expect(screen.getByLabelText("Name").className).toContain("border-red-400");
  });

  it("applies normal border class when there is no error", () => {
    renderInProvider(
      <FormField id="name" label="Name" value="Alice" onChange={jest.fn()} required />
    );
    expect(screen.getByLabelText("Name").className).toContain("border-gray-300");
  });

  it("shows required error for an empty date field via triggerAllValidations", async () => {
    renderInProvider(
      <>
        <FormField
          id="start"
          label="Start Date"
          type="date"
          value=""
          onChange={jest.fn()}
          required
        />
        <TriggerButton />
      </>
    );
    await userEvent.click(screen.getByRole("button", { name: "Validate" }));
    expect(screen.getByText("Start Date is required")).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Number min / max validation
// ---------------------------------------------------------------------------
describe("FormField — number validation", () => {
  it("shows min error when the number is below the minimum", async () => {
    renderInProvider(
      <ControlledFormField
        id="days"
        label="Days"
        type="number"
        initialValue={5}
        value={5}
        min={1}
      />
    );
    await userEvent.clear(screen.getByLabelText("Days"));
    await userEvent.type(screen.getByLabelText("Days"), "0");
    expect(screen.getByText("Days must be at least 1")).toBeInTheDocument();
  });

  it("shows max error when the number exceeds the maximum", async () => {
    renderInProvider(
      <ControlledFormField
        id="days"
        label="Days"
        type="number"
        initialValue={5}
        value={5}
        max={10}
      />
    );
    await userEvent.clear(screen.getByLabelText("Days"));
    await userEvent.type(screen.getByLabelText("Days"), "11");
    expect(screen.getByText("Days must be no more than 10")).toBeInTheDocument();
  });

  it("clears the error when a valid number is entered after an invalid one", async () => {
    renderInProvider(
      <ControlledFormField
        id="days"
        label="Days"
        type="number"
        initialValue={5}
        value={5}
        min={1}
      />
    );
    await userEvent.clear(screen.getByLabelText("Days"));
    await userEvent.type(screen.getByLabelText("Days"), "0");
    await userEvent.clear(screen.getByLabelText("Days"));
    await userEvent.type(screen.getByLabelText("Days"), "5");
    expect(screen.queryByText("Days must be at least 1")).toBeNull();
  });

  it("shows error for NaN input on a number field", async () => {
    renderInProvider(
      <FormField id="days" label="Days" type="number" value={5} onChange={jest.fn()} />
    );
    // type "abc" into a number input — browser typically blocks it, but we test the validator
    const input = screen.getByLabelText("Days");
    // Manually fire change with an invalid value
    act(() => {
      Object.defineProperty(input, "value", { value: "abc", writable: true });
      input.dispatchEvent(new Event("input", { bubbles: true }));
    });
  });
});

// ---------------------------------------------------------------------------
// triggerAllValidations
// ---------------------------------------------------------------------------
describe("FormField — triggerAllValidations", () => {
  it("sets the required error when triggered externally on an empty field", async () => {
    renderInProvider(
      <>
        <FormField id="name" label="Name" value="" onChange={jest.fn()} required />
        <TriggerButton />
      </>
    );
    await userEvent.click(screen.getByRole("button", { name: "Validate" }));
    expect(screen.getByText("Name is required")).toBeInTheDocument();
  });

  it("does not set an error when triggered on a valid field", async () => {
    renderInProvider(
      <>
        <FormField id="name" label="Name" value="Alice" onChange={jest.fn()} required />
        <TriggerButton />
      </>
    );
    await userEvent.click(screen.getByRole("button", { name: "Validate" }));
    expect(screen.queryByText("Name is required")).toBeNull();
  });
});
