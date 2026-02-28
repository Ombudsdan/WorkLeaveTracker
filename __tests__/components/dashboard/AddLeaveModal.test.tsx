import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { FormValidationProvider } from "@/contexts/FormValidationContext";
import AddLeaveModal from "@/components/dashboard/AddLeaveModal";
import { LeaveStatus, LeaveType } from "@/types";

function renderInProvider(ui: React.ReactElement) {
  return render(<FormValidationProvider>{ui}</FormValidationProvider>);
}

describe("AddLeaveModal — rendering", () => {
  it("renders the modal heading", () => {
    renderInProvider(<AddLeaveModal onClose={jest.fn()} onSave={jest.fn()} />);
    expect(screen.getByRole("heading", { name: "Add Leave" })).toBeInTheDocument();
  });

  it("renders Start Date and End Date fields", () => {
    renderInProvider(<AddLeaveModal onClose={jest.fn()} onSave={jest.fn()} />);
    expect(screen.getByLabelText("Start Date")).toBeInTheDocument();
    expect(screen.getByLabelText("End Date")).toBeInTheDocument();
  });

  it("renders Status and Type selects with the correct initial options", () => {
    renderInProvider(<AddLeaveModal onClose={jest.fn()} onSave={jest.fn()} />);
    expect(screen.getByLabelText("Status")).toBeInTheDocument();
    expect(screen.getByLabelText("Type")).toBeInTheDocument();
    // All status options must be present
    expect(screen.getByRole("option", { name: /Planned/i })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: /Requested/i })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: /Approved/i })).toBeInTheDocument();
    // Type options
    expect(screen.getByRole("option", { name: "Holiday" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Sick" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Other" })).toBeInTheDocument();
  });

  it("renders the Add Leave and Cancel buttons", () => {
    renderInProvider(<AddLeaveModal onClose={jest.fn()} onSave={jest.fn()} />);
    expect(screen.getByRole("button", { name: "Add Leave" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();
  });

  it("renders the optional Notes field", () => {
    renderInProvider(<AddLeaveModal onClose={jest.fn()} onSave={jest.fn()} />);
    expect(screen.getByLabelText("Notes (optional)")).toBeInTheDocument();
  });
});

describe("AddLeaveModal — Save button disabled state", () => {
  it("disables 'Add Leave' when no dates are set", () => {
    renderInProvider(<AddLeaveModal onClose={jest.fn()} onSave={jest.fn()} />);
    expect(screen.getByRole("button", { name: "Add Leave" })).toBeDisabled();
  });

  it("disables 'Add Leave' when only the start date is set", async () => {
    renderInProvider(<AddLeaveModal onClose={jest.fn()} onSave={jest.fn()} />);
    await userEvent.type(screen.getByLabelText("Start Date"), "2026-03-09");
    expect(screen.getByRole("button", { name: "Add Leave" })).toBeDisabled();
  });

  it("enables 'Add Leave' once both dates are filled", async () => {
    renderInProvider(<AddLeaveModal onClose={jest.fn()} onSave={jest.fn()} />);
    await userEvent.type(screen.getByLabelText("Start Date"), "2026-03-09");
    await userEvent.type(screen.getByLabelText("End Date"), "2026-03-13");
    expect(screen.getByRole("button", { name: "Add Leave" })).toBeEnabled();
  });
});

describe("AddLeaveModal — onSave", () => {
  it("calls onSave with the correct entry data when Add Leave is clicked", async () => {
    const onSave = jest.fn();
    renderInProvider(<AddLeaveModal onClose={jest.fn()} onSave={onSave} />);
    await userEvent.type(screen.getByLabelText("Start Date"), "2026-03-09");
    await userEvent.type(screen.getByLabelText("End Date"), "2026-03-13");
    await userEvent.type(screen.getByLabelText("Notes (optional)"), "Beach trip");
    await userEvent.click(screen.getByRole("button", { name: "Add Leave" }));
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        startDate: "2026-03-09",
        endDate: "2026-03-13",
        status: LeaveStatus.Planned,
        type: LeaveType.Holiday,
        notes: "Beach trip",
      })
    );
  });

  it("calls onSave with the chosen status when user changes the Status select", async () => {
    const onSave = jest.fn();
    renderInProvider(<AddLeaveModal onClose={jest.fn()} onSave={onSave} />);
    await userEvent.type(screen.getByLabelText("Start Date"), "2026-03-09");
    await userEvent.type(screen.getByLabelText("End Date"), "2026-03-09");
    await userEvent.selectOptions(screen.getByLabelText("Status"), LeaveStatus.Approved);
    await userEvent.click(screen.getByRole("button", { name: "Add Leave" }));
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ status: LeaveStatus.Approved }));
  });
  it("calls onSave with the chosen type when user changes the Type select", async () => {
    const onSave = jest.fn();
    renderInProvider(<AddLeaveModal onClose={jest.fn()} onSave={onSave} />);
    await userEvent.type(screen.getByLabelText("Start Date"), "2026-03-09");
    await userEvent.type(screen.getByLabelText("End Date"), "2026-03-09");
    await userEvent.selectOptions(screen.getByLabelText("Type"), LeaveType.Sick);
    await userEvent.click(screen.getByRole("button", { name: "Add Leave" }));
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ type: LeaveType.Sick }));
  });
});

describe("AddLeaveModal — onClose", () => {
  it("calls onClose when the Cancel button is clicked", async () => {
    const onClose = jest.fn();
    renderInProvider(<AddLeaveModal onClose={onClose} onSave={jest.fn()} />);
    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
