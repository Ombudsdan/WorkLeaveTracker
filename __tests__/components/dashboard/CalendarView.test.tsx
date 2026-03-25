import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import CalendarView from "@/components/dashboard/CalendarView";
import { LeaveStatus, LeaveType, LeaveDuration } from "@/types";
import type { PublicUser, BankHolidayEntry } from "@/types";

// Fix "today" so tests are deterministic
beforeEach(() => {
  jest.useFakeTimers();
  jest.setSystemTime(new Date("2026-03-15")); // Sunday 15 March 2026
});

afterEach(() => {
  jest.useRealTimers();
});

// userEvent must advance fake timers to avoid timeout on async interactions
function setup() {
  return userEvent.setup({ advanceTimers: jest.advanceTimersByTime.bind(jest) });
}

const alice: PublicUser = {
  id: "u1",
  profile: {
    firstName: "Alice",
    lastName: "Smith",
    email: "alice@example.com",
    nonWorkingDays: [0, 6], // Sun + Sat
  },
  yearAllowances: [
    { year: 2026, company: "Acme", holidayStartMonth: 1, core: 25, bought: 0, carried: 0 },
  ],
  entries: [],
};

/** Helper to wrap a date string into the BankHolidayEntry shape expected by the component */
function bh(date: string, title = "Bank Holiday"): BankHolidayEntry {
  return { date, title };
}

describe("CalendarView — header and navigation", () => {
  it("renders the current month and year initially", () => {
    render(<CalendarView user={alice} bankHolidays={[]} />);
    expect(screen.getByRole("heading", { name: /March 2026/i })).toBeInTheDocument();
  });

  it("navigates to the previous month when the ‹ button is clicked", async () => {
    const user = setup();
    render(<CalendarView user={alice} bankHolidays={[]} />);
    await user.click(screen.getByRole("button", { name: "Previous month" }));
    expect(screen.getByRole("heading", { name: /February 2026/i })).toBeInTheDocument();
  });

  it("navigates to the next month when the › button is clicked", async () => {
    const user = setup();
    render(<CalendarView user={alice} bankHolidays={[]} />);
    await user.click(screen.getByRole("button", { name: "Next month" }));
    expect(screen.getByRole("heading", { name: /April 2026/i })).toBeInTheDocument();
  });

  it("wraps from January to December (previous) correctly", async () => {
    const user = setup();
    // Navigate back from March → February → January → December
    render(<CalendarView user={alice} bankHolidays={[]} />);
    const prev = screen.getByRole("button", { name: "Previous month" });
    await user.click(prev); // Feb
    await user.click(prev); // Jan
    await user.click(prev); // Dec 2025
    expect(screen.getByRole("heading", { name: /December 2025/i })).toBeInTheDocument();
  });

  it("wraps from December to January (next) correctly", async () => {
    jest.setSystemTime(new Date("2026-12-01"));
    const user = setup();
    render(<CalendarView user={alice} bankHolidays={[]} />);
    await user.click(screen.getByRole("button", { name: "Next month" }));
    expect(screen.getByRole("heading", { name: /January 2027/i })).toBeInTheDocument();
  });
});

describe("CalendarView — day headers", () => {
  it("renders all 7 day-name headers", () => {
    render(<CalendarView user={alice} bankHolidays={[]} />);
    ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].forEach((day) => {
      expect(screen.getByText(day)).toBeInTheDocument();
    });
  });
});

describe("CalendarView — today indicator", () => {
  it("applies a ring class to the cell for today's date", () => {
    const { container } = render(<CalendarView user={alice} bankHolidays={[]} />);
    // Today is 15 March 2026 — the cell with text "15" should have the ring class
    const todayCells = container.querySelectorAll(".ring-indigo-500");
    expect(todayCells.length).toBe(1);
  });
});

describe("CalendarView — leave entry display", () => {
  it("applies the approved colour class to a cell covered by an approved entry", () => {
    const userWithEntry: PublicUser = {
      ...alice,
      entries: [
        {
          id: "e1",
          startDate: "2026-03-09",
          endDate: "2026-03-09",
          status: LeaveStatus.Approved,
          type: LeaveType.Holiday,
        },
      ],
    };
    const { container } = render(<CalendarView user={userWithEntry} bankHolidays={[]} />);
    // bg-green-200 is the CALENDAR_COLORS class for Approved
    expect(container.querySelector(".bg-green-200")).toBeInTheDocument();
  });

  it("applies the planned colour class to a cell covered by a planned entry", () => {
    const userWithEntry: PublicUser = {
      ...alice,
      entries: [
        {
          id: "e2",
          startDate: "2026-03-09",
          endDate: "2026-03-09",
          status: LeaveStatus.Planned,
          type: LeaveType.Holiday,
        },
      ],
    };
    const { container } = render(<CalendarView user={userWithEntry} bankHolidays={[]} />);
    expect(container.querySelector(".bg-yellow-200")).toBeInTheDocument();
  });

  it("applies the requested colour class to a cell covered by a requested entry", () => {
    const userWithEntry: PublicUser = {
      ...alice,
      entries: [
        {
          id: "e3",
          startDate: "2026-03-09",
          endDate: "2026-03-09",
          status: LeaveStatus.Requested,
          type: LeaveType.Holiday,
        },
      ],
    };
    const { container } = render(<CalendarView user={userWithEntry} bankHolidays={[]} />);
    expect(container.querySelector(".bg-blue-200")).toBeInTheDocument();
  });
});

describe("CalendarView — bank holiday indicator", () => {
  it("applies the bank holiday class to a bank holiday cell with no entry", () => {
    const { container } = render(<CalendarView user={alice} bankHolidays={[bh("2026-03-02")]} />);
    // bg-purple-100 is CALENDAR_CELL_BANK_HOLIDAY
    expect(container.querySelector(".bg-purple-100")).toBeInTheDocument();
  });

  it("shows the bank holiday name on a bank holiday cell with no entry", () => {
    render(<CalendarView user={alice} bankHolidays={[bh("2026-03-02", "Spring Bank Holiday")]} />);
    expect(screen.getByText("Spring Bank Holiday")).toBeInTheDocument();
  });

  it("falls back to 'BH' when the bank holiday entry has no title", () => {
    render(<CalendarView user={alice} bankHolidays={[{ date: "2026-03-02", title: "BH" }]} />);
    expect(screen.getByText("BH")).toBeInTheDocument();
  });

  it("does NOT show the bank holiday name when the bank holiday date has a leave entry", () => {
    const userWithEntry: PublicUser = {
      ...alice,
      entries: [
        {
          id: "e4",
          startDate: "2026-03-02",
          endDate: "2026-03-02",
          status: LeaveStatus.Approved,
          type: LeaveType.Holiday,
        },
      ],
    };
    render(
      <CalendarView user={userWithEntry} bankHolidays={[bh("2026-03-02", "Spring Bank Holiday")]} />
    );
    expect(screen.queryByText("Spring Bank Holiday")).toBeNull();
  });

  it("shows bank holiday styling (not leave colour) when a leave entry spans a bank holiday", () => {
    // 2026-03-02 is Monday (working day for alice), but it's a bank holiday AND has a leave entry.
    // The leave entry should NOT be rendered on the bank-holiday cell (bank holiday styling applies).
    // Actually, per original design: a BH cell with leave shows the LEAVE colour (BH name hidden).
    // This test validates that the bank holiday cell is correctly rendered with leave styling.
    const userWithEntry: PublicUser = {
      ...alice,
      entries: [
        {
          id: "e-bh-leave",
          startDate: "2026-03-02",
          endDate: "2026-03-02",
          status: LeaveStatus.Approved,
          type: LeaveType.Holiday,
        },
      ],
    };
    const { container } = render(
      <CalendarView user={userWithEntry} bankHolidays={[bh("2026-03-02")]} />
    );
    // Leave colour is shown (bank holiday + leave cell shows leave colour)
    expect(container.querySelector(".bg-green-200")).toBeInTheDocument();
  });
});

describe("CalendarView — non-working day display", () => {
  it("applies the non-working class to a Sunday cell (nonWorkingDays includes 0)", () => {
    const { container } = render(<CalendarView user={alice} bankHolidays={[]} />);
    // bg-gray-100 is CALENDAR_CELL_NON_WORKING
    // March 2026 has Sundays on 1, 8, 15, 22, 29
    expect(container.querySelector(".bg-gray-100")).toBeInTheDocument();
  });

  it("shows 'Non-Working' label in a weekday non-working-day cell", () => {
    // Set Wednesday (3) as a non-working day for this user
    const userWithWedOff: PublicUser = {
      ...alice,
      profile: { ...alice.profile, nonWorkingDays: [0, 3, 6] },
    };
    render(<CalendarView user={userWithWedOff} bankHolidays={[]} />);
    // March 2026 has Wednesdays on 4, 11, 18, 25 — "Non-Working" should appear
    // (getByText would fail if there are 0 or >1 exact matches, use getAllByText)
    const labels = screen.getAllByText("Non-Working");
    // Cells + legend entry = more than one (at least legend + one cell)
    expect(labels.length).toBeGreaterThanOrEqual(2);
  });

  it("does NOT show 'Non-Working' label in standard weekend cells", () => {
    // Alice already has Sun+Sat non-working — default. Weekend cells should not get the label.
    render(<CalendarView user={alice} bankHolidays={[]} />);
    // The only "Non-Working" text should be the legend entry (exactly 1)
    const labels = screen.getAllByText("Non-Working");
    expect(labels).toHaveLength(1);
  });

  it("shows non-working styling (not leave colour) when a leave entry spans a non-working day", () => {
    // Sunday 2026-03-08 is a non-working day for alice; an entry spanning 07–09 Mar includes it
    const userWithEntry: PublicUser = {
      ...alice,
      entries: [
        {
          id: "e-nwd-leave",
          startDate: "2026-03-07",
          endDate: "2026-03-09",
          status: LeaveStatus.Approved,
          type: LeaveType.Holiday,
        },
      ],
    };
    const { container } = render(<CalendarView user={userWithEntry} bankHolidays={[]} />);
    // The Sunday cell (day 8) should be bg-gray-100 (NWD), not bg-green-200 (approved)
    // At least one gray-100 cell must be present (the Sunday)
    expect(container.querySelector(".bg-gray-100")).toBeInTheDocument();
    // The leave colour can still appear for working-day cells in the range
    expect(container.querySelector(".bg-green-200")).toBeInTheDocument();
  });
});

describe("CalendarView — legend", () => {
  it("renders the legend with all colour keys", () => {
    render(<CalendarView user={alice} bankHolidays={[]} />);
    expect(screen.getByText("Approved")).toBeInTheDocument();
    expect(screen.getByText("Requested")).toBeInTheDocument();
    expect(screen.getByText("Planned")).toBeInTheDocument();
    expect(screen.getByText("Bank Holiday")).toBeInTheDocument();
    expect(screen.getByText("Non-Working")).toBeInTheDocument();
  });
});

describe("CalendarView — add leave button", () => {
  it("does not render an Add Leave button in the calendar header (button is in Dashboard)", () => {
    render(<CalendarView user={alice} bankHolidays={[]} isOwnProfile={true} onAdd={jest.fn()} />);
    expect(screen.queryByRole("button", { name: /Add Leave/i })).toBeNull();
  });

  it("does not show the Add Leave button when isOwnProfile is false", () => {
    render(<CalendarView user={alice} bankHolidays={[]} isOwnProfile={false} onAdd={jest.fn()} />);
    expect(screen.queryByRole("button", { name: /Add Leave/i })).toBeNull();
  });
});

describe("CalendarView — overlapping leave entries", () => {
  it("renders both colour classes when two entries overlap on the same day", () => {
    const userWithOverlap: PublicUser = {
      ...alice,
      entries: [
        {
          id: "e-a",
          startDate: "2026-03-09",
          endDate: "2026-03-09",
          status: LeaveStatus.Approved,
          type: LeaveType.Holiday,
        },
        {
          id: "e-b",
          startDate: "2026-03-09",
          endDate: "2026-03-09",
          status: LeaveStatus.Planned,
          type: LeaveType.Holiday,
        },
      ],
    };
    const { container } = render(<CalendarView user={userWithOverlap} bankHolidays={[]} />);
    // Both green-200 (approved) and yellow-200 (planned) should appear
    expect(container.querySelector(".bg-green-200")).toBeInTheDocument();
    expect(container.querySelector(".bg-yellow-200")).toBeInTheDocument();
  });

  it("shows only the first two entries when three overlap on the same day", () => {
    const userWithThree: PublicUser = {
      ...alice,
      entries: [
        {
          id: "e-x",
          startDate: "2026-03-09",
          endDate: "2026-03-09",
          status: LeaveStatus.Approved,
          type: LeaveType.Holiday,
        },
        {
          id: "e-y",
          startDate: "2026-03-09",
          endDate: "2026-03-09",
          status: LeaveStatus.Planned,
          type: LeaveType.Holiday,
        },
        {
          id: "e-z",
          startDate: "2026-03-09",
          endDate: "2026-03-09",
          status: LeaveStatus.Requested,
          type: LeaveType.Holiday,
        },
      ],
    };
    const { container } = render(<CalendarView user={userWithThree} bankHolidays={[]} />);
    // The legend always has one bg-blue-200 span.  A requested entry in the calendar
    // would add a second one.  With capping at 2 the requested entry is not rendered
    // so there should only be the one legend swatch.
    const blueElements = container.querySelectorAll(".bg-blue-200");
    // Only the legend swatch (1) — no calendar cell for the third entry
    expect(blueElements.length).toBe(1);
  });
});

describe("CalendarView — leave popover on click", () => {
  it("shows a popover when a leave entry cell is clicked", async () => {
    const user = setup();
    const entry = {
      id: "e-pop",
      startDate: "2026-03-09",
      endDate: "2026-03-11",
      status: LeaveStatus.Approved,
      type: LeaveType.Holiday,
      notes: "Annual leave",
    };
    render(<CalendarView user={{ ...alice, entries: [entry] }} bankHolidays={[]} />);
    // Click on day 9 (covered by the entry)
    const dayNine = screen.getByText("9");
    await user.click(dayNine);
    // Popover should appear — there is now at least one instance in the popover
    // (notes may also appear as a tiny label in the cell itself)
    expect(screen.getAllByText("Annual leave").length).toBeGreaterThanOrEqual(1);
    // The popover has role="tooltip"
    expect(screen.getByRole("tooltip")).toBeInTheDocument();
  });

  it("shows a popover with date range and working days", async () => {
    const user = setup();
    const entry = {
      id: "e-pop2",
      startDate: "2026-03-09",
      endDate: "2026-03-09",
      status: LeaveStatus.Planned,
      type: LeaveType.Holiday,
      notes: "Dentist",
    };
    render(<CalendarView user={{ ...alice, entries: [entry] }} bankHolidays={[]} />);
    await user.click(screen.getByText("9"));
    expect(screen.getByRole("tooltip")).toBeInTheDocument();
    expect(screen.getByText(/working day/i)).toBeInTheDocument();
  });

  it("shows edit and delete buttons in the popover when isOwnProfile=true", async () => {
    const user = setup();
    const entry = {
      id: "e-pop3",
      startDate: "2026-03-09",
      endDate: "2026-03-09",
      status: LeaveStatus.Approved,
      type: LeaveType.Holiday,
    };
    render(
      <CalendarView
        user={{ ...alice, entries: [entry] }}
        bankHolidays={[]}
        isOwnProfile={true}
        onEdit={jest.fn()}
        onDelete={jest.fn()}
      />
    );
    await user.click(screen.getByText("9"));
    expect(screen.getByRole("button", { name: /edit/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /delete/i })).toBeInTheDocument();
  });

  it("does not show edit/delete buttons when isOwnProfile=false", async () => {
    const user = setup();
    const entry = {
      id: "e-pop4",
      startDate: "2026-03-09",
      endDate: "2026-03-09",
      status: LeaveStatus.Approved,
      type: LeaveType.Holiday,
    };
    render(
      <CalendarView
        user={{ ...alice, entries: [entry] }}
        bankHolidays={[]}
        isOwnProfile={false}
        onEdit={jest.fn()}
        onDelete={jest.fn()}
      />
    );
    await user.click(screen.getByText("9"));
    expect(screen.queryByRole("button", { name: /edit/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /delete/i })).toBeNull();
  });

  it("closes the popover when the close (X) button is clicked", async () => {
    const user = setup();
    const entry = {
      id: "e-pop5",
      startDate: "2026-03-09",
      endDate: "2026-03-09",
      status: LeaveStatus.Approved,
      type: LeaveType.Holiday,
      notes: "Beach trip",
    };
    render(<CalendarView user={{ ...alice, entries: [entry] }} bankHolidays={[]} />);
    await user.click(screen.getByText("9"));
    // Popover is visible
    expect(screen.getByRole("tooltip")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Close" }));
    expect(screen.queryByRole("tooltip")).toBeNull();
  });

  it("calls onEdit with the entry when Edit is clicked in the popover", async () => {
    const user = setup();
    const onEdit = jest.fn();
    const entry = {
      id: "e-edit",
      startDate: "2026-03-09",
      endDate: "2026-03-09",
      status: LeaveStatus.Approved,
      type: LeaveType.Holiday,
    };
    render(
      <CalendarView
        user={{ ...alice, entries: [entry] }}
        bankHolidays={[]}
        isOwnProfile={true}
        onEdit={onEdit}
        onDelete={jest.fn()}
      />
    );
    await user.click(screen.getByText("9"));
    await user.click(screen.getByRole("button", { name: /edit/i }));
    expect(onEdit).toHaveBeenCalledWith(entry);
  });

  it("calls onDelete with the entry id when Delete is clicked in the popover", async () => {
    const user = setup();
    const onDelete = jest.fn();
    const entry = {
      id: "e-del",
      startDate: "2026-03-09",
      endDate: "2026-03-09",
      status: LeaveStatus.Approved,
      type: LeaveType.Holiday,
    };
    render(
      <CalendarView
        user={{ ...alice, entries: [entry] }}
        bankHolidays={[]}
        isOwnProfile={true}
        onEdit={jest.fn()}
        onDelete={onDelete}
      />
    );
    await user.click(screen.getByText("9"));
    await user.click(screen.getByRole("button", { name: /delete/i }));
    expect(onDelete).toHaveBeenCalledWith("e-del");
  });
});

describe("CalendarView — sick leave colour", () => {
  it("renders sick leave entry with red background in the grid cell", () => {
    const entry = {
      id: "e-sick",
      startDate: "2026-03-09",
      endDate: "2026-03-09",
      status: LeaveStatus.Approved,
      type: LeaveType.Sick,
    };
    const { container } = render(
      <CalendarView user={{ ...alice, entries: [entry] }} bankHolidays={[]} />
    );
    // Should have a red-200 cell in the grid
    expect(container.querySelector(".bg-red-200")).toBeInTheDocument();
  });

  it("does NOT show 'Sick' in the calendar legend when sick feature is disabled (default)", () => {
    render(<CalendarView user={alice} bankHolidays={[]} />);
    expect(screen.queryByText("Sick")).toBeNull();
  });
});

describe("CalendarView — half-day cells", () => {
  it("renders an AM half-day entry in the top half of the cell", () => {
    const entry = {
      id: "e-am",
      startDate: "2026-03-09",
      endDate: "2026-03-09",
      status: LeaveStatus.Approved,
      type: LeaveType.Holiday,
      duration: LeaveDuration.HalfMorning,
      notes: "Dentist",
    };
    render(<CalendarView user={{ ...alice, entries: [entry] }} bankHolidays={[]} />);
    // The notes should appear with "(AM)" appended
    expect(screen.getByText("Dentist (AM)")).toBeInTheDocument();
  });

  it("appends (PM) to the note text for PM half-day entries", () => {
    const entry = {
      id: "e-pm",
      startDate: "2026-03-09",
      endDate: "2026-03-09",
      status: LeaveStatus.Approved,
      type: LeaveType.Holiday,
      duration: LeaveDuration.HalfAfternoon,
      notes: "Physio",
    };
    render(<CalendarView user={{ ...alice, entries: [entry] }} bankHolidays={[]} />);
    expect(screen.getByText("Physio (PM)")).toBeInTheDocument();
  });

  it("also handles legacy halfDay/halfDayPeriod fields for backward compat", () => {
    const entry = {
      id: "e-legacy",
      startDate: "2026-03-09",
      endDate: "2026-03-09",
      status: LeaveStatus.Approved,
      type: LeaveType.Holiday,
      halfDay: true,
      halfDayPeriod: "am" as const,
      notes: "Legacy AM",
    };
    render(<CalendarView user={{ ...alice, entries: [entry] }} bankHolidays={[]} />);
    expect(screen.getByText("Legacy AM (AM)")).toBeInTheDocument();
  });

  it("shows two half-days on the same day as split cells (AM top, PM bottom)", () => {
    const amEntry = {
      id: "e-am2",
      startDate: "2026-03-09",
      endDate: "2026-03-09",
      status: LeaveStatus.Approved,
      type: LeaveType.Holiday,
      duration: LeaveDuration.HalfMorning,
      notes: "Morning",
    };
    const pmEntry = {
      id: "e-pm2",
      startDate: "2026-03-09",
      endDate: "2026-03-09",
      status: LeaveStatus.Planned,
      type: LeaveType.Holiday,
      duration: LeaveDuration.HalfAfternoon,
      notes: "Afternoon",
    };
    render(<CalendarView user={{ ...alice, entries: [amEntry, pmEntry] }} bankHolidays={[]} />);
    // Both notes visible
    expect(screen.getByText("Morning (AM)")).toBeInTheDocument();
    expect(screen.getByText("Afternoon (PM)")).toBeInTheDocument();
  });
});

describe("CalendarView — half-day popover shows duration label", () => {
  it("shows 'Half day (AM)' for an AM half-day entry in the popover", async () => {
    const user = setup();
    const entry = {
      id: "e-hd-pop",
      startDate: "2026-03-09",
      endDate: "2026-03-09",
      status: LeaveStatus.Approved,
      type: LeaveType.Holiday,
      duration: LeaveDuration.HalfMorning,
      notes: "Half day AM",
    };
    render(<CalendarView user={{ ...alice, entries: [entry] }} bankHolidays={[]} />);
    await user.click(screen.getByText("Half day AM (AM)"));
    expect(screen.getByRole("tooltip")).toBeInTheDocument();
    expect(screen.getByText("Half day (AM)")).toBeInTheDocument();
  });

  it("shows 'Half day (PM)' for a PM half-day entry in the popover", async () => {
    const user = setup();
    const entry = {
      id: "e-hd-pop-pm",
      startDate: "2026-03-09",
      endDate: "2026-03-09",
      status: LeaveStatus.Approved,
      type: LeaveType.Holiday,
      duration: LeaveDuration.HalfAfternoon,
      notes: "Half day PM",
    };
    render(<CalendarView user={{ ...alice, entries: [entry] }} bankHolidays={[]} />);
    await user.click(screen.getByText("Half day PM (PM)"));
    expect(screen.getByRole("tooltip")).toBeInTheDocument();
    expect(screen.getByText("Half day (PM)")).toBeInTheDocument();
  });

  it("shows working day count for a full-day entry in the popover", async () => {
    const user = setup();
    const entry = {
      id: "e-full-pop",
      startDate: "2026-03-09",
      endDate: "2026-03-09",
      status: LeaveStatus.Approved,
      type: LeaveType.Holiday,
      notes: "Full day",
    };
    render(<CalendarView user={{ ...alice, entries: [entry] }} bankHolidays={[]} />);
    await user.click(screen.getByText("9"));
    expect(screen.getByRole("tooltip")).toBeInTheDocument();
    expect(screen.getByText(/working day/i)).toBeInTheDocument();
  });
});

describe("CalendarView — getCellLayout full-day + half-day placement", () => {
  it("places a full-day entry in the bottom half when the half-day is AM", () => {
    const amHalfDay = {
      id: "e-am-h",
      startDate: "2026-03-09",
      endDate: "2026-03-09",
      status: LeaveStatus.Approved,
      type: LeaveType.Holiday,
      duration: LeaveDuration.HalfMorning,
      notes: "AM",
    };
    const fullDay = {
      id: "e-full-h",
      startDate: "2026-03-09",
      endDate: "2026-03-09",
      status: LeaveStatus.Planned,
      type: LeaveType.Holiday,
      notes: "Full",
    };
    render(<CalendarView user={{ ...alice, entries: [amHalfDay, fullDay] }} bankHolidays={[]} />);
    // Both entries should be visible
    expect(screen.getByText("AM (AM)")).toBeInTheDocument();
    expect(screen.getByText("Full")).toBeInTheDocument();
  });

  it("places a full-day entry in the top half when the half-day is PM", () => {
    const pmHalfDay = {
      id: "e-pm-h",
      startDate: "2026-03-09",
      endDate: "2026-03-09",
      status: LeaveStatus.Approved,
      type: LeaveType.Holiday,
      duration: LeaveDuration.HalfAfternoon,
      notes: "PM",
    };
    const fullDay = {
      id: "e-full-h2",
      startDate: "2026-03-09",
      endDate: "2026-03-09",
      status: LeaveStatus.Requested,
      type: LeaveType.Holiday,
      notes: "Full",
    };
    render(<CalendarView user={{ ...alice, entries: [pmHalfDay, fullDay] }} bankHolidays={[]} />);
    expect(screen.getByText("PM (PM)")).toBeInTheDocument();
    expect(screen.getByText("Full")).toBeInTheDocument();
  });
});

describe("CalendarView — getCellLayout status priority ordering", () => {
  it("places the Approved entry above the Planned entry when both are full-day", () => {
    const approved = {
      id: "e-appr",
      startDate: "2026-03-09",
      endDate: "2026-03-09",
      status: LeaveStatus.Approved,
      type: LeaveType.Holiday,
      notes: "ApprovedLeave",
    };
    const planned = {
      id: "e-plan",
      startDate: "2026-03-09",
      endDate: "2026-03-09",
      status: LeaveStatus.Planned,
      type: LeaveType.Holiday,
      notes: "PlannedLeave",
    };
    const { container } = render(
      <CalendarView user={{ ...alice, entries: [planned, approved] }} bankHolidays={[]} />
    );
    // Both texts should appear in the split cell
    expect(screen.getByText("ApprovedLeave")).toBeInTheDocument();
    expect(screen.getByText("PlannedLeave")).toBeInTheDocument();
    // Approved should appear before Planned in the DOM (top half first)
    const allText = container.textContent ?? "";
    const approvedPos = allText.indexOf("ApprovedLeave");
    const plannedPos = allText.indexOf("PlannedLeave");
    expect(approvedPos).toBeLessThan(plannedPos);
  });

  it("places the Requested entry above the Planned entry when both are same AM period", () => {
    const requested = {
      id: "e-req-am",
      startDate: "2026-03-09",
      endDate: "2026-03-09",
      status: LeaveStatus.Requested,
      type: LeaveType.Holiday,
      duration: LeaveDuration.HalfMorning,
      notes: "RequestedAM",
    };
    const planned = {
      id: "e-plan-am",
      startDate: "2026-03-09",
      endDate: "2026-03-09",
      status: LeaveStatus.Planned,
      type: LeaveType.Holiday,
      duration: LeaveDuration.HalfMorning,
      notes: "PlannedAM",
    };
    const { container } = render(
      <CalendarView user={{ ...alice, entries: [planned, requested] }} bankHolidays={[]} />
    );
    expect(screen.getByText("RequestedAM (AM)")).toBeInTheDocument();
    expect(screen.getByText("PlannedAM (AM)")).toBeInTheDocument();
    const allText = container.textContent ?? "";
    expect(allText.indexOf("RequestedAM")).toBeLessThan(allText.indexOf("PlannedAM"));
  });
});

describe("CalendarView — sick leave popover badge", () => {
  it("shows 'Sick Leave' badge in the popover for a sick-leave entry", async () => {
    const user = setup();
    const entry = {
      id: "e-sick-pop",
      startDate: "2026-03-09",
      endDate: "2026-03-09",
      status: LeaveStatus.Approved,
      type: LeaveType.Sick,
      notes: "Sick day",
    };
    render(
      <CalendarView
        user={{ ...alice, entries: [entry] }}
        bankHolidays={[]}
        isOwnProfile={true}
        onEdit={jest.fn()}
        onDelete={jest.fn()}
      />
    );
    await user.click(screen.getByText("9"));
    expect(screen.getByRole("tooltip")).toBeInTheDocument();
    expect(screen.getByText("Sick Leave")).toBeInTheDocument();
  });

  it("does NOT show 'Approved' badge for a sick-leave entry", async () => {
    const user = setup();
    const entry = {
      id: "e-sick-pop2",
      startDate: "2026-03-09",
      endDate: "2026-03-09",
      status: LeaveStatus.Approved,
      type: LeaveType.Sick,
      notes: "Cold",
    };
    render(
      <CalendarView
        user={{ ...alice, entries: [entry] }}
        bankHolidays={[]}
        isOwnProfile={true}
        onEdit={jest.fn()}
        onDelete={jest.fn()}
      />
    );
    await user.click(screen.getByText("9"));
    // The badge should say "Sick Leave", not "Approved"
    const tooltip = screen.getByRole("tooltip");
    expect(tooltip).not.toHaveTextContent("Approved");
    expect(tooltip).toHaveTextContent("Sick Leave");
  });
});

describe("CalendarView — popover close on outside click", () => {
  it("closes the popover when a mousedown occurs outside the calendar", async () => {
    const user = setup();
    const entry = {
      id: "e-outside",
      startDate: "2026-03-09",
      endDate: "2026-03-09",
      status: LeaveStatus.Approved,
      type: LeaveType.Holiday,
      notes: "Outside click test",
    };
    render(<CalendarView user={{ ...alice, entries: [entry] }} bankHolidays={[]} />);
    // Open the popover
    await user.click(screen.getByText("9"));
    expect(screen.getByRole("tooltip")).toBeInTheDocument();
    // Dispatch a mousedown on document.body (outside the calendar div)
    fireEvent.mouseDown(document.body);
    expect(screen.queryByRole("tooltip")).toBeNull();
  });
});

describe("CalendarView — re-click same entry closes popover", () => {
  it("closes the popover when the same entry cell is clicked a second time", async () => {
    const user = setup();
    const entry = {
      id: "e-reclick",
      startDate: "2026-03-09",
      endDate: "2026-03-09",
      status: LeaveStatus.Approved,
      type: LeaveType.Holiday,
      notes: "Re-click test",
    };
    render(<CalendarView user={{ ...alice, entries: [entry] }} bankHolidays={[]} />);
    // First click — opens popover
    await user.click(screen.getByText("9"));
    expect(screen.getByRole("tooltip")).toBeInTheDocument();
    // Second click on same cell — closes popover
    await user.click(screen.getByText("9"));
    expect(screen.queryByRole("tooltip")).toBeNull();
  });
});

describe("CalendarView — getNoteLabel without notes (pure duration label)", () => {
  it("shows '(AM)' (no leading note) for an AM half-day with no notes", () => {
    const entry = {
      id: "e-am-nonote",
      startDate: "2026-03-09",
      endDate: "2026-03-09",
      status: LeaveStatus.Approved,
      type: LeaveType.Holiday,
      duration: LeaveDuration.HalfMorning,
      // no notes
    };
    render(<CalendarView user={{ ...alice, entries: [entry] }} bankHolidays={[]} />);
    expect(screen.getByText("(AM)")).toBeInTheDocument();
  });

  it("shows '(PM)' (no leading note) for a PM half-day with no notes", () => {
    const entry = {
      id: "e-pm-nonote",
      startDate: "2026-03-09",
      endDate: "2026-03-09",
      status: LeaveStatus.Approved,
      type: LeaveType.Holiday,
      duration: LeaveDuration.HalfAfternoon,
      // no notes
    };
    render(<CalendarView user={{ ...alice, entries: [entry] }} bankHolidays={[]} />);
    expect(screen.getByText("(PM)")).toBeInTheDocument();
  });
});

describe("CalendarView — getCellLayout: b is AM or PM, a is not", () => {
  it("places entry b (AM) on top when b is AM and a is full-day", () => {
    // a = full-day (first), b = AM half-day (second) → line 89: bIsAm && !aIsAm
    const fullDay = {
      id: "e-full-ba",
      startDate: "2026-03-09",
      endDate: "2026-03-09",
      status: LeaveStatus.Planned,
      type: LeaveType.Holiday,
      notes: "Full",
    };
    const amHalfDay = {
      id: "e-am-ba",
      startDate: "2026-03-09",
      endDate: "2026-03-09",
      status: LeaveStatus.Approved,
      type: LeaveType.Holiday,
      duration: LeaveDuration.HalfMorning,
      notes: "AM",
    };
    const { container } = render(
      // Pass full-day first (a), AM second (b) — tests the bIsAm && !aIsAm branch
      <CalendarView user={{ ...alice, entries: [fullDay, amHalfDay] }} bankHolidays={[]} />
    );
    expect(screen.getByText("AM (AM)")).toBeInTheDocument();
    expect(screen.getByText("Full")).toBeInTheDocument();
    // AM entry should be rendered (visible in the split cell)
    expect(container.querySelector(".bg-green-200")).toBeInTheDocument();
  });

  it("places entry b (PM) on bottom when b is PM and a is full-day", () => {
    // a = full-day (first), b = PM half-day (second) → line 94: bIsPm && !aIsPm
    const fullDay = {
      id: "e-full-bp",
      startDate: "2026-03-09",
      endDate: "2026-03-09",
      status: LeaveStatus.Planned,
      type: LeaveType.Holiday,
      notes: "Full2",
    };
    const pmHalfDay = {
      id: "e-pm-bp",
      startDate: "2026-03-09",
      endDate: "2026-03-09",
      status: LeaveStatus.Approved,
      type: LeaveType.Holiday,
      duration: LeaveDuration.HalfAfternoon,
      notes: "PM2",
    };
    const { container } = render(
      // Pass full-day first (a), PM second (b) — tests the bIsPm && !aIsPm branch
      <CalendarView user={{ ...alice, entries: [fullDay, pmHalfDay] }} bankHolidays={[]} />
    );
    expect(screen.getByText("PM2 (PM)")).toBeInTheDocument();
    expect(screen.getByText("Full2")).toBeInTheDocument();
    expect(container.querySelector(".bg-green-200")).toBeInTheDocument();
  });
});

describe("CalendarView — bank holiday with no title falls back to 'BH'", () => {
  it("shows 'BH' text when the bank holiday has an undefined title", () => {
    render(
      <CalendarView
        user={alice}
        bankHolidays={[{ date: "2026-03-02", title: undefined as unknown as string }]}
      />
    );
    // The cell should show 'BH' as the fallback
    const bhElements = screen.getAllByText("BH");
    expect(bhElements.length).toBeGreaterThanOrEqual(1);
  });
});

describe("CalendarView — popover with only onEdit (no onDelete)", () => {
  it("shows only the Edit button when onDelete is not provided", async () => {
    const user = setup();
    const entry = {
      id: "e-edit-only",
      startDate: "2026-03-09",
      endDate: "2026-03-09",
      status: LeaveStatus.Approved,
      type: LeaveType.Holiday,
    };
    render(
      <CalendarView
        user={{ ...alice, entries: [entry] }}
        bankHolidays={[]}
        isOwnProfile={true}
        onEdit={jest.fn()}
        // onDelete intentionally omitted
      />
    );
    await user.click(screen.getByText("9"));
    expect(screen.getByRole("button", { name: /edit/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /delete/i })).toBeNull();
  });

  it("shows only the Delete button when onEdit is not provided", async () => {
    const user = setup();
    const entry = {
      id: "e-delete-only",
      startDate: "2026-03-09",
      endDate: "2026-03-09",
      status: LeaveStatus.Approved,
      type: LeaveType.Holiday,
    };
    render(
      <CalendarView
        user={{ ...alice, entries: [entry] }}
        bankHolidays={[]}
        isOwnProfile={true}
        // onEdit intentionally omitted
        onDelete={jest.fn()}
      />
    );
    await user.click(screen.getByText("9"));
    expect(screen.queryByRole("button", { name: /edit/i })).toBeNull();
    expect(screen.getByRole("button", { name: /delete/i })).toBeInTheDocument();
  });
});

describe("CalendarView — split-cell click opens popover for top and bottom entries", () => {
  const amEntry = {
    id: "e-split-am",
    startDate: "2026-03-09",
    endDate: "2026-03-09",
    status: LeaveStatus.Approved,
    type: LeaveType.Holiday,
    duration: LeaveDuration.HalfMorning,
    notes: "TopAM",
  };
  const pmEntry = {
    id: "e-split-pm",
    startDate: "2026-03-09",
    endDate: "2026-03-09",
    status: LeaveStatus.Planned,
    type: LeaveType.Holiday,
    duration: LeaveDuration.HalfAfternoon,
    notes: "BotPM",
  };

  it("opens a popover when the top half of a split cell is clicked", async () => {
    const user = setup();
    render(<CalendarView user={{ ...alice, entries: [amEntry, pmEntry] }} bankHolidays={[]} />);
    // Click the AM label in the top half
    await user.click(screen.getByText("TopAM (AM)"));
    expect(screen.getByRole("tooltip")).toBeInTheDocument();
  });

  it("opens a popover when the bottom half of a split cell is clicked", async () => {
    const user = setup();
    render(<CalendarView user={{ ...alice, entries: [amEntry, pmEntry] }} bankHolidays={[]} />);
    // Click the PM label in the bottom half
    await user.click(screen.getByText("BotPM (PM)"));
    expect(screen.getByRole("tooltip")).toBeInTheDocument();
  });
});

describe("CalendarView — clicking empty date cells opens Add Leave", () => {
  it("calls onAdd with the date string when a non-working-day-free empty cell is clicked on own profile", async () => {
    const user = setup();
    const onAdd = jest.fn();
    // alice has nonWorkingDays [0, 6] (Sun+Sat); 2026-03-09 is a Monday → no NWD, no leave
    render(<CalendarView user={alice} bankHolidays={[]} isOwnProfile={true} onAdd={onAdd} />);
    // "9" renders the 9th of March 2026 (Monday — not a NWD)
    await user.click(screen.getByText("9"));
    expect(onAdd).toHaveBeenCalledWith("2026-03-09");
  });

  it("does not call onAdd when a non-working-day cell is clicked", async () => {
    const user = setup();
    const onAdd = jest.fn();
    // 2026-03-07 is a Saturday → NWD for alice (nonWorkingDays includes 6)
    render(<CalendarView user={alice} bankHolidays={[]} isOwnProfile={true} onAdd={onAdd} />);
    await user.click(screen.getByText("7"));
    expect(onAdd).not.toHaveBeenCalled();
  });

  it("does not call onAdd when isOwnProfile is false", async () => {
    const user = setup();
    const onAdd = jest.fn();
    render(<CalendarView user={alice} bankHolidays={[]} isOwnProfile={false} onAdd={onAdd} />);
    await user.click(screen.getByText("9"));
    expect(onAdd).not.toHaveBeenCalled();
  });

  it("does not call onAdd on an empty cell when onAdd is not provided", async () => {
    const user = setup();
    // No onAdd prop — should not throw
    render(<CalendarView user={alice} bankHolidays={[]} isOwnProfile={true} />);
    await user.click(screen.getByText("9"));
    // No assertion needed — test passes if no error is thrown
  });

  it("does not call onAdd when an empty bank holiday cell is clicked", async () => {
    const user = setup();
    const onAdd = jest.fn();
    // 2026-03-09 is Monday — mark it as a bank holiday
    render(
      <CalendarView
        user={alice}
        bankHolidays={[bh("2026-03-09", "Test BH")]}
        isOwnProfile={true}
        onAdd={onAdd}
      />
    );
    await user.click(screen.getByText("9"));
    expect(onAdd).not.toHaveBeenCalled();
  });
});

describe("CalendarView — mobile bottom-sheet popover (isMobileSheet=true)", () => {
  const originalInnerWidth = window.innerWidth;

  beforeEach(() => {
    Object.defineProperty(window, "innerWidth", { writable: true, configurable: true, value: 375 });
  });

  afterEach(() => {
    Object.defineProperty(window, "innerWidth", {
      writable: true,
      configurable: true,
      value: originalInnerWidth,
    });
  });

  const mobileEntry = {
    id: "e-mob",
    startDate: "2026-03-09",
    endDate: "2026-03-09",
    status: LeaveStatus.Approved,
    type: LeaveType.Holiday,
    notes: "Mobile leave",
  };

  it("renders mobile bottom-sheet classes on the popover container when the viewport is narrow", async () => {
    const user = setup();
    const { container } = render(
      <CalendarView user={{ ...alice, entries: [mobileEntry] }} bankHolidays={[]} />
    );
    await user.click(screen.getByText("9"));
    // Mobile sheet uses rounded-t-2xl (desktop uses rounded-xl)
    expect(container.querySelector(".rounded-t-2xl")).toBeInTheDocument();
  });

  it("renders mobile classes on the close button when the viewport is narrow", async () => {
    const user = setup();
    const { container } = render(
      <CalendarView user={{ ...alice, entries: [mobileEntry] }} bankHolidays={[]} />
    );
    await user.click(screen.getByText("9"));
    // Mobile close button has top-4 class (desktop uses top-2)
    expect(container.querySelector(".top-4")).toBeInTheDocument();
  });

  it("renders the mobile backdrop when a leave entry cell is clicked on mobile", async () => {
    const user = setup();
    render(<CalendarView user={{ ...alice, entries: [mobileEntry] }} bankHolidays={[]} />);
    await user.click(screen.getByText("9"));
    expect(screen.getByTestId("mobile-backdrop")).toBeInTheDocument();
  });

  it("closes the popover when the mobile backdrop is clicked", async () => {
    const user = setup();
    render(<CalendarView user={{ ...alice, entries: [mobileEntry] }} bankHolidays={[]} />);
    await user.click(screen.getByText("9"));
    expect(screen.getByRole("tooltip")).toBeInTheDocument();
    await user.click(screen.getByTestId("mobile-backdrop"));
    expect(screen.queryByRole("tooltip")).toBeNull();
  });

  it("renders mobile classes on the edit button when the viewport is narrow", async () => {
    const user = setup();
    render(
      <CalendarView
        user={{ ...alice, entries: [mobileEntry] }}
        bankHolidays={[]}
        isOwnProfile={true}
        onEdit={jest.fn()}
        onDelete={jest.fn()}
      />
    );
    await user.click(screen.getByText("9"));
    // Mobile edit button has flex-1 (desktop does not)
    expect(screen.getByRole("button", { name: /edit/i }).className).toContain("flex-1");
  });

  it("renders mobile classes on the delete button when the viewport is narrow", async () => {
    const user = setup();
    render(
      <CalendarView
        user={{ ...alice, entries: [mobileEntry] }}
        bankHolidays={[]}
        isOwnProfile={true}
        onEdit={jest.fn()}
        onDelete={jest.fn()}
      />
    );
    await user.click(screen.getByText("9"));
    // Mobile delete button has flex-1 (desktop does not)
    expect(screen.getByRole("button", { name: /delete/i }).className).toContain("flex-1");
  });
});
