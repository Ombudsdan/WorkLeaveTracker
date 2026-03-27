import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import MicroAnnualPlanner from "@/components/dashboard/MicroAnnualPlanner";
import { LeaveStatus, LeaveType } from "@/types";
import type { PublicUser } from "@/types";

// Fix date so getActiveYearAllowance picks 2026 allowance deterministically
beforeEach(() => {
  jest.useFakeTimers();
  jest.setSystemTime(new Date("2026-03-15"));
});

afterEach(() => {
  jest.useRealTimers();
});

const alice: PublicUser = {
  id: "u1",
  profile: {
    firstName: "Alice",
    lastName: "Smith",
    email: "alice@example.com",
    nonWorkingDays: [0, 6], // Sun, Sat
  },
  yearAllowances: [
    { year: 2026, company: "Acme", holidayStartMonth: 1, core: 25, bought: 0, carried: 0 },
  ],
  entries: [],
};

describe("MicroAnnualPlanner — basic rendering", () => {
  it("renders the widget container", () => {
    render(<MicroAnnualPlanner user={alice} bankHolidays={[]} />);
    expect(screen.getByTestId("micro-annual-planner")).toBeInTheDocument();
  });

  it("renders 12 month rows for a January-start year", () => {
    render(<MicroAnnualPlanner user={alice} bankHolidays={[]} />);
    const rows = screen.getAllByTestId(/^month-row-/);
    expect(rows).toHaveLength(12);
  });

  it("renders month abbreviations Jan through Dec for a Jan-start year", () => {
    render(<MicroAnnualPlanner user={alice} bankHolidays={[]} />);
    const abbrevs = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    abbrevs.forEach((abbr) => {
      expect(screen.getByText(abbr)).toBeInTheDocument();
    });
  });

  it("renders a link to the annual planner page", () => {
    render(<MicroAnnualPlanner user={alice} bankHolidays={[]} />);
    const link = screen.getByRole("link", { name: /full planner/i });
    expect(link).toHaveAttribute("href", "/annual-planner");
  });

  it("shows 'Annual Overview' as the heading", () => {
    render(<MicroAnnualPlanner user={alice} bankHolidays={[]} />);
    expect(screen.getByText("Annual Overview")).toBeInTheDocument();
  });

  it("renders the legend with Approved, Requested, Planned", () => {
    render(<MicroAnnualPlanner user={alice} bankHolidays={[]} />);
    expect(screen.getByText("Approved")).toBeInTheDocument();
    expect(screen.getByText("Requested")).toBeInTheDocument();
    expect(screen.getByText("Planned")).toBeInTheDocument();
  });

  it("returns null when the user has no year allowances", () => {
    const noAllowances: PublicUser = { ...alice, yearAllowances: [] };
    const { container } = render(<MicroAnnualPlanner user={noAllowances} bankHolidays={[]} />);
    expect(container.firstChild).toBeNull();
  });
});

describe("MicroAnnualPlanner — day boxes", () => {
  it("renders day boxes for each day in March (31 days)", () => {
    render(<MicroAnnualPlanner user={alice} bankHolidays={[]} />);
    const marchRow = screen.getByTestId("month-row-Mar");
    const boxes = within(marchRow).getAllByTestId("day-box");
    expect(boxes).toHaveLength(31);
  });

  it("renders day boxes for February (28 days in 2026)", () => {
    render(<MicroAnnualPlanner user={alice} bankHolidays={[]} />);
    const febRow = screen.getByTestId("month-row-Feb");
    const boxes = within(febRow).getAllByTestId("day-box");
    expect(boxes).toHaveLength(28);
  });
});

describe("MicroAnnualPlanner — leave coloring", () => {
  const aliceWithLeave: PublicUser = {
    ...alice,
    entries: [
      {
        id: "e1",
        startDate: "2026-03-09",
        endDate: "2026-03-13",
        status: LeaveStatus.Approved,
        type: LeaveType.Holiday,
      },
    ],
  };

  it("colors approved leave boxes green", () => {
    render(<MicroAnnualPlanner user={aliceWithLeave} bankHolidays={[]} />);
    const marchRow = screen.getByTestId("month-row-Mar");
    // Mon 9 → Fri 13 are working days (no non-working in this range since nonWorkingDays=[0,6])
    // Days 9,10,11,12,13 → 5 boxes should have green class
    const greenBoxes = within(marchRow)
      .getAllByTestId("day-box")
      .filter((el) => el.className.includes("bg-green-400"));
    expect(greenBoxes).toHaveLength(5);
  });

  it("colors requested leave boxes blue", () => {
    const userRequested: PublicUser = {
      ...alice,
      entries: [
        {
          id: "e2",
          startDate: "2026-03-16",
          endDate: "2026-03-16",
          status: LeaveStatus.Requested,
          type: LeaveType.Holiday,
        },
      ],
    };
    render(<MicroAnnualPlanner user={userRequested} bankHolidays={[]} />);
    const marchRow = screen.getByTestId("month-row-Mar");
    const blueBoxes = within(marchRow)
      .getAllByTestId("day-box")
      .filter((el) => el.className.includes("bg-yellow-300"));
    expect(blueBoxes).toHaveLength(1);
  });

  it("colors planned leave boxes yellow", () => {
    const userPlanned: PublicUser = {
      ...alice,
      entries: [
        {
          id: "e3",
          startDate: "2026-03-20",
          endDate: "2026-03-20",
          status: LeaveStatus.Planned,
          type: LeaveType.Holiday,
        },
      ],
    };
    render(<MicroAnnualPlanner user={userPlanned} bankHolidays={[]} />);
    const marchRow = screen.getByTestId("month-row-Mar");
    const yellowBoxes = within(marchRow)
      .getAllByTestId("day-box")
      .filter((el) => el.className.includes("bg-blue-400"));
    expect(yellowBoxes).toHaveLength(1);
  });

  it("does not color sick leave entries", () => {
    const userSick: PublicUser = {
      ...alice,
      entries: [
        {
          id: "e4",
          startDate: "2026-03-16",
          endDate: "2026-03-16",
          status: LeaveStatus.Approved,
          type: LeaveType.Sick,
        },
      ],
    };
    render(<MicroAnnualPlanner user={userSick} bankHolidays={[]} />);
    const marchRow = screen.getByTestId("month-row-Mar");
    // Monday 16 March has sick leave — should NOT be colored green
    const greenBoxes = within(marchRow)
      .getAllByTestId("day-box")
      .filter((el) => el.className.includes("bg-green-400"));
    expect(greenBoxes).toHaveLength(0);
  });

  it("marks bank holiday boxes with the bank-holiday purple colour (bg-purple-300)", () => {
    render(
      <MicroAnnualPlanner user={alice} bankHolidays={[{ date: "2026-03-16", title: "Test BH" }]} />
    );
    const marchRow = screen.getByTestId("month-row-Mar");
    // Day 16 is a bank holiday → should use bg-purple-300
    const boxes = within(marchRow).getAllByTestId("day-box");
    const day16Box = boxes[15]; // 0-indexed: day 16 is index 15
    expect(day16Box.className).toContain("bg-purple-300");
  });
});

describe("MicroAnnualPlanner — April-start holiday year", () => {
  const bobAprilStart: PublicUser = {
    ...alice,
    id: "u2",
    yearAllowances: [
      { year: 2025, company: "Acme", holidayStartMonth: 4, core: 25, bought: 0, carried: 0 },
    ],
    entries: [],
  };

  it("renders month rows starting with Apr for an April-start year", () => {
    render(<MicroAnnualPlanner user={bobAprilStart} bankHolidays={[]} />);
    const rows = screen.getAllByTestId(/^month-row-/);
    expect(rows).toHaveLength(12);
    // First row should be Apr
    expect(rows[0]).toHaveAttribute("data-testid", "month-row-Apr");
    // Last row should be Mar
    expect(rows[11]).toHaveAttribute("data-testid", "month-row-Mar");
  });
});

describe("MicroAnnualPlanner — grey colour swap", () => {
  it("renders weekend boxes with the darker grey (bg-gray-300)", () => {
    // Alice's nonWorkingDays = [0, 6]; March 2026 day 1 = Sun (dow=0) → weekend
    render(<MicroAnnualPlanner user={alice} bankHolidays={[]} />);
    const marchRow = screen.getByTestId("month-row-Mar");
    const boxes = within(marchRow).getAllByTestId("day-box");
    // Day 1 (Sun) = index 0 → weekend
    expect(boxes[0].className).toContain("bg-gray-300");
  });

  it("renders working-day-no-leave boxes with the lighter grey (bg-gray-100)", () => {
    // March 2026 day 2 = Mon (dow=1) → working day, no leave
    render(<MicroAnnualPlanner user={alice} bankHolidays={[]} />);
    const marchRow = screen.getByTestId("month-row-Mar");
    const boxes = within(marchRow).getAllByTestId("day-box");
    // Day 2 (Mon) = index 1 → working day with no leave
    expect(boxes[1].className).toContain("bg-gray-100");
    expect(boxes[1].className).not.toContain("bg-gray-300");
  });
});

describe("MicroAnnualPlanner — legend", () => {
  it("shows the Bank Holiday entry in the legend", () => {
    render(<MicroAnnualPlanner user={alice} bankHolidays={[]} />);
    expect(screen.getByText("Bank Holiday")).toBeInTheDocument();
  });
});

describe("MicroAnnualPlanner — popovers", () => {
  const aliceWithLeave: PublicUser = {
    ...alice,
    entries: [
      {
        id: "e1",
        startDate: "2026-03-09",
        endDate: "2026-03-09",
        status: LeaveStatus.Approved,
        type: LeaveType.Holiday,
        notes: "Beach trip",
      },
    ],
  };

  it("shows a popover with leave info when clicking a leave box", async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime.bind(jest) });
    render(<MicroAnnualPlanner user={aliceWithLeave} bankHolidays={[]} />);
    const marchRow = screen.getByTestId("month-row-Mar");
    const boxes = within(marchRow).getAllByTestId("day-box");
    // Day 9 = index 8 → has approved leave
    await user.click(boxes[8]);
    const tooltip = screen.getByRole("tooltip");
    expect(tooltip).toBeInTheDocument();
    expect(tooltip.textContent).toMatch(/approved/i);
  });

  it("shows a popover with the bank holiday name when clicking a bank holiday box", async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime.bind(jest) });
    render(
      <MicroAnnualPlanner
        user={alice}
        bankHolidays={[{ date: "2026-03-16", title: "St Patrick's Day" }]}
      />
    );
    const marchRow = screen.getByTestId("month-row-Mar");
    const boxes = within(marchRow).getAllByTestId("day-box");
    // Day 16 = index 15 → bank holiday
    await user.click(boxes[15]);
    const tooltip = screen.getByRole("tooltip");
    expect(tooltip).toBeInTheDocument();
    expect(tooltip.textContent).toContain("St Patrick's Day");
  });

  it("closes the popover when the Close button is clicked", async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime.bind(jest) });
    render(<MicroAnnualPlanner user={aliceWithLeave} bankHolidays={[]} />);
    const marchRow = screen.getByTestId("month-row-Mar");
    const boxes = within(marchRow).getAllByTestId("day-box");
    await user.click(boxes[8]);
    expect(screen.getByRole("tooltip")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Close popover" }));
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
  });

  it("does not open a popover when clicking an empty working day", async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime.bind(jest) });
    render(<MicroAnnualPlanner user={alice} bankHolidays={[]} />);
    const marchRow = screen.getByTestId("month-row-Mar");
    const boxes = within(marchRow).getAllByTestId("day-box");
    // Day 2 (Mon) = index 1 → no leave, no bank holiday
    await user.click(boxes[1]);
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
  });
});

describe("MicroAnnualPlanner — subtitle shows leave period", () => {
  it("renders a subtitle with the leave period dates", () => {
    render(<MicroAnnualPlanner user={alice} bankHolidays={[]} />);
    const subtitle = screen.getByTestId("annual-planner-subtitle");
    expect(subtitle).toBeInTheDocument();
    // Should contain "2026" somewhere in the date range text
    expect(subtitle.textContent).toMatch(/2026/);
  });
});

describe("MicroAnnualPlanner — popover matches CalendarView style", () => {
  const aliceWithLeave = {
    ...alice,
    entries: [
      {
        id: "e1",
        startDate: "2026-03-09",
        endDate: "2026-03-09",
        status: "approved" as import("@/types").LeaveStatus,
        type: "holiday" as import("@/types").LeaveType,
        notes: "Spa day",
      },
    ],
  };

  it("shows a status badge in the popover", async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime.bind(jest) });
    const { within } = await import("@testing-library/react");
    render(<MicroAnnualPlanner user={aliceWithLeave as import("@/types").PublicUser} bankHolidays={[]} />);
    const marchRow = screen.getByTestId("month-row-Mar");
    const boxes = within(marchRow).getAllByTestId("day-box");
    await user.click(boxes[8]);
    const tooltip = screen.getByRole("tooltip");
    expect(tooltip.textContent).toContain("Approved");
  });

  it("shows the date range in the popover", async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime.bind(jest) });
    const { within } = await import("@testing-library/react");
    render(<MicroAnnualPlanner user={aliceWithLeave as import("@/types").PublicUser} bankHolidays={[]} />);
    const marchRow = screen.getByTestId("month-row-Mar");
    const boxes = within(marchRow).getAllByTestId("day-box");
    await user.click(boxes[8]);
    const tooltip = screen.getByRole("tooltip");
    expect(tooltip.textContent).toContain("9 Mar");
  });
});
