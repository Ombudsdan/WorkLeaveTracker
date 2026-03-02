import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { FormValidationProvider } from "@/contexts/FormValidationContext";
import EditLeaveModal from "@/components/dashboard/EditLeaveModal";
import { LeaveStatus, LeaveType } from "@/types";
import type { LeaveEntry } from "@/types";

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

  it("pre-fills Start Date with the entry's start date", () => {
    renderModal(<EditLeaveModal entry={entry} onClose={jest.fn()} onSave={jest.fn()} />);
    expect(screen.getByLabelText("Start Date")).toHaveValue("2026-03-09");
  });

  it("pre-fills End Date with the entry's end date", () => {
    renderModal(<EditLeaveModal entry={entry} onClose={jest.fn()} onSave={jest.fn()} />);
    expect(screen.getByLabelText("End Date")).toHaveValue("2026-03-13");
  });

  it("pre-selects the entry's status pill as aria-pressed=true", () => {
    renderModal(<EditLeaveModal entry={entry} onClose={jest.fn()} onSave={jest.fn()} />);
    expect(screen.getByRole("button", { name: "Planned" })).toHaveAttribute("aria-pressed", "true");
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

  it("renders all status option pills", () => {
    renderModal(<EditLeaveModal entry={entry} onClose={jest.fn()} onSave={jest.fn()} />);
    expect(screen.getByRole("button", { name: "Planned" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Requested" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Approved" })).toBeInTheDocument();
  });

  it("hides the status pills for sick-leave entries", () => {
    const sickEntry = { ...entry, type: LeaveType.Sick };
    renderModal(<EditLeaveModal entry={sickEntry} onClose={jest.fn()} onSave={jest.fn()} />);
    expect(screen.queryByRole("button", { name: "Planned" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Requested" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Approved" })).toBeNull();
    expect(screen.getByText(/automatically set to/i)).toBeInTheDocument();
  });
});

describe("EditLeaveModal — onSave", () => {
  it("calls onSave with the original entry data when Save Changes is clicked immediately", async () => {
    const onSave = jest.fn();
    renderModal(<EditLeaveModal entry={entry} onClose={jest.fn()} onSave={onSave} />);
    await userEvent.click(screen.getByRole("button", { name: "Save Changes" }));
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
    const onSave = jest.fn();
    renderModal(<EditLeaveModal entry={entry} onClose={jest.fn()} onSave={onSave} />);
    await userEvent.click(screen.getByRole("button", { name: "Approved" }));
    await userEvent.click(screen.getByRole("button", { name: "Save Changes" }));
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ status: LeaveStatus.Approved }));
  });

  it("preserves the original entry id in the saved result", async () => {
    const onSave = jest.fn();
    renderModal(<EditLeaveModal entry={entry} onClose={jest.fn()} onSave={onSave} />);
    await userEvent.click(screen.getByRole("button", { name: "Save Changes" }));
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ id: "e1" }));
  });

  it("forces Approved status for sick leave regardless of any clicks", async () => {
    const sickEntry = { ...entry, type: LeaveType.Sick, status: LeaveStatus.Requested };
    const onSave = jest.fn();
    renderModal(<EditLeaveModal entry={sickEntry} onClose={jest.fn()} onSave={onSave} />);
    await userEvent.click(screen.getByRole("button", { name: "Save Changes" }));
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ status: LeaveStatus.Approved }));
  });
});

describe("EditLeaveModal — reason update", () => {
  it("calls onSave with updated reason when the reason field is changed (stored as notes)", async () => {
    const onSave = jest.fn();
    renderModal(<EditLeaveModal entry={entry} onClose={jest.fn()} onSave={onSave} />);
    const reasonField = screen.getByLabelText("Reason");
    await userEvent.clear(reasonField);
    await userEvent.type(reasonField, "Updated note");
    await userEvent.click(screen.getByRole("button", { name: "Save Changes" }));
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ notes: "Updated note" }));
  });

  it("calls onSave with updated dates when the date fields are changed", async () => {
    const onSave = jest.fn();
    renderModal(<EditLeaveModal entry={entry} onClose={jest.fn()} onSave={onSave} />);
    const startField = screen.getByLabelText("Start Date");
    const endField = screen.getByLabelText("End Date");
    await userEvent.clear(startField);
    await userEvent.type(startField, "2026-04-07");
    await userEvent.clear(endField);
    await userEvent.type(endField, "2026-04-07");
    await userEvent.click(screen.getByRole("button", { name: "Save Changes" }));
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ startDate: "2026-04-07", endDate: "2026-04-07" })
    );
  });
});

describe("EditLeaveModal — onClose", () => {
  it("calls onClose when the Cancel button is clicked", async () => {
    const onClose = jest.fn();
    renderModal(<EditLeaveModal entry={entry} onClose={onClose} onSave={jest.fn()} />);
    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));
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
    halfDay: true,
    halfDayPeriod: "am",
  };

  it("shows a single 'Date' field (not Start/End) for half-day entries", () => {
    renderModal(<EditLeaveModal entry={halfDayEntry} onClose={jest.fn()} onSave={jest.fn()} />);
    expect(screen.getByLabelText("Date")).toBeInTheDocument();
    expect(screen.queryByLabelText("Start Date")).toBeNull();
    expect(screen.queryByLabelText("End Date")).toBeNull();
  });

  it("pre-fills the Date field with the entry's date for half-day entries", () => {
    renderModal(<EditLeaveModal entry={halfDayEntry} onClose={jest.fn()} onSave={jest.fn()} />);
    expect(screen.getByLabelText("Date")).toHaveValue("2026-03-09");
  });

  it("shows the AM/PM picker for half-day entries", () => {
    renderModal(<EditLeaveModal entry={halfDayEntry} onClose={jest.fn()} onSave={jest.fn()} />);
    expect(screen.getByRole("button", { name: "AM" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "PM" })).toBeInTheDocument();
  });

  it("pre-selects the correct half-day period pill", () => {
    renderModal(<EditLeaveModal entry={halfDayEntry} onClose={jest.fn()} onSave={jest.fn()} />);
    expect(screen.getByRole("button", { name: "AM" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "PM" })).toHaveAttribute("aria-pressed", "false");
  });

  it("saves with updated halfDayPeriod when AM/PM is changed", async () => {
    const onSave = jest.fn();
    renderModal(<EditLeaveModal entry={halfDayEntry} onClose={jest.fn()} onSave={onSave} />);
    await userEvent.click(screen.getByRole("button", { name: "PM" }));
    await userEvent.click(screen.getByRole("button", { name: "Save Changes" }));
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ halfDayPeriod: "pm", halfDay: true })
    );
  });

  it("saves with the same startDate and endDate for half-day entries", async () => {
    const onSave = jest.fn();
    renderModal(<EditLeaveModal entry={halfDayEntry} onClose={jest.fn()} onSave={onSave} />);
    await userEvent.click(screen.getByRole("button", { name: "Save Changes" }));
    const saved = onSave.mock.calls[0][0];
    expect(saved.startDate).toBe(saved.endDate);
  });

  it("shows Start Date and End Date fields for full-day entries", () => {
    renderModal(<EditLeaveModal entry={entry} onClose={jest.fn()} onSave={jest.fn()} />);
    expect(screen.getByLabelText("Start Date")).toBeInTheDocument();
    expect(screen.getByLabelText("End Date")).toBeInTheDocument();
    expect(screen.queryByLabelText("Date")).toBeNull();
  });
});
