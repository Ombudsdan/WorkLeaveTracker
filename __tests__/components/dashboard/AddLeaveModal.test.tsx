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

  it("renders Type option buttons with Holiday (sick is hidden when feature flag is off)", () => {
    renderModal(<AddLeaveModal onClose={jest.fn()} onSave={jest.fn()} />);
    expect(screen.getByRole("button", { name: "Holiday" })).toBeInTheDocument();
    // Sick is behind ENABLE_FEATURE_SICK_LEAVE which is off by default in tests
    expect(screen.queryByRole("button", { name: "Sick" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Other" })).toBeNull();
  });

  it("renders Status option buttons with all status choices", () => {
    renderModal(<AddLeaveModal onClose={jest.fn()} onSave={jest.fn()} />);
    expect(screen.getByRole("button", { name: /Planned/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Requested/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Approved/i })).toBeInTheDocument();
  });

  it("renders Type before Reason in the form", () => {
    renderModal(<AddLeaveModal onClose={jest.fn()} onSave={jest.fn()} />);
    const typeLabel = screen.getByText("Type");
    const reasonLabel = screen.getByLabelText("Reason");
    expect(
      typeLabel.compareDocumentPosition(reasonLabel) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
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

  it("Holiday type is pre-selected by default (sick leave feature off)", () => {
    renderModal(<AddLeaveModal onClose={jest.fn()} onSave={jest.fn()} />);
    // When SICK_LEAVE_ENABLED=false, type defaults to Holiday
    expect(screen.getByRole("button", { name: "Holiday" })).toHaveAttribute(
      "aria-pressed",
      "true"
    );
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

  it("requires only dates, reason and status when sick leave feature is off (type=Holiday auto-set)", async () => {
    const user = setup();
    renderModal(<AddLeaveModal onClose={jest.fn()} onSave={jest.fn()} />);
    // Select dates and status only — type is already Holiday, reason is still missing
    await user.click(screen.getByRole("button", { name: "2026-03-09" }));
    await user.click(screen.getByRole("button", { name: "2026-03-13" }));
    await user.click(screen.getByRole("button", { name: /Planned/i }));
    await user.click(screen.getByRole("button", { name: "Save" }));
    // Type is auto-set; only reason (and optionally status) may still be missing
    expect(screen.queryByText("Type is required")).toBeNull();
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

  it("calls onSave with Holiday type (auto-set when sick feature is off)", async () => {
    const user = setup();
    const onSave = jest.fn();
    renderModal(<AddLeaveModal onClose={jest.fn()} onSave={onSave} />);
    await user.click(screen.getByRole("button", { name: "2026-03-09" }));
    await user.click(screen.getByRole("button", { name: "2026-03-09" }));
    await user.type(screen.getByLabelText("Reason"), "Day off");
    await user.click(screen.getByRole("button", { name: /Planned/i }));
    await user.click(screen.getByRole("button", { name: "Save" }));
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ type: LeaveType.Holiday }));
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
  it("does not show the Sick type button when ENABLE_FEATURE_SICK_LEAVE is off (default)", () => {
    renderModal(<AddLeaveModal onClose={jest.fn()} onSave={jest.fn()} />);
    // Sick button is hidden; status picker is visible for Holiday
    expect(screen.queryByRole("button", { name: "Sick" })).toBeNull();
    expect(screen.getByRole("button", { name: /Planned/i })).toBeInTheDocument();
  });

  it("saves with status=Planned when Holiday is selected and Planned status is chosen", async () => {
    const user = setup();
    const onSave = jest.fn();
    renderModal(<AddLeaveModal onClose={jest.fn()} onSave={onSave} />);
    await user.click(screen.getByRole("button", { name: "2026-03-09" }));
    await user.click(screen.getByRole("button", { name: "2026-03-09" }));
    await user.type(screen.getByLabelText("Reason"), "Day off");
    await user.click(screen.getByRole("button", { name: /Planned/i }));
    await user.click(screen.getByRole("button", { name: "Save" }));
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ type: LeaveType.Holiday, status: LeaveStatus.Planned })
    );
  });
});

describe("AddLeaveModal — half-day toggle", () => {
  it("shows the Full day(s) / Half Day AM / Half Day PM duration buttons", () => {
    renderModal(<AddLeaveModal onClose={jest.fn()} onSave={jest.fn()} />);
    expect(screen.getByRole("button", { name: "Full day(s)" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Half Day AM" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Half Day PM" })).toBeInTheDocument();
  });

  it("defaults to Full day(s) selected", () => {
    renderModal(<AddLeaveModal onClose={jest.fn()} onSave={jest.fn()} />);
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

  it("switches to Half Day AM mode when Half Day AM is clicked", async () => {
    const user = setup();
    renderModal(<AddLeaveModal onClose={jest.fn()} onSave={jest.fn()} />);
    await user.click(screen.getByRole("button", { name: "Half Day AM" }));
    expect(screen.getByRole("button", { name: "Half Day AM" })).toHaveAttribute(
      "aria-pressed",
      "true"
    );
    expect(screen.getByRole("button", { name: "Full day(s)" })).toHaveAttribute(
      "aria-pressed",
      "false"
    );
  });

  it("switches to Half Day PM mode when Half Day PM is clicked", async () => {
    const user = setup();
    renderModal(<AddLeaveModal onClose={jest.fn()} onSave={jest.fn()} />);
    await user.click(screen.getByRole("button", { name: "Half Day PM" }));
    expect(screen.getByRole("button", { name: "Half Day PM" })).toHaveAttribute(
      "aria-pressed",
      "true"
    );
  });

  it("does NOT show a separate Time of day field", () => {
    renderModal(<AddLeaveModal onClose={jest.fn()} onSave={jest.fn()} />);
    expect(screen.queryByText("Time of day")).toBeNull();
  });

  it("saves a Half Day AM entry with duration=halfMorning", async () => {
    const user = setup();
    const onSave = jest.fn();
    renderModal(<AddLeaveModal onClose={jest.fn()} onSave={onSave} />);
    await user.click(screen.getByRole("button", { name: "Half Day AM" }));
    await user.click(screen.getByRole("button", { name: "2026-03-09" }));
    await user.click(screen.getByRole("button", { name: "Holiday" }));
    await user.type(screen.getByLabelText("Reason"), "Dentist");
    await user.click(screen.getByRole("button", { name: /Planned/i }));
    await user.click(screen.getByRole("button", { name: "Save" }));
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        duration: "halfMorning",
        startDate: "2026-03-09",
        endDate: "2026-03-09",
        notes: "Dentist",
      })
    );
  });

  it("saves a Half Day PM entry with duration=halfAfternoon", async () => {
    const user = setup();
    const onSave = jest.fn();
    renderModal(<AddLeaveModal onClose={jest.fn()} onSave={onSave} />);
    await user.click(screen.getByRole("button", { name: "Half Day PM" }));
    await user.click(screen.getByRole("button", { name: "2026-03-09" }));
    await user.click(screen.getByRole("button", { name: "Holiday" }));
    await user.type(screen.getByLabelText("Reason"), "Physio");
    await user.click(screen.getByRole("button", { name: /Approved/i }));
    await user.click(screen.getByRole("button", { name: "Save" }));
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        duration: "halfAfternoon",
        startDate: "2026-03-09",
        endDate: "2026-03-09",
        notes: "Physio",
      })
    );
  });

  it("saves a full-day entry with duration=full", async () => {
    const user = setup();
    const onSave = jest.fn();
    renderModal(<AddLeaveModal onClose={jest.fn()} onSave={onSave} />);
    await user.click(screen.getByRole("button", { name: "2026-03-09" }));
    await user.click(screen.getByRole("button", { name: "2026-03-13" }));
    await user.click(screen.getByRole("button", { name: "Holiday" }));
    await user.type(screen.getByLabelText("Reason"), "Holiday");
    await user.click(screen.getByRole("button", { name: /Planned/i }));
    await user.click(screen.getByRole("button", { name: "Save" }));
    const call = onSave.mock.calls[0][0];
    expect(call.duration).toBe("full");
  });
});

describe("AddLeaveModal — reason required", () => {
  it("shows an error when Reason is empty on save", async () => {
    const user = setup();
    renderModal(<AddLeaveModal onClose={jest.fn()} onSave={jest.fn()} />);
    await user.click(screen.getByRole("button", { name: "2026-03-09" }));
    await user.click(screen.getByRole("button", { name: "2026-03-09" }));
    // Type and status, but NO reason
    await user.click(screen.getByRole("button", { name: "Holiday" }));
    await user.click(screen.getByRole("button", { name: /Planned/i }));
    await user.click(screen.getByRole("button", { name: "Save" }));
    expect(screen.getByText("Reason is required")).toBeInTheDocument();
  });
});
