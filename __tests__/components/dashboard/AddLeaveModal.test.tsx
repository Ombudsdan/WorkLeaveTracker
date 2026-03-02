import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { FormValidationProvider } from "@/contexts/FormValidationContext";
import AddLeaveModal from "@/components/dashboard/AddLeaveModal";
import { LeaveStatus, LeaveType } from "@/types";

// Fix "today" so calendar tests are deterministic
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

// AddLeaveModal provides its own FormValidationProvider, but wrapping in one
// here is harmless and mirrors the real app's global provider.
function renderModal(ui: React.ReactElement) {
  return render(<FormValidationProvider>{ui}</FormValidationProvider>);
}

describe("AddLeaveModal — rendering", () => {
  it("renders the modal heading", () => {
    renderModal(<AddLeaveModal onClose={jest.fn()} onSave={jest.fn()} />);
    expect(screen.getByRole("heading", { name: "Add Leave" })).toBeInTheDocument();
  });

  it("renders the date range calendar", () => {
    renderModal(<AddLeaveModal onClose={jest.fn()} onSave={jest.fn()} />);
    // The DateRangePicker renders a calendar for March 2026
    expect(screen.getByText(/Mar 2026/i)).toBeInTheDocument();
  });

  it("renders Type option buttons with all type choices (no Other)", () => {
    renderModal(<AddLeaveModal onClose={jest.fn()} onSave={jest.fn()} />);
    expect(screen.getByRole("button", { name: "Holiday" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sick" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Other" })).toBeNull();
  });

  it("renders Status option buttons with all status choices", () => {
    renderModal(<AddLeaveModal onClose={jest.fn()} onSave={jest.fn()} />);
    expect(screen.getByRole("button", { name: /Planned/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Requested/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Approved/i })).toBeInTheDocument();
  });

  it("renders Type before Status in the form", () => {
    renderModal(<AddLeaveModal onClose={jest.fn()} onSave={jest.fn()} />);
    const typeLabel = screen.getByText("Type");
    const statusLabel = screen.getByText("Status");
    expect(
      typeLabel.compareDocumentPosition(statusLabel) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
  });

  it("renders the Save and Cancel buttons", () => {
    renderModal(<AddLeaveModal onClose={jest.fn()} onSave={jest.fn()} />);
    expect(screen.getByRole("button", { name: "Save" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();
  });

  it("renders the required Reason field", () => {
    renderModal(<AddLeaveModal onClose={jest.fn()} onSave={jest.fn()} />);
    expect(screen.getByLabelText("Reason")).toBeInTheDocument();
  });

  it("no type is pre-selected by default", () => {
    renderModal(<AddLeaveModal onClose={jest.fn()} onSave={jest.fn()} />);
    expect(screen.getByRole("button", { name: "Holiday" })).toHaveAttribute(
      "aria-pressed",
      "false"
    );
    expect(screen.getByRole("button", { name: "Sick" })).toHaveAttribute("aria-pressed", "false");
  });

  it("no status is pre-selected by default", () => {
    renderModal(<AddLeaveModal onClose={jest.fn()} onSave={jest.fn()} />);
    expect(screen.getByRole("button", { name: /Planned/i })).toHaveAttribute(
      "aria-pressed",
      "false"
    );
  });
});

describe("AddLeaveModal — validation on save", () => {
  it("does not call onSave when no fields are filled", async () => {
    const user = setup();
    const onSave = jest.fn();
    renderModal(<AddLeaveModal onClose={jest.fn()} onSave={onSave} />);
    await user.click(screen.getByRole("button", { name: "Save" }));
    expect(onSave).not.toHaveBeenCalled();
  });

  it("shows date error when Save is clicked with no dates selected", async () => {
    const user = setup();
    renderModal(<AddLeaveModal onClose={jest.fn()} onSave={jest.fn()} />);
    await user.click(screen.getByRole("button", { name: "Save" }));
    expect(screen.getByText("Please select a start date")).toBeInTheDocument();
  });

  it("shows type required error when Save is clicked with no type selected", async () => {
    const user = setup();
    renderModal(<AddLeaveModal onClose={jest.fn()} onSave={jest.fn()} />);
    // Select dates
    await user.click(screen.getByRole("button", { name: "2026-03-09" }));
    await user.click(screen.getByRole("button", { name: "2026-03-13" }));
    // Select status but not type
    await user.click(screen.getByRole("button", { name: /Planned/i }));
    await user.click(screen.getByRole("button", { name: "Save" }));
    expect(screen.getByText("Type is required")).toBeInTheDocument();
  });

  it("shows status required error when Save is clicked with no status selected", async () => {
    const user = setup();
    renderModal(<AddLeaveModal onClose={jest.fn()} onSave={jest.fn()} />);
    // Select dates
    await user.click(screen.getByRole("button", { name: "2026-03-09" }));
    await user.click(screen.getByRole("button", { name: "2026-03-13" }));
    // Select type but not status
    await user.click(screen.getByRole("button", { name: "Holiday" }));
    await user.click(screen.getByRole("button", { name: "Save" }));
    expect(screen.getByText("Status is required")).toBeInTheDocument();
  });
});

describe("AddLeaveModal — top error banner", () => {
  it("shows top-level error banner when Save is clicked with invalid fields", async () => {
    const user = setup();
    renderModal(<AddLeaveModal onClose={jest.fn()} onSave={jest.fn()} />);
    await user.click(screen.getByRole("button", { name: "Save" }));
    expect(
      screen.getByText("Please fix the highlighted fields before saving.")
    ).toBeInTheDocument();
  });

  it("does not show top-level error banner before Save is clicked", () => {
    renderModal(<AddLeaveModal onClose={jest.fn()} onSave={jest.fn()} />);
    expect(
      screen.queryByText("Please fix the highlighted fields before saving.")
    ).not.toBeInTheDocument();
  });
});

describe("AddLeaveModal — onSave", () => {
  it("calls onSave with the correct entry data when all fields are filled", async () => {
    const user = setup();
    const onSave = jest.fn();
    renderModal(<AddLeaveModal onClose={jest.fn()} onSave={onSave} />);
    // Select start then end date via calendar
    await user.click(screen.getByRole("button", { name: "2026-03-09" }));
    await user.click(screen.getByRole("button", { name: "2026-03-13" }));
    // Add reason (now required)
    await user.type(screen.getByLabelText("Reason"), "Beach trip");
    // Select type
    await user.click(screen.getByRole("button", { name: "Holiday" }));
    // Select status
    await user.click(screen.getByRole("button", { name: /Planned/i }));
    await user.click(screen.getByRole("button", { name: "Save" }));
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

  it("calls onSave with the chosen status", async () => {
    const user = setup();
    const onSave = jest.fn();
    renderModal(<AddLeaveModal onClose={jest.fn()} onSave={onSave} />);
    await user.click(screen.getByRole("button", { name: "2026-03-09" }));
    await user.click(screen.getByRole("button", { name: "2026-03-09" }));
    await user.type(screen.getByLabelText("Reason"), "Trip");
    await user.click(screen.getByRole("button", { name: "Holiday" }));
    await user.click(screen.getByRole("button", { name: /Approved/i }));
    await user.click(screen.getByRole("button", { name: "Save" }));
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ status: LeaveStatus.Approved }));
  });

  it("calls onSave with the chosen type", async () => {
    const user = setup();
    const onSave = jest.fn();
    renderModal(<AddLeaveModal onClose={jest.fn()} onSave={onSave} />);
    await user.click(screen.getByRole("button", { name: "2026-03-09" }));
    await user.click(screen.getByRole("button", { name: "2026-03-09" }));
    await user.type(screen.getByLabelText("Reason"), "Sick day");
    await user.click(screen.getByRole("button", { name: "Sick" }));
    await user.click(screen.getByRole("button", { name: "Save" }));
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ type: LeaveType.Sick }));
  });
});

describe("AddLeaveModal — onClose", () => {
  it("calls onClose when the Cancel button is clicked", async () => {
    const user = setup();
    const onClose = jest.fn();
    renderModal(<AddLeaveModal onClose={onClose} onSave={jest.fn()} />);
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

describe("AddLeaveModal — sick leave auto-status", () => {
  it("hides the Status picker when Sick is selected", async () => {
    const user = setup();
    renderModal(<AddLeaveModal onClose={jest.fn()} onSave={jest.fn()} />);
    // Before selecting sick, status pills are visible
    expect(screen.getByRole("button", { name: /Planned/i })).toBeInTheDocument();
    // Select sick type
    await user.click(screen.getByRole("button", { name: "Sick" }));
    expect(screen.queryByRole("button", { name: /Planned/i })).toBeNull();
  });

  it("saves with status=Approved when Sick is selected (no status picker shown)", async () => {
    const user = setup();
    const onSave = jest.fn();
    renderModal(<AddLeaveModal onClose={jest.fn()} onSave={onSave} />);
    await user.click(screen.getByRole("button", { name: "2026-03-09" }));
    await user.click(screen.getByRole("button", { name: "2026-03-09" }));
    await user.type(screen.getByLabelText("Reason"), "Sick day");
    await user.click(screen.getByRole("button", { name: "Sick" }));
    await user.click(screen.getByRole("button", { name: "Save" }));
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ type: LeaveType.Sick, status: LeaveStatus.Approved })
    );
  });
});

describe("AddLeaveModal — half-day toggle", () => {
  it("shows the Full day(s) / Half day toggle buttons", () => {
    renderModal(<AddLeaveModal onClose={jest.fn()} onSave={jest.fn()} />);
    expect(screen.getByRole("button", { name: "Full day(s)" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Half day" })).toBeInTheDocument();
  });

  it("defaults to Full day(s) selected", () => {
    renderModal(<AddLeaveModal onClose={jest.fn()} onSave={jest.fn()} />);
    expect(screen.getByRole("button", { name: "Full day(s)" })).toHaveAttribute(
      "aria-pressed",
      "true"
    );
    expect(screen.getByRole("button", { name: "Half day" })).toHaveAttribute(
      "aria-pressed",
      "false"
    );
  });

  it("switches to half-day mode when Half day is clicked", async () => {
    const user = setup();
    renderModal(<AddLeaveModal onClose={jest.fn()} onSave={jest.fn()} />);
    await user.click(screen.getByRole("button", { name: "Half day" }));
    expect(screen.getByRole("button", { name: "Half day" })).toHaveAttribute(
      "aria-pressed",
      "true"
    );
  });

  it("shows AM/PM picker only after a date is selected in half-day mode", async () => {
    const user = setup();
    renderModal(<AddLeaveModal onClose={jest.fn()} onSave={jest.fn()} />);
    await user.click(screen.getByRole("button", { name: "Half day" }));
    // AM/PM picker not yet visible (no date selected)
    expect(screen.queryByText("Time of day")).toBeNull();
    // Select a date
    await user.click(screen.getByRole("button", { name: "2026-03-09" }));
    // Now AM/PM picker appears
    expect(screen.getByText("Time of day")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "AM" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "PM" })).toBeInTheDocument();
  });

  it("saves a half-day entry with halfDay=true and halfDayPeriod", async () => {
    const user = setup();
    const onSave = jest.fn();
    renderModal(<AddLeaveModal onClose={jest.fn()} onSave={onSave} />);
    await user.click(screen.getByRole("button", { name: "Half day" }));
    await user.click(screen.getByRole("button", { name: "2026-03-09" }));
    await user.click(screen.getByRole("button", { name: "AM" }));
    await user.type(screen.getByLabelText("Reason"), "Dentist");
    await user.click(screen.getByRole("button", { name: "Holiday" }));
    await user.click(screen.getByRole("button", { name: /Planned/i }));
    await user.click(screen.getByRole("button", { name: "Save" }));
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        halfDay: true,
        halfDayPeriod: "am",
        startDate: "2026-03-09",
        endDate: "2026-03-09",
        notes: "Dentist",
      })
    );
  });

  it("validates AM/PM is required in half-day mode", async () => {
    const user = setup();
    renderModal(<AddLeaveModal onClose={jest.fn()} onSave={jest.fn()} />);
    await user.click(screen.getByRole("button", { name: "Half day" }));
    await user.click(screen.getByRole("button", { name: "2026-03-09" }));
    // Don't select AM/PM
    await user.type(screen.getByLabelText("Reason"), "Dentist");
    await user.click(screen.getByRole("button", { name: "Holiday" }));
    await user.click(screen.getByRole("button", { name: /Planned/i }));
    await user.click(screen.getByRole("button", { name: "Save" }));
    expect(screen.getByText("Please select AM or PM")).toBeInTheDocument();
  });
});

describe("AddLeaveModal — reason required", () => {
  it("shows an error when Reason is empty on save", async () => {
    const user = setup();
    renderModal(<AddLeaveModal onClose={jest.fn()} onSave={jest.fn()} />);
    await user.click(screen.getByRole("button", { name: "2026-03-09" }));
    await user.click(screen.getByRole("button", { name: "2026-03-09" }));
    await user.click(screen.getByRole("button", { name: "Holiday" }));
    await user.click(screen.getByRole("button", { name: /Planned/i }));
    // No reason entered
    await user.click(screen.getByRole("button", { name: "Save" }));
    expect(screen.getByText("Reason is required")).toBeInTheDocument();
  });
});
