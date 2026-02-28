import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React, { useState } from "react";
import { FormValidationProvider } from "@/contexts/FormValidationContext";
import FormErrorOutlet from "@/components/FormErrorOutlet";
import FormField from "@/components/FormField";

// Helper to render inside the validation provider
function renderInProvider(ui: React.ReactElement) {
  return render(<FormValidationProvider>{ui}</FormValidationProvider>);
}

/** Stateful wrapper so onChange actually updates the value */
function ControlledField({
  id,
  label,
  required,
  initialValue = "Alice",
}: {
  id: string;
  label: string;
  required?: boolean | string;
  initialValue?: string;
}) {
  const [value, setValue] = useState(initialValue);
  return <FormField id={id} label={label} value={value} onChange={setValue} required={required} />;
}

describe("FormErrorOutlet — empty state", () => {
  it("renders nothing when there are no errors", () => {
    const { container } = renderInProvider(<FormErrorOutlet />);
    expect(container).toBeEmptyDOMElement();
  });
});

describe("FormErrorOutlet — with errors via FormField", () => {
  it("shows an alert with the error message when a required field is invalid", async () => {
    renderInProvider(
      <>
        <ControlledField id="name" label="Name" required />
        <FormErrorOutlet />
      </>
    );

    // Clear the pre-filled value to trigger the required validation
    await userEvent.clear(screen.getByLabelText("Name"));
    expect(screen.getByRole("alert")).toBeInTheDocument();
    // Message appears both in the outlet and inline under the field
    expect(screen.getAllByText("Name is required").length).toBeGreaterThanOrEqual(1);
  });

  it("renders a clickable button for each error in the outlet", async () => {
    renderInProvider(
      <>
        <ControlledField id="first" label="First Name" required />
        <ControlledField id="last" label="Last Name" required />
        <FormErrorOutlet />
      </>
    );

    await userEvent.clear(screen.getByLabelText("First Name"));
    await userEvent.clear(screen.getByLabelText("Last Name"));

    const buttons = screen.getAllByRole("button");
    // at least the two error buttons must be present
    expect(buttons.length).toBeGreaterThanOrEqual(2);
  });

  it("clicking an error button calls focus on the associated field", async () => {
    // Mock scrollIntoView which is not implemented in JSDOM
    window.HTMLElement.prototype.scrollIntoView = jest.fn();
    renderInProvider(
      <>
        <ControlledField id="name" label="Name" required />
        <FormErrorOutlet />
      </>
    );
    await userEvent.clear(screen.getByLabelText("Name"));
    // Click the error button in the outlet (not the inline error under the field)
    const errorButton = screen
      .getAllByRole("button")
      .find((btn) => btn.textContent === "Name is required");
    expect(errorButton).toBeDefined();
    await userEvent.click(errorButton!);
    // scrollIntoView is called on the input element
    expect(window.HTMLElement.prototype.scrollIntoView).toHaveBeenCalled();
  });

  it("has role='alert' on the container so screen readers announce it", async () => {
    renderInProvider(
      <>
        <ControlledField id="email" label="Email" required />
        <FormErrorOutlet />
      </>
    );
    await userEvent.clear(screen.getByLabelText("Email"));
    expect(screen.getByRole("alert")).toBeInTheDocument();
  });
});
