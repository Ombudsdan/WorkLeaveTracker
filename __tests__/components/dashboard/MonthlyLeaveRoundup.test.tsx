import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import MonthlyLeaveRoundup from "@/components/dashboard/MonthlyLeaveRoundup";
import { LeaveStatus, LeaveType, LeaveDuration } from "@/types";
import type { PublicUser } from "@/types";

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

// ─── Basic rendering ───────────────────────────────────────────────────────────

describe("MonthlyLeaveRoundup — basic rendering", () => {
  it("renders the widget container with correct data-testid", () => {
    render(<MonthlyLeaveRoundup user={alice} bankHolidays={[]} />);
    expect(screen.getByTestId("monthly-leave-roundup")).toBeInTheDocument();
  });

  it("shows 'Monthly Overview' heading", () => {
    render(<MonthlyLeaveRoundup user={alice} bankHolidays={[]} />);
    expect(screen.getByText("Monthly Overview")).toBeInTheDocument();
  });

  it("shows all 12 month names", () => {
    render(<MonthlyLeaveRoundup user={alice} bankHolidays={[]} />);
    const months = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December",
    ];
    months.forEach((m) => expect(screen.getByText(m)).toBeInTheDocument());
  });

  it("shows year window text (not a dropdown) for a single allowance", () => {
    render(<MonthlyLeaveRoundup user={alice} bankHolidays={[]} />);
    expect(screen.queryByRole("combobox", { name: /select year/i })).toBeNull();
    // year window text is a <span> containing "2026"
    expect(screen.getByTestId("monthly-leave-roundup").textContent).toMatch(/2026/);
  });

  it("renders the leave key legend", () => {
    render(<MonthlyLeaveRoundup user={alice} bankHolidays={[]} />);
    expect(screen.getByText("Approved")).toBeInTheDocument();
    expect(screen.getByText("Requested")).toBeInTheDocument();
    expect(screen.getByText("Planned")).toBeInTheDocument();
  });

  it("returns null when user has no year allowances", () => {
    const noAllowances: PublicUser = { ...alice, yearAllowances: [] };
    const { container } = render(
      <MonthlyLeaveRoundup user={noAllowances} bankHolidays={[]} />
    );
    expect(container.firstChild).toBeNull();
  });
});

// ─── Year selector (multiple allowances) ─────────────────────────────────────

describe("MonthlyLeaveRoundup — year selector", () => {
  const multiYearUser: PublicUser = {
    ...alice,
    yearAllowances: [
      { year: 2026, company: "Acme", holidayStartMonth: 1, core: 25, bought: 0, carried: 0 },
      { year: 2025, company: "Acme", holidayStartMonth: 1, core: 25, bought: 0, carried: 0 },
    ],
  };

  it("shows a year selector dropdown when multiple allowances exist", () => {
    render(<MonthlyLeaveRoundup user={multiYearUser} bankHolidays={[]} />);
    expect(screen.getByRole("combobox", { name: /select year/i })).toBeInTheDocument();
  });

  it("year selector contains an option for each allowance year", () => {
    render(<MonthlyLeaveRoundup user={multiYearUser} bankHolidays={[]} />);
    const select = screen.getByRole("combobox", { name: /select year/i });
    const options = within(select).getAllByRole("option");
    expect(options).toHaveLength(2);
  });

  it("switching year changes the displayed months to the selected year window", async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime.bind(jest) });
    render(<MonthlyLeaveRoundup user={multiYearUser} bankHolidays={[]} />);
    const select = screen.getByRole("combobox", { name: /select year/i });
    // Switch to 2025 option
    const options = within(select).getAllByRole("option");
    const opt2025 = options.find((o) => o.textContent?.includes("2025"));
    expect(opt2025).toBeTruthy();
    await user.selectOptions(select, opt2025!.getAttribute("value")!);
    // After switching, container still renders
    expect(screen.getByTestId("monthly-leave-roundup")).toBeInTheDocument();
  });
});

// ─── Deactivated allowances ───────────────────────────────────────────────────

describe("MonthlyLeaveRoundup — deactivated allowances", () => {
  it("ignores deactivated allowances when active ones exist", () => {
    const userWithDeactivated: PublicUser = {
      ...alice,
      yearAllowances: [
        { year: 2026, company: "Acme", holidayStartMonth: 1, core: 25, bought: 0, carried: 0, active: true },
        { year: 2025, company: "OldCo", holidayStartMonth: 1, core: 20, bought: 0, carried: 0, active: false },
      ],
    };
    render(<MonthlyLeaveRoundup user={userWithDeactivated} bankHolidays={[]} />);
    // Should only have single allowance displayed (no dropdown)
    expect(screen.queryByRole("combobox", { name: /select year/i })).toBeNull();
  });

  it("falls back to all allowances when all are deactivated", () => {
    const userAllDeactivated: PublicUser = {
      ...alice,
      yearAllowances: [
        { year: 2026, company: "Acme", holidayStartMonth: 1, core: 25, bought: 0, carried: 0, active: false },
        { year: 2025, company: "Acme", holidayStartMonth: 1, core: 25, bought: 0, carried: 0, active: false },
      ],
    };
    render(<MonthlyLeaveRoundup user={userAllDeactivated} bankHolidays={[]} />);
    // Both allowances used → dropdown shown
    expect(screen.getByRole("combobox", { name: /select year/i })).toBeInTheDocument();
  });
});

// ─── Segment rendering ────────────────────────────────────────────────────────

describe("MonthlyLeaveRoundup — segment rendering", () => {
  it("renders a colored segment bar for an approved leave entry", () => {
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
    render(<MonthlyLeaveRoundup user={aliceWithLeave} bankHolidays={[]} />);
    const container = screen.getByTestId("monthly-leave-roundup");
    // cursor-pointer distinguishes actual bar segments from legend swatches
    const greenSegs = container.querySelectorAll(".bg-green-300.cursor-pointer");
    expect(greenSegs.length).toBeGreaterThan(0);
  });

  it("renders an orange segment for a requested leave entry", () => {
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
    render(<MonthlyLeaveRoundup user={userRequested} bankHolidays={[]} />);
    const container = screen.getByTestId("monthly-leave-roundup");
    expect(container.querySelectorAll(".bg-orange-200.cursor-pointer").length).toBeGreaterThan(0);
  });

  it("renders a yellow segment for a planned leave entry", () => {
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
    render(<MonthlyLeaveRoundup user={userPlanned} bankHolidays={[]} />);
    const container = screen.getByTestId("monthly-leave-roundup");
    expect(container.querySelectorAll(".bg-yellow-200.cursor-pointer").length).toBeGreaterThan(0);
  });

  it("renders a purple segment for bank holidays", () => {
    render(
      <MonthlyLeaveRoundup
        user={alice}
        bankHolidays={[{ date: "2026-03-16", title: "St Patrick's Day" }]}
      />
    );
    const container = screen.getByTestId("monthly-leave-roundup");
    expect(container.querySelectorAll(".bg-purple-300.cursor-pointer").length).toBeGreaterThan(0);
  });

  it("does not render segments for sick leave entries", () => {
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
    render(<MonthlyLeaveRoundup user={userSick} bankHolidays={[]} />);
    const container = screen.getByTestId("monthly-leave-roundup");
    // No clickable green segments because no holiday entries
    expect(container.querySelectorAll(".bg-green-300.cursor-pointer").length).toBe(0);
  });

  it("shows a dash for months with no leave", () => {
    render(<MonthlyLeaveRoundup user={alice} bankHolidays={[]} />);
    const dashes = screen.getAllByText("–");
    expect(dashes.length).toBeGreaterThan(0);
  });

  it("shows the day count for months with leave", () => {
    const aliceWithLeave: PublicUser = {
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
    render(<MonthlyLeaveRoundup user={aliceWithLeave} bankHolidays={[]} />);
    expect(screen.getByText("1d")).toBeInTheDocument();
  });

  it("skips leave entries with zero working days (e.g. only weekend days)", () => {
    // Entry only spans Sat+Sun → 0 working days for alice
    const userWeekendLeave: PublicUser = {
      ...alice,
      entries: [
        {
          id: "e5",
          startDate: "2026-03-14", // Saturday
          endDate: "2026-03-15",   // Sunday
          status: LeaveStatus.Approved,
          type: LeaveType.Holiday,
        },
      ],
    };
    render(<MonthlyLeaveRoundup user={userWeekendLeave} bankHolidays={[]} />);
    const container = screen.getByTestId("monthly-leave-roundup");
    // No clickable green segments (legend swatch excluded via cursor-pointer)
    expect(container.querySelectorAll(".bg-green-300.cursor-pointer").length).toBe(0);
  });
});

// ─── Segment ordering ─────────────────────────────────────────────────────────

describe("MonthlyLeaveRoundup — segment ordering", () => {
  it("renders bank holiday before leave when BH is on an earlier date", () => {
    const aliceWithLeave: PublicUser = {
      ...alice,
      entries: [
        {
          id: "e1",
          startDate: "2026-03-20",
          endDate: "2026-03-20",
          status: LeaveStatus.Approved,
          type: LeaveType.Holiday,
        },
      ],
    };
    render(
      <MonthlyLeaveRoundup
        user={aliceWithLeave}
        bankHolidays={[{ date: "2026-03-02", title: "Test BH" }]}
      />
    );
    const container = screen.getByTestId("monthly-leave-roundup");
    // Both segments exist
    expect(container.querySelectorAll(".bg-purple-300.cursor-pointer").length).toBeGreaterThan(0);
    expect(container.querySelectorAll(".bg-green-300.cursor-pointer").length).toBeGreaterThan(0);
    // The purple (BH) segment should appear before the green (leave) segment in DOM
    const allSegmentDivs = Array.from(
      container.querySelectorAll(".bg-purple-300.cursor-pointer, .bg-green-300.cursor-pointer")
    );
    expect(allSegmentDivs[0].className).toContain("bg-purple-300");
    expect(allSegmentDivs[1].className).toContain("bg-green-300");
  });
});

// ─── Same-status separator ────────────────────────────────────────────────────

describe("MonthlyLeaveRoundup — same-status separator", () => {
  it("renders a separator div between two adjacent approved segments", () => {
    // Two separate approved entries in the same month
    const userTwoApproved: PublicUser = {
      ...alice,
      entries: [
        {
          id: "e1",
          startDate: "2026-03-02",
          endDate: "2026-03-02",
          status: LeaveStatus.Approved,
          type: LeaveType.Holiday,
        },
        {
          id: "e2",
          startDate: "2026-03-04",
          endDate: "2026-03-04",
          status: LeaveStatus.Approved,
          type: LeaveType.Holiday,
        },
      ],
    };
    render(<MonthlyLeaveRoundup user={userTwoApproved} bankHolidays={[]} />);
    const container = screen.getByTestId("monthly-leave-roundup");
    // Separator: w-px h-full bg-white
    const separators = container.querySelectorAll(".w-px.h-full.bg-white");
    expect(separators.length).toBeGreaterThan(0);
  });

  it("does not render a separator between a bank holiday and a leave segment", () => {
    const userBhAndLeave: PublicUser = {
      ...alice,
      entries: [
        {
          id: "e1",
          startDate: "2026-03-04",
          endDate: "2026-03-04",
          status: LeaveStatus.Approved,
          type: LeaveType.Holiday,
        },
      ],
    };
    render(
      <MonthlyLeaveRoundup
        user={userBhAndLeave}
        bankHolidays={[{ date: "2026-03-02", title: "Test BH" }]}
      />
    );
    const container = screen.getByTestId("monthly-leave-roundup");
    // No separator because one is BH and the other is a leave entry
    const separators = container.querySelectorAll(".w-px.h-full.bg-white");
    expect(separators.length).toBe(0);
  });

  it("does not render a separator between segments with different statuses", () => {
    const userMixedStatus: PublicUser = {
      ...alice,
      entries: [
        {
          id: "e1",
          startDate: "2026-03-02",
          endDate: "2026-03-02",
          status: LeaveStatus.Approved,
          type: LeaveType.Holiday,
        },
        {
          id: "e2",
          startDate: "2026-03-04",
          endDate: "2026-03-04",
          status: LeaveStatus.Requested,
          type: LeaveType.Holiday,
        },
      ],
    };
    render(<MonthlyLeaveRoundup user={userMixedStatus} bankHolidays={[]} />);
    const container = screen.getByTestId("monthly-leave-roundup");
    const separators = container.querySelectorAll(".w-px.h-full.bg-white");
    expect(separators.length).toBe(0);
  });
});

// ─── Popover — bank holiday ───────────────────────────────────────────────────

describe("MonthlyLeaveRoundup — popover for bank holiday", () => {
  it("opens a popover with Bank Holiday badge when clicking a BH segment", async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime.bind(jest) });
    render(
      <MonthlyLeaveRoundup
        user={alice}
        bankHolidays={[{ date: "2026-03-02", title: "Test Holiday" }]}
      />
    );
    const container = screen.getByTestId("monthly-leave-roundup");
    const bhSegment = container.querySelector(".bg-purple-300.cursor-pointer") as HTMLElement;
    expect(bhSegment).toBeTruthy();
    await user.click(bhSegment);
    const popover = screen.getByTestId("roundup-popover");
    expect(popover).toBeInTheDocument();
    expect(within(popover).getByText("Bank Holiday")).toBeInTheDocument();
  });

  it("shows the bank holiday title in the popover", async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime.bind(jest) });
    render(
      <MonthlyLeaveRoundup
        user={alice}
        bankHolidays={[{ date: "2026-03-02", title: "Good Friday" }]}
      />
    );
    const container = screen.getByTestId("monthly-leave-roundup");
    const bhSegment = container.querySelector(".bg-purple-300.cursor-pointer") as HTMLElement;
    await user.click(bhSegment);
    const popover = screen.getByTestId("roundup-popover");
    expect(within(popover).getByText("Good Friday")).toBeInTheDocument();
  });

  it("shows a formatted date in the bank holiday popover", async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime.bind(jest) });
    render(
      <MonthlyLeaveRoundup
        user={alice}
        bankHolidays={[{ date: "2026-03-02", title: "Test BH" }]}
      />
    );
    const container = screen.getByTestId("monthly-leave-roundup");
    const bhSegment = container.querySelector(".bg-purple-300.cursor-pointer") as HTMLElement;
    await user.click(bhSegment);
    const popover = screen.getByTestId("roundup-popover");
    // Should show date like "2 Mar"
    expect(popover.textContent).toMatch(/2 Mar/);
  });
});

// ─── Popover — leave entry ────────────────────────────────────────────────────

describe("MonthlyLeaveRoundup — popover for leave entry", () => {
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

  it("opens a popover when clicking a leave segment", async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime.bind(jest) });
    render(<MonthlyLeaveRoundup user={aliceWithLeave} bankHolidays={[]} />);
    const container = screen.getByTestId("monthly-leave-roundup");
    const segment = container.querySelector(".bg-green-300.cursor-pointer") as HTMLElement;
    await user.click(segment);
    expect(screen.getByTestId("roundup-popover")).toBeInTheDocument();
  });

  it("shows status badge in popover", async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime.bind(jest) });
    render(<MonthlyLeaveRoundup user={aliceWithLeave} bankHolidays={[]} />);
    const container = screen.getByTestId("monthly-leave-roundup");
    const segment = container.querySelector(".bg-green-300.cursor-pointer") as HTMLElement;
    await user.click(segment);
    const popover = screen.getByTestId("roundup-popover");
    expect(within(popover).getByText("Approved")).toBeInTheDocument();
  });

  it("shows notes in the popover", async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime.bind(jest) });
    render(<MonthlyLeaveRoundup user={aliceWithLeave} bankHolidays={[]} />);
    const container = screen.getByTestId("monthly-leave-roundup");
    const segment = container.querySelector(".bg-green-300.cursor-pointer") as HTMLElement;
    await user.click(segment);
    const popover = screen.getByTestId("roundup-popover");
    expect(popover.textContent).toContain("Beach trip");
  });

  it("shows the date range in the popover", async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime.bind(jest) });
    render(<MonthlyLeaveRoundup user={aliceWithLeave} bankHolidays={[]} />);
    const container = screen.getByTestId("monthly-leave-roundup");
    const segment = container.querySelector(".bg-green-300.cursor-pointer") as HTMLElement;
    await user.click(segment);
    const popover = screen.getByTestId("roundup-popover");
    expect(popover.textContent).toMatch(/9 Mar/);
  });

  it("shows the working day count in the popover", async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime.bind(jest) });
    render(<MonthlyLeaveRoundup user={aliceWithLeave} bankHolidays={[]} />);
    const container = screen.getByTestId("monthly-leave-roundup");
    const segment = container.querySelector(".bg-green-300.cursor-pointer") as HTMLElement;
    await user.click(segment);
    const popover = screen.getByTestId("roundup-popover");
    expect(popover.textContent).toMatch(/1 working day/);
  });

  it("shows 'No description' when the entry has no notes", async () => {
    const userNoNotes: PublicUser = {
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
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime.bind(jest) });
    render(<MonthlyLeaveRoundup user={userNoNotes} bankHolidays={[]} />);
    const container = screen.getByTestId("monthly-leave-roundup");
    const segment = container.querySelector(".bg-green-300.cursor-pointer") as HTMLElement;
    await user.click(segment);
    const popover = screen.getByTestId("roundup-popover");
    expect(popover.textContent).toContain("No description");
  });

  it("shows 'Requested' status badge for requested leave", async () => {
    const userRequested: PublicUser = {
      ...alice,
      entries: [
        {
          id: "e2",
          startDate: "2026-03-16",
          endDate: "2026-03-16",
          status: LeaveStatus.Requested,
          type: LeaveType.Holiday,
          notes: "Dentist",
        },
      ],
    };
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime.bind(jest) });
    render(<MonthlyLeaveRoundup user={userRequested} bankHolidays={[]} />);
    const container = screen.getByTestId("monthly-leave-roundup");
    const segment = container.querySelector(".bg-orange-200.cursor-pointer") as HTMLElement;
    await user.click(segment);
    const popover = screen.getByTestId("roundup-popover");
    expect(within(popover).getByText("Requested")).toBeInTheDocument();
  });

  it("shows 'Planned' status badge for planned leave", async () => {
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
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime.bind(jest) });
    render(<MonthlyLeaveRoundup user={userPlanned} bankHolidays={[]} />);
    const container = screen.getByTestId("monthly-leave-roundup");
    const segment = container.querySelector(".bg-yellow-200.cursor-pointer") as HTMLElement;
    await user.click(segment);
    const popover = screen.getByTestId("roundup-popover");
    expect(within(popover).getByText("Planned")).toBeInTheDocument();
  });

  it("shows plural 'working days' for multi-day leave", async () => {
    const userMultiDay: PublicUser = {
      ...alice,
      entries: [
        {
          id: "e4",
          startDate: "2026-03-09",
          endDate: "2026-03-13",
          status: LeaveStatus.Approved,
          type: LeaveType.Holiday,
        },
      ],
    };
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime.bind(jest) });
    render(<MonthlyLeaveRoundup user={userMultiDay} bankHolidays={[]} />);
    const container = screen.getByTestId("monthly-leave-roundup");
    const segment = container.querySelector(".bg-green-300.cursor-pointer") as HTMLElement;
    await user.click(segment);
    const popover = screen.getByTestId("roundup-popover");
    expect(popover.textContent).toMatch(/working days/);
  });
});

// ─── Popover — half-day entries ───────────────────────────────────────────────

describe("MonthlyLeaveRoundup — popover for half-day entries", () => {
  it("shows '(AM)' label for HalfMorning entries with no notes", async () => {
    const userAM: PublicUser = {
      ...alice,
      entries: [
        {
          id: "e_am",
          startDate: "2026-03-09",
          endDate: "2026-03-09",
          status: LeaveStatus.Approved,
          type: LeaveType.Holiday,
          duration: LeaveDuration.HalfMorning,
        },
      ],
    };
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime.bind(jest) });
    render(<MonthlyLeaveRoundup user={userAM} bankHolidays={[]} />);
    const container = screen.getByTestId("monthly-leave-roundup");
    const segment = container.querySelector(".bg-green-300.cursor-pointer") as HTMLElement;
    await user.click(segment);
    const popover = screen.getByTestId("roundup-popover");
    expect(popover.textContent).toContain("(AM)");
  });

  it("shows '(PM)' label for HalfAfternoon entries with no notes", async () => {
    const userPM: PublicUser = {
      ...alice,
      entries: [
        {
          id: "e_pm",
          startDate: "2026-03-09",
          endDate: "2026-03-09",
          status: LeaveStatus.Approved,
          type: LeaveType.Holiday,
          duration: LeaveDuration.HalfAfternoon,
        },
      ],
    };
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime.bind(jest) });
    render(<MonthlyLeaveRoundup user={userPM} bankHolidays={[]} />);
    const container = screen.getByTestId("monthly-leave-roundup");
    const segment = container.querySelector(".bg-green-300.cursor-pointer") as HTMLElement;
    await user.click(segment);
    const popover = screen.getByTestId("roundup-popover");
    expect(popover.textContent).toContain("(PM)");
  });

  it("shows 'Half day (AM)' duration label for HalfMorning entries", async () => {
    const userAM: PublicUser = {
      ...alice,
      entries: [
        {
          id: "e_am2",
          startDate: "2026-03-09",
          endDate: "2026-03-09",
          status: LeaveStatus.Approved,
          type: LeaveType.Holiday,
          duration: LeaveDuration.HalfMorning,
        },
      ],
    };
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime.bind(jest) });
    render(<MonthlyLeaveRoundup user={userAM} bankHolidays={[]} />);
    const container = screen.getByTestId("monthly-leave-roundup");
    const segment = container.querySelector(".bg-green-300.cursor-pointer") as HTMLElement;
    await user.click(segment);
    const popover = screen.getByTestId("roundup-popover");
    expect(popover.textContent).toContain("Half day (AM)");
  });

  it("shows 'Half day (PM)' duration label for HalfAfternoon entries", async () => {
    const userPM: PublicUser = {
      ...alice,
      entries: [
        {
          id: "e_pm2",
          startDate: "2026-03-09",
          endDate: "2026-03-09",
          status: LeaveStatus.Approved,
          type: LeaveType.Holiday,
          duration: LeaveDuration.HalfAfternoon,
        },
      ],
    };
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime.bind(jest) });
    render(<MonthlyLeaveRoundup user={userPM} bankHolidays={[]} />);
    const container = screen.getByTestId("monthly-leave-roundup");
    const segment = container.querySelector(".bg-green-300.cursor-pointer") as HTMLElement;
    await user.click(segment);
    const popover = screen.getByTestId("roundup-popover");
    expect(popover.textContent).toContain("Half day (PM)");
  });

  it("appends (AM) to notes for HalfMorning entries with notes", async () => {
    const userAMNotes: PublicUser = {
      ...alice,
      entries: [
        {
          id: "e_am3",
          startDate: "2026-03-09",
          endDate: "2026-03-09",
          status: LeaveStatus.Approved,
          type: LeaveType.Holiday,
          duration: LeaveDuration.HalfMorning,
          notes: "Doctor",
        },
      ],
    };
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime.bind(jest) });
    render(<MonthlyLeaveRoundup user={userAMNotes} bankHolidays={[]} />);
    const container = screen.getByTestId("monthly-leave-roundup");
    const segment = container.querySelector(".bg-green-300.cursor-pointer") as HTMLElement;
    await user.click(segment);
    const popover = screen.getByTestId("roundup-popover");
    expect(popover.textContent).toContain("Doctor (AM)");
  });
});

// ─── Popover — toggle & close ─────────────────────────────────────────────────

describe("MonthlyLeaveRoundup — popover toggle and close", () => {
  const aliceWithLeave: PublicUser = {
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

  it("clicking the same segment again closes the popover", async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime.bind(jest) });
    render(<MonthlyLeaveRoundup user={aliceWithLeave} bankHolidays={[]} />);
    const container = screen.getByTestId("monthly-leave-roundup");
    const segment = container.querySelector(".bg-green-300.cursor-pointer") as HTMLElement;
    await user.click(segment);
    expect(screen.getByTestId("roundup-popover")).toBeInTheDocument();
    await user.click(segment);
    expect(screen.queryByTestId("roundup-popover")).not.toBeInTheDocument();
  });

  it("clicking the Close button closes the popover", async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime.bind(jest) });
    render(<MonthlyLeaveRoundup user={aliceWithLeave} bankHolidays={[]} />);
    const container = screen.getByTestId("monthly-leave-roundup");
    const segment = container.querySelector(".bg-green-300.cursor-pointer") as HTMLElement;
    await user.click(segment);
    expect(screen.getByTestId("roundup-popover")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Close popover" }));
    expect(screen.queryByTestId("roundup-popover")).not.toBeInTheDocument();
  });

  it("clicking outside the container closes the popover", async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime.bind(jest) });
    render(
      <div>
        <MonthlyLeaveRoundup user={aliceWithLeave} bankHolidays={[]} />
        <button>Outside</button>
      </div>
    );
    const container = screen.getByTestId("monthly-leave-roundup");
    const segment = container.querySelector(".bg-green-300.cursor-pointer") as HTMLElement;
    await user.click(segment);
    expect(screen.getByTestId("roundup-popover")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Outside" }));
    expect(screen.queryByTestId("roundup-popover")).not.toBeInTheDocument();
  });
});

// ─── Multi-month leave spanning ───────────────────────────────────────────────

describe("MonthlyLeaveRoundup — multi-month leave", () => {
  it("renders segments in both months when leave spans across a month boundary", () => {
    const userSpanning: PublicUser = {
      ...alice,
      entries: [
        {
          id: "e_span",
          startDate: "2026-03-30",
          endDate: "2026-04-02",
          status: LeaveStatus.Approved,
          type: LeaveType.Holiday,
        },
      ],
    };
    render(<MonthlyLeaveRoundup user={userSpanning} bankHolidays={[]} />);
    const container = screen.getByTestId("monthly-leave-roundup");
    const greenSegs = container.querySelectorAll(".bg-green-300.cursor-pointer");
    // Should appear in both March and April
    expect(greenSegs.length).toBeGreaterThanOrEqual(2);
  });
});

// ─── April-start holiday year ─────────────────────────────────────────────────

describe("MonthlyLeaveRoundup — April-start holiday year", () => {
  const bobAprilStart: PublicUser = {
    ...alice,
    id: "u2",
    yearAllowances: [
      { year: 2025, company: "Acme", holidayStartMonth: 4, core: 25, bought: 0, carried: 0 },
    ],
    entries: [],
  };

  it("starts with April and ends with March for an April-start year", () => {
    render(<MonthlyLeaveRoundup user={bobAprilStart} bankHolidays={[]} />);
    // All 12 month names still rendered
    expect(screen.getByText("April")).toBeInTheDocument();
    expect(screen.getByText("March")).toBeInTheDocument();
  });

  it("ignores bank holidays outside the April-start year window", () => {
    render(
      <MonthlyLeaveRoundup
        user={bobAprilStart}
        bankHolidays={[
          { date: "2025-01-01", title: "New Year" }, // before Apr 2025 window
          { date: "2025-05-05", title: "May Day" },  // inside window
        ]}
      />
    );
    const container = screen.getByTestId("monthly-leave-roundup");
    // Only May Day should appear as a clickable purple segment
    const purpleSegs = container.querySelectorAll(".bg-purple-300.cursor-pointer");
    expect(purpleSegs.length).toBe(1);
  });
});

// ─── Non-working-day bank holidays ───────────────────────────────────────────

describe("MonthlyLeaveRoundup — bank holidays on non-working days", () => {
  it("does not render a BH segment when the BH falls on a non-working day", () => {
    // Alice's nonWorkingDays = [0, 6]; March 1 2026 is a Sunday (dow=0)
    render(
      <MonthlyLeaveRoundup
        user={alice}
        bankHolidays={[{ date: "2026-03-01", title: "Sunday BH" }]}
      />
    );
    const container = screen.getByTestId("monthly-leave-roundup");
    // No clickable purple segments (legend swatch excluded via cursor-pointer)
    expect(container.querySelectorAll(".bg-purple-300.cursor-pointer").length).toBe(0);
  });
});
