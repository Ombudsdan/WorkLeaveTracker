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

  it("does not render the Type section when sick leave is disabled", () => {
    renderModal(<AddLeaveModal onClose={jest.fn()} onSave={jest.fn()} />);
    // Type section is hidden when SICK_LEAVE_ENABLED=false — no type picker or Holiday/Sick buttons
    expect(screen.queryByText("Type")).toBeNull();
    expect(screen.queryByRole("button", { name: "Holiday" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Sick" })).toBeNull();
  });

  it("renders Status option buttons with all status choices", () => {
    renderModal(<AddLeaveModal onClose={jest.fn()} onSave={jest.fn()} />);
    expect(screen.getByRole("button", { name: /Planned/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Requested/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Approved/i })).toBeInTheDocument();
  });

  it("does not render the Type label when sick leave is disabled", () => {
    renderModal(<AddLeaveModal onClose={jest.fn()} onSave={jest.fn()} />);
    expect(screen.queryByText("Type")).toBeNull();
  });

  it("renders Reason before Status in the form (Type section hidden)", () => {
    renderModal(<AddLeaveModal onClose={jest.fn()} onSave={jest.fn()} />);
    const reasonLabel = screen.getByLabelText("Reason");
    const statusLabel = screen.getByText("Status");
    expect(
      reasonLabel.compareDocumentPosition(statusLabel) & Node.DOCUMENT_POSITION_FOLLOWING
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

  it("Type section is hidden and type auto-set to Holiday when sick leave is disabled", () => {
    renderModal(<AddLeaveModal onClose={jest.fn()} onSave={jest.fn()} />);
    // When SICK_LEAVE_ENABLED=false, Type section is completely hidden
    expect(screen.queryByText("Type")).toBeNull();
    expect(screen.queryByRole("button", { name: "Holiday" })).toBeNull();
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
    // Select dates — type is auto-set to Holiday when sick leave is disabled
    await user.click(screen.getByRole("button", { name: "2026-03-09" }));
    await user.click(screen.getByRole("button", { name: "2026-03-13" }));
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
    // Type is auto-set to Holiday when sick leave is disabled — no need to click it
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
    // Type is auto-set to Holiday when sick leave is disabled
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
  it("does not show the Sick or Holiday type buttons when ENABLE_FEATURE_SICK_LEAVE is off (Type section hidden)", () => {
    renderModal(<AddLeaveModal onClose={jest.fn()} onSave={jest.fn()} />);
    // Entire Type section is hidden; type is auto-set to Holiday
    expect(screen.queryByRole("button", { name: "Sick" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Holiday" })).toBeNull();
    expect(screen.queryByText("Type")).toBeNull();
    // Status picker is still visible
    expect(screen.getByRole("button", { name: /Planned/i })).toBeInTheDocument();
  });

  it("saves with Holiday type (auto-set) and Planned status when sick leave is disabled", async () => {
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
    // Type is auto-set to Holiday when sick leave is disabled
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
    // Type is auto-set to Holiday when sick leave is disabled
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
    // Type is auto-set to Holiday when sick leave is disabled
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
    // Type is auto-set, status selected, but NO reason
    await user.click(screen.getByRole("button", { name: /Planned/i }));
    await user.click(screen.getByRole("button", { name: "Save" }));
    expect(screen.getByText("Reason is required")).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Allowance limit validation
// ---------------------------------------------------------------------------
import type { PublicUser, BankHolidayEntry } from "@/types";
import { LeaveDuration } from "@/types";

const aliceOverLimit: PublicUser = {
  id: "u1",
  profile: {
    firstName: "Alice",
    lastName: "Smith",
    email: "alice@example.com",
    nonWorkingDays: [0, 6],
  },
  yearAllowances: [
    { year: 2026, company: "Acme", holidayStartMonth: 1, core: 1, bought: 0, carried: 0 },
  ],
  // One existing approved entry that already uses 5 days — allowance is only 1 day.
  entries: [
    {
      id: "e1",
      startDate: "2026-03-09",
      endDate: "2026-03-13",
      status: LeaveStatus.Approved,
      type: LeaveType.Holiday,
      duration: LeaveDuration.Full,
    },
  ],
};

const aliceWithRoom: PublicUser = {
  ...aliceOverLimit,
  yearAllowances: [
    { year: 2026, company: "Acme", holidayStartMonth: 1, core: 25, bought: 0, carried: 0 },
  ],
};

const noBankHolidays: BankHolidayEntry[] = [];

describe("AddLeaveModal — allowance limit validation", () => {
  it("does not show the limit warning when no user is supplied", async () => {
    const user = setup();
    renderModal(<AddLeaveModal onClose={jest.fn()} onSave={jest.fn()} />);
    await user.click(screen.getByRole("button", { name: "2026-03-16" }));
    await user.click(screen.getByRole("button", { name: "2026-03-20" }));
    await user.click(screen.getByRole("button", { name: /Planned/i }));
    expect(screen.queryByText(/Allowance exceeded/i)).toBeNull();
  });

  it("shows the limit warning when adding leave would exceed the allowance", async () => {
    const user = setup();
    renderModal(
      <AddLeaveModal
        onClose={jest.fn()}
        onSave={jest.fn()}
        user={aliceOverLimit}
        bankHolidays={noBankHolidays}
      />
    );
    // Try to add Mon–Fri (5 days) — already over limit (1 day allowance, 5 used)
    await user.click(screen.getByRole("button", { name: "2026-03-16" }));
    await user.click(screen.getByRole("button", { name: "2026-03-20" }));
    await user.click(screen.getByRole("button", { name: /Planned/i }));
    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.getByText(/Allowance exceeded/i)).toBeInTheDocument();
  });

  it("disables the Save button when the allowance is exceeded", async () => {
    const user = setup();
    renderModal(
      <AddLeaveModal
        onClose={jest.fn()}
        onSave={jest.fn()}
        user={aliceOverLimit}
        bankHolidays={noBankHolidays}
      />
    );
    await user.click(screen.getByRole("button", { name: "2026-03-16" }));
    await user.click(screen.getByRole("button", { name: "2026-03-20" }));
    await user.click(screen.getByRole("button", { name: /Planned/i }));
    expect(screen.getByRole("button", { name: "Save" })).toBeDisabled();
  });

  it("does not call onSave when limit is exceeded and Save is invoked", async () => {
    const user = setup();
    const onSave = jest.fn();
    renderModal(
      <AddLeaveModal
        onClose={jest.fn()}
        onSave={onSave}
        user={aliceOverLimit}
        bankHolidays={noBankHolidays}
      />
    );
    await user.click(screen.getByRole("button", { name: "2026-03-16" }));
    await user.click(screen.getByRole("button", { name: "2026-03-20" }));
    await user.type(screen.getByLabelText("Reason"), "Holiday");
    await user.click(screen.getByRole("button", { name: /Planned/i }));
    // Save is disabled — clicking it should have no effect
    await user.click(screen.getByRole("button", { name: "Save" }));
    expect(onSave).not.toHaveBeenCalled();
  });

  it("shows the list of cancellable upcoming entries in the warning", async () => {
    const user = setup();
    renderModal(
      <AddLeaveModal
        onClose={jest.fn()}
        onSave={jest.fn()}
        user={aliceOverLimit}
        bankHolidays={noBankHolidays}
      />
    );
    await user.click(screen.getByRole("button", { name: "2026-03-16" }));
    await user.click(screen.getByRole("button", { name: "2026-03-20" }));
    await user.click(screen.getByRole("button", { name: /Planned/i }));
    // The existing entry (9–13 Mar) is an upcoming entry that could be cancelled
    expect(screen.getByText(/Upcoming leave you could cancel/i)).toBeInTheDocument();
  });

  it("shows 'No upcoming leave' message when nothing can be cancelled", async () => {
    const user = setup();
    // User whose only entry is in the past
    const aliceNoCancellable: PublicUser = {
      ...aliceOverLimit,
      entries: [
        {
          id: "e-past",
          startDate: "2026-01-05",
          endDate: "2026-01-09",
          status: LeaveStatus.Approved,
          type: LeaveType.Holiday,
          duration: LeaveDuration.Full,
        },
      ],
    };
    renderModal(
      <AddLeaveModal
        onClose={jest.fn()}
        onSave={jest.fn()}
        user={aliceNoCancellable}
        bankHolidays={noBankHolidays}
      />
    );
    await user.click(screen.getByRole("button", { name: "2026-03-16" }));
    await user.click(screen.getByRole("button", { name: "2026-03-20" }));
    await user.click(screen.getByRole("button", { name: /Planned/i }));
    expect(screen.getByText(/No upcoming leave found to cancel/i)).toBeInTheDocument();
  });

  it("does not show the warning when leave is within the allowance", async () => {
    const user = setup();
    renderModal(
      <AddLeaveModal
        onClose={jest.fn()}
        onSave={jest.fn()}
        user={aliceWithRoom}
        bankHolidays={noBankHolidays}
      />
    );
    // 1-day entry — well within 25 days
    await user.click(screen.getByRole("button", { name: "2026-03-16" }));
    await user.click(screen.getByRole("button", { name: "2026-03-16" }));
    await user.click(screen.getByRole("button", { name: /Planned/i }));
    expect(screen.queryByText(/Allowance exceeded/i)).toBeNull();
    expect(screen.getByRole("button", { name: "Save" })).not.toBeDisabled();
  });

  it("shows the shortfall correctly (singular 'day' for shortfall of 1)", async () => {
    const user = setup();
    // 1 day allowance, 0 existing entries → adding 2 days = shortfall of 2 days
    const aliceOne: PublicUser = {
      ...aliceOverLimit,
      entries: [],
    };
    renderModal(
      <AddLeaveModal
        onClose={jest.fn()}
        onSave={jest.fn()}
        user={aliceOne}
        bankHolidays={noBankHolidays}
      />
    );
    // Add 2 days (Mon–Tue) — 1 day allowance → shortfall 1 day (singular)
    await user.click(screen.getByRole("button", { name: "2026-03-02" }));
    await user.click(screen.getByRole("button", { name: "2026-03-03" }));
    await user.click(screen.getByRole("button", { name: /Planned/i }));
    // Check singular "day" (no trailing 's')
    const alertEl = screen.getByRole("alert");
    expect(alertEl.textContent).toContain("exceeded by 1 day");
    expect(alertEl.textContent).not.toContain("exceeded by 1 days");
  });

  it("does not show the warning when type is not Holiday", async () => {
    // Without SICK_LEAVE_ENABLED, type is always auto-set to Holiday.
    // The warning should not appear when no dates/status are set (null limitCheck).
    const user = setup();
    renderModal(
      <AddLeaveModal
        onClose={jest.fn()}
        onSave={jest.fn()}
        user={aliceOverLimit}
        bankHolidays={noBankHolidays}
      />
    );
    // No dates selected — limitCheck should be null
    expect(screen.queryByText(/Allowance exceeded/i)).toBeNull();
  });
});

describe("AddLeaveModal — limit validation branch coverage", () => {
  it("does not show warning when user is provided but bankHolidays prop is omitted", async () => {
    // Covers the `bankHolidays ?? []` fallback branch.
    const user = setup();
    renderModal(
      <AddLeaveModal
        onClose={jest.fn()}
        onSave={jest.fn()}
        user={aliceWithRoom}
        // bankHolidays intentionally omitted
      />
    );
    await user.click(screen.getByRole("button", { name: "2026-03-16" }));
    await user.click(screen.getByRole("button", { name: "2026-03-20" }));
    await user.click(screen.getByRole("button", { name: /Planned/i }));
    // Should not crash — still within allowance
    expect(screen.queryByText(/Allowance exceeded/i)).toBeNull();
  });

  it("shows a single-day cancellable entry as '1 day' (singular)", async () => {
    // Covers the `days !== 1 ? "s" : ""` false branch (singular day) and
    // the `formatDateRange` start === end branch.
    const user = setup();
    const aliceWithSingleDayEntry: PublicUser = {
      ...aliceOverLimit,
      entries: [
        {
          id: "single",
          startDate: "2026-03-20",
          endDate: "2026-03-20", // single-day entry
          status: LeaveStatus.Approved,
          type: LeaveType.Holiday,
          duration: LeaveDuration.Full,
        },
      ],
    };
    renderModal(
      <AddLeaveModal
        onClose={jest.fn()}
        onSave={jest.fn()}
        user={aliceWithSingleDayEntry}
        bankHolidays={noBankHolidays}
      />
    );
    // Add leave that pushes over the 1-day limit
    await user.click(screen.getByRole("button", { name: "2026-03-16" }));
    await user.click(screen.getByRole("button", { name: "2026-03-16" }));
    await user.click(screen.getByRole("button", { name: /Planned/i }));
    // The cancellable entry uses 1 day (singular) and is a single-day range
    expect(screen.getByText("1 day")).toBeInTheDocument();
  });

  it("does not trigger limit check when endDate has not been set yet", async () => {
    // Covers the `!endDate` true branch in the limitCheck guard.
    const user = setup();
    renderModal(
      <AddLeaveModal
        onClose={jest.fn()}
        onSave={jest.fn()}
        user={aliceOverLimit}
        bankHolidays={noBankHolidays}
      />
    );
    // Set only the start date — endDate is still empty
    await user.click(screen.getByRole("button", { name: "2026-03-16" }));
    await user.click(screen.getByRole("button", { name: /Planned/i }));
    // No warning should appear without a complete date range
    expect(screen.queryByText(/Allowance exceeded/i)).toBeNull();
  });
});

describe("AddLeaveModal — initialDate pre-selection", () => {
  it("pre-fills the date picker when initialDate is provided", () => {
    renderModal(
      <AddLeaveModal onClose={jest.fn()} onSave={jest.fn()} initialDate="2026-03-09" />
    );
    // DateRangePicker shows the selected date in the summary
    expect(screen.getAllByText("2026-03-09").length).toBeGreaterThan(0);
  });

  it("navigates the date picker calendar to the initialDate's month", () => {
    // Navigate to a month other than the default (March 2026)
    renderModal(
      <AddLeaveModal onClose={jest.fn()} onSave={jest.fn()} initialDate="2026-05-15" />
    );
    // Calendar should show May 2026
    expect(screen.getByText(/May 2026/i)).toBeInTheDocument();
  });

  it("renders with no pre-filled date when initialDate is omitted", () => {
    renderModal(<AddLeaveModal onClose={jest.fn()} onSave={jest.fn()} />);
    // Both From and To fields should show the placeholder dash
    expect(screen.getByText("From:").nextSibling?.textContent).toBe("—");
    expect(screen.getByText("To:").nextSibling?.textContent).toBe("—");
  });
});

describe("AddLeaveModal — duration change retains start date", () => {
  it("retains the selected date when switching from Full day to Half Day AM", async () => {
    const user = setup();
    renderModal(<AddLeaveModal onClose={jest.fn()} onSave={jest.fn()} />);
    // Select a full-day start date
    await user.click(screen.getByRole("button", { name: "2026-03-09" }));
    await user.click(screen.getByRole("button", { name: "2026-03-09" }));
    // Switch to Half Day AM
    await user.click(screen.getByRole("button", { name: "Half Day AM" }));
    // The date should still be shown (half-day shows "Date:" summary)
    expect(screen.getAllByText("2026-03-09").length).toBeGreaterThan(0);
  });

  it("retains the start date when switching from Half Day AM back to Full day", async () => {
    const user = setup();
    renderModal(<AddLeaveModal onClose={jest.fn()} onSave={jest.fn()} />);
    // Pick a half-day date first
    await user.click(screen.getByRole("button", { name: "Half Day AM" }));
    await user.click(screen.getByRole("button", { name: "2026-03-09" }));
    // Switch back to Full day
    await user.click(screen.getByRole("button", { name: "Full day(s)" }));
    // startDate is preserved; endDate is cleared — summary shows "From: 2026-03-09"
    expect(screen.getByText("From:").nextSibling?.textContent).toBe("2026-03-09");
    expect(screen.getByText("To:").nextSibling?.textContent).toBe("—");
  });

  it("clears dates when switching duration with no date selected", async () => {
    const user = setup();
    renderModal(<AddLeaveModal onClose={jest.fn()} onSave={jest.fn()} />);
    // No date selected — switching should not crash and dates stay empty
    await user.click(screen.getByRole("button", { name: "Half Day AM" }));
    expect(screen.getByText("Date:").nextSibling?.textContent).toBe("—");
  });
});
