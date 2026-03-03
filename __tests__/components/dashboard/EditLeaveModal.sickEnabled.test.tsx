/**
 * Tests for EditLeaveModal behaviour when SICK_LEAVE_ENABLED=true.
 * Mirrors the sick-leave scenarios previously in EditLeaveModal.test.tsx,
 * covering: Type picker visible, sick type auto-approved status, switching types.
 */

jest.mock("@/utils/features", () => ({
  SICK_LEAVE_ENABLED: true,
}));

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { FormValidationProvider } from "@/contexts/FormValidationContext";
import EditLeaveModal from "@/components/dashboard/EditLeaveModal";
import { LeaveStatus, LeaveType } from "@/types";
import type { LeaveEntry } from "@/types";

beforeEach(() => {
  jest.useFakeTimers();
  jest.setSystemTime(new Date("2026-03-15"));
});

afterEach(() => {
  jest.useRealTimers();
});

function setup() {
  return userEvent.setup({ advanceTimers: jest.advanceTimersByTime.bind(jest) });
}

const entry: LeaveEntry = {
  id: "e1",
  startDate: "2026-03-09",
  endDate: "2026-03-13",
  status: LeaveStatus.Planned,
  type: LeaveType.Holiday,
  notes: "Skiing",
};

function renderModal(ui: React.ReactElement) {
  return render(<FormValidationProvider>{ui}</FormValidationProvider>);
}

describe("EditLeaveModal — sick leave enabled: Type section visible", () => {
  it("shows the Type picker with Holiday and Sick options", () => {
    renderModal(<EditLeaveModal entry={entry} onClose={jest.fn()} onSave={jest.fn()} />);
    expect(screen.getByText("Type")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Holiday" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sick" })).toBeInTheDocument();
  });

  it("pre-selects the entry's type (Holiday) with aria-pressed=true", () => {
    renderModal(<EditLeaveModal entry={entry} onClose={jest.fn()} onSave={jest.fn()} />);
    expect(screen.getByRole("button", { name: "Holiday" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Sick" })).toHaveAttribute("aria-pressed", "false");
  });
});

describe("EditLeaveModal — sick leave enabled: sick type hides status", () => {
  it("hides the status picker when a sick entry is being edited", () => {
    const sickEntry = { ...entry, type: LeaveType.Sick };
    renderModal(<EditLeaveModal entry={sickEntry} onClose={jest.fn()} onSave={jest.fn()} />);
    expect(screen.queryByRole("button", { name: "Planned" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Requested" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Approved" })).toBeNull();
    expect(screen.getByText(/automatically set to/i)).toBeInTheDocument();
  });

  it("forces status=Approved when saving a sick entry regardless of original status", async () => {
    const user = setup();
    const sickEntry = { ...entry, type: LeaveType.Sick, status: LeaveStatus.Requested };
    const onSave = jest.fn();
    renderModal(<EditLeaveModal entry={sickEntry} onClose={jest.fn()} onSave={onSave} />);
    await user.click(screen.getByRole("button", { name: "Save Changes" }));
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ status: LeaveStatus.Approved }));
  });
});

describe("EditLeaveModal — sick leave enabled: switching away from Sick restores status", () => {
  it("shows the status picker again when switching from Sick back to Holiday", async () => {
    const user = setup();
    const sickEntry = { ...entry, type: LeaveType.Sick };
    renderModal(<EditLeaveModal entry={sickEntry} onClose={jest.fn()} onSave={jest.fn()} />);
    expect(screen.queryByText("Status")).toBeNull();
    await user.click(screen.getByRole("button", { name: "Holiday" }));
    expect(screen.getByText("Status")).toBeInTheDocument();
  });

  it("does not pre-select any status after switching from Sick to Holiday", async () => {
    const user = setup();
    const sickEntry = { ...entry, type: LeaveType.Sick };
    renderModal(<EditLeaveModal entry={sickEntry} onClose={jest.fn()} onSave={jest.fn()} />);
    await user.click(screen.getByRole("button", { name: "Holiday" }));
    expect(screen.getByRole("button", { name: /Planned/i })).toHaveAttribute(
      "aria-pressed",
      "false"
    );
    expect(screen.getByRole("button", { name: /Approved/i })).toHaveAttribute(
      "aria-pressed",
      "false"
    );
  });

  it("preserves type and notes when Duration is changed with sick leave enabled", async () => {
    const user = setup();
    renderModal(<EditLeaveModal entry={entry} onClose={jest.fn()} onSave={jest.fn()} />);
    await user.click(screen.getByRole("button", { name: "Half Day AM" }));
    expect(screen.getByRole("button", { name: "Holiday" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByLabelText("Reason")).toHaveValue("Skiing");
  });
});
