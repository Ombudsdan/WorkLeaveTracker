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

  it("pre-fills Status with the entry's status", () => {
    renderModal(<EditLeaveModal entry={entry} onClose={jest.fn()} onSave={jest.fn()} />);
    expect(screen.getByLabelText("Status")).toHaveValue(LeaveStatus.Planned);
  });

  it("pre-fills Reason with the entry's notes", () => {
    renderModal(<EditLeaveModal entry={entry} onClose={jest.fn()} onSave={jest.fn()} />);
    expect(screen.getByLabelText("Reason (optional)")).toHaveValue("Skiing");
  });

  it("handles missing notes gracefully (defaults to empty string)", () => {
    const entryNoNotes = { ...entry, notes: undefined };
    renderModal(<EditLeaveModal entry={entryNoNotes} onClose={jest.fn()} onSave={jest.fn()} />);
    expect(screen.getByLabelText("Reason (optional)")).toHaveValue("");
  });

  it("renders all status options in the Status select", () => {
    renderModal(<EditLeaveModal entry={entry} onClose={jest.fn()} onSave={jest.fn()} />);
    expect(screen.getByRole("option", { name: /Planned/i })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: /Requested/i })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: /Approved/i })).toBeInTheDocument();
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

  it("calls onSave with updated status when the user changes Status", async () => {
    const onSave = jest.fn();
    renderModal(<EditLeaveModal entry={entry} onClose={jest.fn()} onSave={onSave} />);
    await userEvent.selectOptions(screen.getByLabelText("Status"), LeaveStatus.Approved);
    await userEvent.click(screen.getByRole("button", { name: "Save Changes" }));
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ status: LeaveStatus.Approved }));
  });

  it("preserves the original entry id in the saved result", async () => {
    const onSave = jest.fn();
    renderModal(<EditLeaveModal entry={entry} onClose={jest.fn()} onSave={onSave} />);
    await userEvent.click(screen.getByRole("button", { name: "Save Changes" }));
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ id: "e1" }));
  });
});

describe("EditLeaveModal — reason update", () => {
  it("calls onSave with updated reason when the reason field is changed (stored as notes)", async () => {
    const onSave = jest.fn();
    renderModal(<EditLeaveModal entry={entry} onClose={jest.fn()} onSave={onSave} />);
    const reasonField = screen.getByLabelText("Reason (optional)");
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
