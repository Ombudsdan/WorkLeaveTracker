import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import CalendarView from "@/components/dashboard/CalendarView";
import { LeaveStatus, LeaveType } from "@/types";
import type { PublicUser } from "@/types";

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

describe("CalendarView — header and navigation", () => {
  it("renders the current month and year initially", () => {
    render(<CalendarView user={alice} bankHolidays={[]} />);
    expect(screen.getByRole("heading", { name: /Mar 2026/i })).toBeInTheDocument();
  });

  it("navigates to the previous month when the ‹ button is clicked", async () => {
    const user = setup();
    render(<CalendarView user={alice} bankHolidays={[]} />);
    await user.click(screen.getByRole("button", { name: "Previous month" }));
    expect(screen.getByRole("heading", { name: /Feb 2026/i })).toBeInTheDocument();
  });

  it("navigates to the next month when the › button is clicked", async () => {
    const user = setup();
    render(<CalendarView user={alice} bankHolidays={[]} />);
    await user.click(screen.getByRole("button", { name: "Next month" }));
    expect(screen.getByRole("heading", { name: /Apr 2026/i })).toBeInTheDocument();
  });

  it("wraps from January to December (previous) correctly", async () => {
    const user = setup();
    // Navigate back from March → February → January → December
    render(<CalendarView user={alice} bankHolidays={[]} />);
    const prev = screen.getByRole("button", { name: "Previous month" });
    await user.click(prev); // Feb
    await user.click(prev); // Jan
    await user.click(prev); // Dec 2025
    expect(screen.getByRole("heading", { name: /Dec 2025/i })).toBeInTheDocument();
  });

  it("wraps from December to January (next) correctly", async () => {
    jest.setSystemTime(new Date("2026-12-01"));
    const user = setup();
    render(<CalendarView user={alice} bankHolidays={[]} />);
    await user.click(screen.getByRole("button", { name: "Next month" }));
    expect(screen.getByRole("heading", { name: /Jan 2027/i })).toBeInTheDocument();
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
    const { container } = render(<CalendarView user={alice} bankHolidays={["2026-03-02"]} />);
    // bg-purple-100 is CALENDAR_CELL_BANK_HOLIDAY
    expect(container.querySelector(".bg-purple-100")).toBeInTheDocument();
  });

  it("shows the 'BH' label on a bank holiday cell with no entry", () => {
    render(<CalendarView user={alice} bankHolidays={["2026-03-02"]} />);
    expect(screen.getByText("BH")).toBeInTheDocument();
  });

  it("does NOT show the 'BH' label when the bank holiday date has a leave entry", () => {
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
    render(<CalendarView user={userWithEntry} bankHolidays={["2026-03-02"]} />);
    expect(screen.queryByText("BH")).toBeNull();
  });
});

describe("CalendarView — non-working day display", () => {
  it("applies the non-working class to a Sunday cell (nonWorkingDays includes 0)", () => {
    const { container } = render(<CalendarView user={alice} bankHolidays={[]} />);
    // bg-gray-100 is CALENDAR_CELL_NON_WORKING
    // March 2026 has Sundays on 1, 8, 15, 22, 29
    expect(container.querySelector(".bg-gray-100")).toBeInTheDocument();
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
  it("shows the Add Leave button when isOwnProfile=true and onAdd is provided", () => {
    render(<CalendarView user={alice} bankHolidays={[]} isOwnProfile={true} onAdd={jest.fn()} />);
    expect(screen.getByRole("button", { name: /Add Leave/i })).toBeInTheDocument();
  });

  it("does not show the Add Leave button when isOwnProfile is false", () => {
    render(<CalendarView user={alice} bankHolidays={[]} isOwnProfile={false} onAdd={jest.fn()} />);
    expect(screen.queryByRole("button", { name: /Add Leave/i })).toBeNull();
  });

  it("calls onAdd when the Add Leave button is clicked", async () => {
    const user = setup();
    const onAdd = jest.fn();
    render(<CalendarView user={alice} bankHolidays={[]} isOwnProfile={true} onAdd={onAdd} />);
    await user.click(screen.getByRole("button", { name: /Add Leave/i }));
    expect(onAdd).toHaveBeenCalledTimes(1);
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
