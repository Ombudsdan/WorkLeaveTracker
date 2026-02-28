import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { FormValidationProvider, useFormValidation } from "@/contexts/FormValidationContext";
import LeaveOptionPicker from "@/components/LeaveOptionPicker";
import { LeaveType } from "@/types";
import { LEAVE_TYPE_LABELS, LEAVE_TYPE_ORDER } from "@/variables/leaveConfig";

const typeOptions = LEAVE_TYPE_ORDER.map((t) => ({ value: t, label: LEAVE_TYPE_LABELS[t] }));

function TriggerButton() {
  const { triggerAllValidations } = useFormValidation();
  return (
    <button type="button" onClick={() => triggerAllValidations()}>
      Validate
    </button>
  );
}

function renderInProvider(ui: React.ReactElement) {
  return render(<FormValidationProvider>{ui}</FormValidationProvider>);
}

// ---------------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------------
describe("LeaveOptionPicker — rendering", () => {
  it("renders the label", () => {
    renderInProvider(
      <LeaveOptionPicker
        id="type"
        label="Type"
        options={typeOptions}
        value=""
        onChange={jest.fn()}
      />
    );
    expect(screen.getByText("Type")).toBeInTheDocument();
  });

  it("renders a button for each option", () => {
    renderInProvider(
      <LeaveOptionPicker
        id="type"
        label="Type"
        options={typeOptions}
        value=""
        onChange={jest.fn()}
      />
    );
    expect(screen.getByRole("button", { name: "Holiday" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sick" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Other" })).toBeInTheDocument();
  });

  it("all buttons are aria-pressed=false when no value is selected", () => {
    renderInProvider(
      <LeaveOptionPicker
        id="type"
        label="Type"
        options={typeOptions}
        value=""
        onChange={jest.fn()}
      />
    );
    typeOptions.forEach(({ label }) => {
      expect(screen.getByRole("button", { name: label })).toHaveAttribute("aria-pressed", "false");
    });
  });

  it("marks the selected option as aria-pressed=true", () => {
    renderInProvider(
      <LeaveOptionPicker
        id="type"
        label="Type"
        options={typeOptions}
        value={LeaveType.Sick}
        onChange={jest.fn()}
      />
    );
    expect(screen.getByRole("button", { name: "Sick" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Holiday" })).toHaveAttribute(
      "aria-pressed",
      "false"
    );
  });
});

// ---------------------------------------------------------------------------
// Interaction
// ---------------------------------------------------------------------------
describe("LeaveOptionPicker — interaction", () => {
  it("calls onChange with the clicked option value", async () => {
    const onChange = jest.fn();
    renderInProvider(
      <LeaveOptionPicker
        id="type"
        label="Type"
        options={typeOptions}
        value=""
        onChange={onChange}
      />
    );
    await userEvent.click(screen.getByRole("button", { name: "Sick" }));
    expect(onChange).toHaveBeenCalledWith(LeaveType.Sick);
  });
});

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------
describe("LeaveOptionPicker — validation", () => {
  it("shows default required error via triggerAllValidations when no value selected", async () => {
    renderInProvider(
      <>
        <LeaveOptionPicker
          id="type"
          label="Type"
          options={typeOptions}
          value=""
          onChange={jest.fn()}
          required
        />
        <TriggerButton />
      </>
    );
    await userEvent.click(screen.getByRole("button", { name: "Validate" }));
    expect(screen.getByText("Type is required")).toBeInTheDocument();
  });

  it("shows a custom required error message when required is a string", async () => {
    renderInProvider(
      <>
        <LeaveOptionPicker
          id="type"
          label="Type"
          options={typeOptions}
          value=""
          onChange={jest.fn()}
          required="Please pick a leave type"
        />
        <TriggerButton />
      </>
    );
    await userEvent.click(screen.getByRole("button", { name: "Validate" }));
    expect(screen.getByText("Please pick a leave type")).toBeInTheDocument();
  });

  it("clears the error when an option is clicked", async () => {
    renderInProvider(
      <>
        <LeaveOptionPicker
          id="type"
          label="Type"
          options={typeOptions}
          value=""
          onChange={jest.fn()}
          required
        />
        <TriggerButton />
      </>
    );
    await userEvent.click(screen.getByRole("button", { name: "Validate" }));
    expect(screen.getByText("Type is required")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Holiday" }));
    expect(screen.queryByText("Type is required")).toBeNull();
  });

  it("does not show an error when a value is already selected", async () => {
    renderInProvider(
      <>
        <LeaveOptionPicker
          id="type"
          label="Type"
          options={typeOptions}
          value={LeaveType.Holiday}
          onChange={jest.fn()}
          required
        />
        <TriggerButton />
      </>
    );
    await userEvent.click(screen.getByRole("button", { name: "Validate" }));
    expect(screen.queryByText("Type is required")).toBeNull();
  });
});
