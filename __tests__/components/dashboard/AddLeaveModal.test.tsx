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

  it("renders Type option buttons with all type choices", () => {
    renderModal(<AddLeaveModal onClose={jest.fn()} onSave={jest.fn()} />);
    expect(screen.getByRole("button", { name: "Holiday" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sick" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Other" })).toBeInTheDocument();
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

  it("renders the optional Reason field", () => {
    renderModal(<AddLeaveModal onClose={jest.fn()} onSave={jest.fn()} />);
    expect(screen.getByLabelText("Reason (optional)")).toBeInTheDocument();
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
    // Select type
    await user.click(screen.getByRole("button", { name: "Holiday" }));
    // Select status
    await user.click(screen.getByRole("button", { name: /Planned/i }));
    // Add reason
    await user.type(screen.getByLabelText("Reason (optional)"), "Beach trip");
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
    await user.click(screen.getByRole("button", { name: "Sick" }));
    await user.click(screen.getByRole("button", { name: /Planned/i }));
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
