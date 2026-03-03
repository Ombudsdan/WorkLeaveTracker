import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { FormValidationProvider } from "@/contexts/FormValidationContext";
import EditLeaveModal from "@/components/dashboard/EditLeaveModal";
import { LeaveStatus, LeaveType, LeaveDuration } from "@/types";
import type { LeaveEntry } from "@/types";

// Fix "today" so calendar tests are deterministic
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

// EditLeaveModal provides its own FormValidationProvider; wrapping in one
// here mirrors the real app environment and is harmless.
function renderModal(ui: React.ReactElement) {
  return render(<FormValidationProvider>{ui}</FormValidationProvider>);
}

describe("EditLeaveModal — rendering", () => {
  it("renders the modal heading", () => {
    renderModal(<EditLeaveModal entry={entry} onClose={jest.fn()} onSave={jest.fn()} />);
    expect(screen.getByRole("heading", { name: "Edit Leave" })).toBeInTheDocument();
  });

  it("pre-selects Full day(s) Duration button for a full-day entry", () => {
    renderModal(<EditLeaveModal entry={entry} onClose={jest.fn()} onSave={jest.fn()} />);
    expect(screen.getByRole("button", { name: "Full day(s)" })).toHaveAttribute(
      "aria-pressed",
      "true"
    );
    expect(screen.getByRole("button", { name: "Half Day AM" })).toHaveAttribute(
      "aria-pressed",
      "false"
    );
    expect(screen.getByRole("button", { name: "Half Day PM" })).toHaveAttribute(
      "aria-pressed",
      "false"
    );
  });

  it("shows the entry start and end dates in the DateRangePicker summary", () => {
    renderModal(<EditLeaveModal entry={entry} onClose={jest.fn()} onSave={jest.fn()} />);
    // DateRangePicker renders "From: 2026-03-09" and "To: 2026-03-13" as text nodes
    expect(screen.getByText("2026-03-09")).toBeInTheDocument();
    expect(screen.getByText("2026-03-13")).toBeInTheDocument();
  });

  it("does not show the Type section when sick leave is disabled (Holiday auto-set)", () => {
    renderModal(<EditLeaveModal entry={entry} onClose={jest.fn()} onSave={jest.fn()} />);
    // Type section hidden when SICK_LEAVE_ENABLED=false
    expect(screen.queryByText("Type")).toBeNull();
    expect(screen.queryByRole("button", { name: "Holiday" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Sick" })).toBeNull();
  });

  it("pre-fills Reason with the entry's notes", () => {
    renderModal(<EditLeaveModal entry={entry} onClose={jest.fn()} onSave={jest.fn()} />);
    expect(screen.getByLabelText("Reason")).toHaveValue("Skiing");
  });

  it("handles missing notes gracefully (defaults to empty string)", () => {
    const entryNoNotes = { ...entry, notes: undefined };
    renderModal(<EditLeaveModal entry={entryNoNotes} onClose={jest.fn()} onSave={jest.fn()} />);
    expect(screen.getByLabelText("Reason")).toHaveValue("");
  });

  it("pre-selects the entry's status pill as aria-pressed=true", () => {
    renderModal(<EditLeaveModal entry={entry} onClose={jest.fn()} onSave={jest.fn()} />);
    expect(screen.getByRole("button", { name: "Planned" })).toHaveAttribute("aria-pressed", "true");
  });

  it("renders all status option pills for non-sick entries", () => {
    renderModal(<EditLeaveModal entry={entry} onClose={jest.fn()} onSave={jest.fn()} />);
    expect(screen.getByRole("button", { name: "Planned" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Requested" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Approved" })).toBeInTheDocument();
  });

  it("shows status picker for a sick-entry since type is normalised to Holiday when feature is off", () => {
    const sickEntry = { ...entry, type: LeaveType.Sick };
    renderModal(<EditLeaveModal entry={sickEntry} onClose={jest.fn()} onSave={jest.fn()} />);
    // Type is normalised to Holiday when SICK_LEAVE_ENABLED=false, so status picker is shown
    expect(screen.getByRole("button", { name: "Planned" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Requested" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Approved" })).toBeInTheDocument();
    expect(screen.queryByText(/automatically set to/i)).toBeNull();
  });

  it("renders the Save Changes and Cancel buttons", () => {
    renderModal(<EditLeaveModal entry={entry} onClose={jest.fn()} onSave={jest.fn()} />);
    expect(screen.getByRole("button", { name: "Save Changes" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();
  });
});

describe("EditLeaveModal — onSave", () => {
  it("calls onSave with the original entry data when Save Changes is clicked immediately", async () => {
    const user = setup();
    const onSave = jest.fn();
    renderModal(<EditLeaveModal entry={entry} onClose={jest.fn()} onSave={onSave} />);
    await user.click(screen.getByRole("button", { name: "Save Changes" }));
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "e1",
        startDate: "2026-03-09",
        endDate: "2026-03-13",
        status: LeaveStatus.Planned,
        notes: "Skiing",
      })
    );
  });

  it("calls onSave with updated status when the user clicks an Approved pill", async () => {
    const user = setup();
    const onSave = jest.fn();
    renderModal(<EditLeaveModal entry={entry} onClose={jest.fn()} onSave={onSave} />);
    await user.click(screen.getByRole("button", { name: "Approved" }));
    await user.click(screen.getByRole("button", { name: "Save Changes" }));
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ status: LeaveStatus.Approved }));
  });

  it("preserves the original entry id in the saved result", async () => {
    const user = setup();
    const onSave = jest.fn();
    renderModal(<EditLeaveModal entry={entry} onClose={jest.fn()} onSave={onSave} />);
    await user.click(screen.getByRole("button", { name: "Save Changes" }));
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ id: "e1" }));
  });

  it("saves with Holiday type (normalised from sick) when sick leave is disabled", async () => {
    const user = setup();
    const sickEntry = { ...entry, type: LeaveType.Sick, status: LeaveStatus.Requested };
    const onSave = jest.fn();
    renderModal(<EditLeaveModal entry={sickEntry} onClose={jest.fn()} onSave={onSave} />);
    // Type is normalised to Holiday; status picker visible — select Planned
    await user.click(screen.getByRole("button", { name: /Planned/i }));
    await user.click(screen.getByRole("button", { name: "Save Changes" }));
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ type: LeaveType.Holiday, status: LeaveStatus.Planned })
    );
  });
});

describe("EditLeaveModal — reason update", () => {
  it("calls onSave with updated reason when the reason field is changed", async () => {
    const user = setup();
    const onSave = jest.fn();
    renderModal(<EditLeaveModal entry={entry} onClose={jest.fn()} onSave={onSave} />);
    const reasonField = screen.getByLabelText("Reason");
    await user.clear(reasonField);
    await user.type(reasonField, "Updated note");
    await user.click(screen.getByRole("button", { name: "Save Changes" }));
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ notes: "Updated note" }));
  });

  it("calls onSave with updated dates when dates are re-selected in the calendar", async () => {
    const user = setup();
    const onSave = jest.fn();
    renderModal(<EditLeaveModal entry={entry} onClose={jest.fn()} onSave={onSave} />);
    // Click day 10 to start a new selection, then day 11 as end
    await user.click(screen.getByRole("button", { name: "2026-03-10" }));
    await user.click(screen.getByRole("button", { name: "2026-03-11" }));
    await user.click(screen.getByRole("button", { name: "Save Changes" }));
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ startDate: "2026-03-10", endDate: "2026-03-11" })
    );
  });
});

describe("EditLeaveModal — onClose", () => {
  it("calls onClose when the Cancel button is clicked", async () => {
    const user = setup();
    const onClose = jest.fn();
    renderModal(<EditLeaveModal entry={entry} onClose={onClose} onSave={jest.fn()} />);
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

describe("EditLeaveModal — half-day editing", () => {
  const halfDayEntry: LeaveEntry = {
    id: "e-hd",
    startDate: "2026-03-09",
    endDate: "2026-03-09",
    status: LeaveStatus.Approved,
    type: LeaveType.Holiday,
    notes: "Dentist",
    duration: LeaveDuration.HalfMorning,
  };

  it("pre-selects Half Day AM Duration button for an AM half-day entry", () => {
    renderModal(<EditLeaveModal entry={halfDayEntry} onClose={jest.fn()} onSave={jest.fn()} />);
    expect(screen.getByRole("button", { name: "Half Day AM" })).toHaveAttribute(
      "aria-pressed",
      "true"
    );
    expect(screen.getByRole("button", { name: "Full day(s)" })).toHaveAttribute(
      "aria-pressed",
      "false"
    );
  });

  it("pre-selects Half Day PM Duration button for a PM half-day entry", () => {
    const pmEntry = { ...halfDayEntry, duration: LeaveDuration.HalfAfternoon };
    renderModal(<EditLeaveModal entry={pmEntry} onClose={jest.fn()} onSave={jest.fn()} />);
    expect(screen.getByRole("button", { name: "Half Day PM" })).toHaveAttribute(
      "aria-pressed",
      "true"
    );
  });

  it("also pre-selects correctly for legacy halfDay/halfDayPeriod entries", () => {
    const legacyEntry: LeaveEntry = {
      id: "e-legacy",
      startDate: "2026-03-09",
      endDate: "2026-03-09",
      status: LeaveStatus.Approved,
      type: LeaveType.Holiday,
      notes: "Legacy",
      halfDay: true,
      halfDayPeriod: "pm",
    };
    renderModal(<EditLeaveModal entry={legacyEntry} onClose={jest.fn()} onSave={jest.fn()} />);
    expect(screen.getByRole("button", { name: "Half Day PM" })).toHaveAttribute(
      "aria-pressed",
      "true"
    );
  });

  it("shows the half-day date in the DateRangePicker summary", () => {
    renderModal(<EditLeaveModal entry={halfDayEntry} onClose={jest.fn()} onSave={jest.fn()} />);
    expect(screen.getByText("2026-03-09")).toBeInTheDocument();
  });

  it("saves with duration=halfMorning for an AM half-day entry", async () => {
    const user = setup();
    const onSave = jest.fn();
    renderModal(<EditLeaveModal entry={halfDayEntry} onClose={jest.fn()} onSave={onSave} />);
    await user.click(screen.getByRole("button", { name: "Save Changes" }));
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ duration: LeaveDuration.HalfMorning })
    );
  });

  it("saves with duration=halfAfternoon when switched to Half Day PM", async () => {
    const user = setup();
    const onSave = jest.fn();
    renderModal(<EditLeaveModal entry={halfDayEntry} onClose={jest.fn()} onSave={onSave} />);
    await user.click(screen.getByRole("button", { name: "Half Day PM" }));
    // Re-select the date (duration change clears dates)
    await user.click(screen.getByRole("button", { name: "2026-03-09" }));
    await user.click(screen.getByRole("button", { name: "Save Changes" }));
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ duration: LeaveDuration.HalfAfternoon })
    );
  });

  it("preserves notes when Duration is changed (Type section hidden when sick leave disabled)", async () => {
    const user = setup();
    renderModal(<EditLeaveModal entry={halfDayEntry} onClose={jest.fn()} onSave={jest.fn()} />);
    // Change duration — type section is hidden but notes should still be present
    await user.click(screen.getByRole("button", { name: "Full day(s)" }));
    // Type picker is hidden when SICK_LEAVE_ENABLED=false
    expect(screen.queryByText("Type")).toBeNull();
    expect(screen.getByLabelText("Reason")).toHaveValue("Dentist");
  });
});
