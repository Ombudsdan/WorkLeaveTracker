/**
 * Tests for LeaveForm behaviour when SICK_LEAVE_ENABLED=true.
 * Exercises the sick-type auto-status logic (lines 121, 123-125).
 */

jest.mock("@/utils/features", () => ({
  SICK_LEAVE_ENABLED: true,
}));

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { FormValidationProvider } from "@/contexts/FormValidationContext";
import AddLeaveModal from "@/components/dashboard/AddLeaveModal";
import { LeaveStatus, LeaveType } from "@/types";

beforeEach(() => {
  jest.useFakeTimers();
  jest.setSystemTime(new Date("2026-03-01"));
});

afterEach(() => {
  jest.useRealTimers();
});

function setup() {
  return userEvent.setup({ advanceTimers: jest.advanceTimersByTime.bind(jest) });
}

function renderModal(ui: React.ReactElement) {
  return render(<FormValidationProvider>{ui}</FormValidationProvider>);
}

describe("LeaveForm — sick leave enabled: Sick type button visible", () => {
  it("shows the Sick type button when SICK_LEAVE_ENABLED is true", () => {
    renderModal(<AddLeaveModal onClose={jest.fn()} onSave={jest.fn()} />);
    expect(screen.getByRole("button", { name: "Sick" })).toBeInTheDocument();
  });
});

describe("LeaveForm — sick type auto-sets status to Approved", () => {
  it("hides the status picker and shows the auto-approved notice when Sick is selected", async () => {
    const user = setup();
    renderModal(<AddLeaveModal onClose={jest.fn()} onSave={jest.fn()} />);
    await user.click(screen.getByRole("button", { name: "Sick" }));
    // Status picker should be hidden for sick leave
    expect(screen.queryByText("Status")).toBeNull();
    // Auto-approved notice should be visible
    expect(screen.getByText(/automatically set to/i)).toBeInTheDocument();
  });

  it("saves with status=Approved when Sick type is selected", async () => {
    const user = setup();
    const onSave = jest.fn();
    renderModal(<AddLeaveModal onClose={jest.fn()} onSave={onSave} />);
    await user.click(screen.getByRole("button", { name: "Sick" }));
    // Click the same date twice — first for start date, second for end date
    await user.click(screen.getByRole("button", { name: "2026-03-09" }));
    await user.click(screen.getByRole("button", { name: "2026-03-09" }));
    await user.type(screen.getByLabelText("Reason"), "Flu");
    await user.click(screen.getByRole("button", { name: "Save" }));
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ type: LeaveType.Sick, status: LeaveStatus.Approved })
    );
  });
});

describe("LeaveForm — switching away from Sick resets status", () => {
  it("shows the status picker again when switching from Sick back to Holiday", async () => {
    const user = setup();
    renderModal(<AddLeaveModal onClose={jest.fn()} onSave={jest.fn()} />);
    // Switch to Sick (auto-sets status, hides picker)
    await user.click(screen.getByRole("button", { name: "Sick" }));
    expect(screen.queryByText("Status")).toBeNull();
    // Switch back to Holiday (status should be reset, picker re-shown)
    await user.click(screen.getByRole("button", { name: "Holiday" }));
    expect(screen.getByText("Status")).toBeInTheDocument();
  });

  it("does not pre-select any status after switching from Sick to Holiday", async () => {
    const user = setup();
    renderModal(<AddLeaveModal onClose={jest.fn()} onSave={jest.fn()} />);
    await user.click(screen.getByRole("button", { name: "Sick" }));
    await user.click(screen.getByRole("button", { name: "Holiday" }));
    // All status buttons should be unselected
    expect(screen.getByRole("button", { name: /Planned/i })).toHaveAttribute(
      "aria-pressed",
      "false"
    );
    expect(screen.getByRole("button", { name: /Approved/i })).toHaveAttribute(
      "aria-pressed",
      "false"
    );
  });
});
