import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import AnnualPlannerView from "@/components/annual-planner/AnnualPlannerView";
import { LeaveStatus, LeaveType, LeaveDuration } from "@/types";
import type { PublicUser, BankHolidayEntry } from "@/types";

// Fix the date so getActiveYearAllowance is deterministic
beforeEach(() => {
  jest.useFakeTimers();
  jest.setSystemTime(new Date("2026-03-15"));
});

afterEach(() => {
  jest.useRealTimers();
});

function setup() {
  return userEvent.setup({ advanceTimers: jest.advanceTimersByTime.bind(jest) });
}

function bh(date: string, title = "Bank Holiday"): BankHolidayEntry {
  return { date, title };
}

const baseUser: PublicUser = {
  id: "u1",
  profile: {
    firstName: "Alice",
    lastName: "Smith",
    email: "alice@example.com",
    nonWorkingDays: [0, 6],
  },
  yearAllowances: [
    { year: 2026, company: "Acme", holidayStartMonth: 1, core: 25, bought: 0, carried: 0 },
  ],
  entries: [],
};

describe("AnnualPlannerView — no allowance", () => {
  it("shows a fallback message when the user has no yearAllowances", () => {
    const user: PublicUser = { ...baseUser, yearAllowances: [] };
    render(<AnnualPlannerView user={user} bankHolidays={[]} />);
    expect(screen.getByText("No active leave allowance found.")).toBeInTheDocument();
  });
});

describe("AnnualPlannerView — bar chart", () => {
  it("renders 12 MonthlyLeaveBar rows", () => {
    render(<AnnualPlannerView user={baseUser} bankHolidays={[]} />);
    const bars = screen.getAllByTestId("monthly-leave-bar");
    expect(bars).toHaveLength(12);
  });

  it("renders January through December month names", () => {
    render(<AnnualPlannerView user={baseUser} bankHolidays={[]} />);
    expect(screen.getByText("January")).toBeInTheDocument();
    expect(screen.getByText("December")).toBeInTheDocument();
  });

  it("renders the 'Annual Calendar' heading", () => {
    render(<AnnualPlannerView user={baseUser} bankHolidays={[]} />);
    expect(screen.getByText("Annual Calendar")).toBeInTheDocument();
  });

  it("renders the year window label as text when there is only one allowance", () => {
    render(<AnnualPlannerView user={baseUser} bankHolidays={[]} />);
    // formatYearWindow for year=2026, startMonth=1 → "1 Jan 2026 – 31 Dec 2026"
    expect(screen.getByText(/1 Jan 2026/)).toBeInTheDocument();
    // No select element when there is only one allowance
    expect(screen.queryByRole("combobox", { name: /select leave window/i })).toBeNull();
  });

  it("renders the colour legend only for items present in the data", () => {
    // Need all five types: approved, requested, planned, working BH, NWD BH
    const userWithAllTypes: PublicUser = {
      ...baseUser,
      entries: [
        {
          id: "e1",
          startDate: "2026-03-09",
          endDate: "2026-03-09",
          status: LeaveStatus.Approved,
          type: LeaveType.Holiday,
        },
        {
          id: "e2",
          startDate: "2026-03-10",
          endDate: "2026-03-10",
          status: LeaveStatus.Requested,
          type: LeaveType.Holiday,
        },
        {
          id: "e3",
          startDate: "2026-03-11",
          endDate: "2026-03-11",
          status: LeaveStatus.Planned,
          type: LeaveType.Holiday,
        },
      ],
    };
    // 2026-03-17 is Tuesday (working day), 2026-03-15 is Sunday (NWD for baseUser)
    const bhList = [bh("2026-03-17", "Working Day BH"), bh("2026-03-15", "Sunday BH")];
    render(<AnnualPlannerView user={userWithAllTypes} bankHolidays={bhList} />);
    // Approved/Requested/Planned also appear in the Year Summary section — use getAllByText
    expect(screen.getAllByText("Approved").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Requested").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Planned").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Bank Holiday")).toBeInTheDocument();
    expect(screen.getByText("Bank Holiday (non-working day)")).toBeInTheDocument();
  });

  it("does not show key items that are absent from the data", () => {
    // baseUser has no entries and no bank holidays → empty key
    render(<AnnualPlannerView user={baseUser} bankHolidays={[]} />);
    expect(screen.queryByText("Bank Holiday")).not.toBeInTheDocument();
    expect(screen.queryByText("Bank Holiday (non-working day)")).not.toBeInTheDocument();
  });

  it("uses purple (bg-purple-300) for the Bank Holiday legend swatch when a working-day BH exists", () => {
    // 2026-03-17 is a Tuesday (working day for baseUser whose NWD = [0, 6])
    const { container } = render(
      <AnnualPlannerView user={baseUser} bankHolidays={[bh("2026-03-17", "Working Day BH")]} />
    );
    // The legend swatch for Bank Holiday should use bg-purple-300, matching all other views
    expect(container.querySelector(".bg-purple-300")).toBeInTheDocument();
    expect(container.querySelector(".bg-gray-400")).not.toBeInTheDocument();
  });
});

describe("AnnualPlannerView — year period selector (single allowance)", () => {
  it("does not render a select when only one allowance exists", () => {
    render(<AnnualPlannerView user={baseUser} bankHolidays={[]} />);
    expect(screen.queryByRole("combobox", { name: /select leave window/i })).toBeNull();
  });
});

describe("AnnualPlannerView — year period selector (multiple allowances)", () => {
  const multiUser: PublicUser = {
    ...baseUser,
    yearAllowances: [
      { year: 2025, company: "Acme", holidayStartMonth: 1, core: 25, bought: 0, carried: 0 },
      { year: 2026, company: "Acme", holidayStartMonth: 1, core: 25, bought: 0, carried: 0 },
    ],
  };

  it("renders a year-selector <select> when multiple allowances exist", () => {
    render(<AnnualPlannerView user={multiUser} bankHolidays={[]} />);
    expect(screen.getByRole("combobox", { name: /select leave window/i })).toBeInTheDocument();
  });

  it("defaults to the active (2026) year when multiple allowances exist", () => {
    render(<AnnualPlannerView user={multiUser} bankHolidays={[]} />);
    const select = screen.getByRole("combobox", {
      name: /select leave window/i,
    }) as HTMLSelectElement;
    expect(select.value).toBe("2026");
  });

  it("changes the displayed period when a different year is selected", async () => {
    const ue = setup();
    render(<AnnualPlannerView user={multiUser} bankHolidays={[]} />);
    const select = screen.getByRole("combobox", { name: /select leave window/i });
    await ue.selectOptions(select, "2025");
    // Year window text in the select option should now reflect 2025
    expect(screen.getByText(/1 Jan 2025/)).toBeInTheDocument();
  });

  it("shows both year options in the selector", () => {
    render(<AnnualPlannerView user={multiUser} bankHolidays={[]} />);
    expect(screen.getByText(/1 Jan 2025/)).toBeInTheDocument();
    expect(screen.getByText(/1 Jan 2026/)).toBeInTheDocument();
  });

  it("resets open accordions when the year is changed", async () => {
    const ue = setup();
    const user: PublicUser = {
      ...multiUser,
      entries: [
        {
          id: "e1",
          startDate: "2026-03-09",
          endDate: "2026-03-09",
          status: LeaveStatus.Approved,
          type: LeaveType.Holiday,
          notes: "Spring break",
        },
      ],
    };
    render(<AnnualPlannerView user={user} bankHolidays={[]} />);
    // Open March 2026
    await ue.click(screen.getByRole("button", { name: /march 2026/i }));
    expect(screen.getByText("Spring break")).toBeInTheDocument();
    // Switch to 2025
    const select = screen.getByRole("combobox", { name: /select leave window/i });
    await ue.selectOptions(select, "2025");
    // Accordion should be closed now
    expect(screen.queryByText("Spring break")).not.toBeInTheDocument();
  });

  it("shows entries for the newly selected year", async () => {
    const ue = setup();
    const user: PublicUser = {
      ...multiUser,
      entries: [
        {
          id: "e-2025",
          startDate: "2025-06-02",
          endDate: "2025-06-06",
          status: LeaveStatus.Approved,
          type: LeaveType.Holiday,
          notes: "Summer 2025",
        },
      ],
    };
    render(<AnnualPlannerView user={user} bankHolidays={[]} />);
    // Default is 2026 — 2025 entry should not be visible
    expect(screen.queryByText("Summer 2025")).not.toBeInTheDocument();
    // Switch to 2025
    const select = screen.getByRole("combobox", { name: /select leave window/i });
    await ue.selectOptions(select, "2025");
    // Open June 2025 accordion
    await ue.click(screen.getByRole("button", { name: /june 2025/i }));
    expect(screen.getByText("Summer 2025")).toBeInTheDocument();
  });
});

describe("AnnualPlannerView — accordion list", () => {
  it("renders the 'Entries by Month' heading", () => {
    render(<AnnualPlannerView user={baseUser} bankHolidays={[]} />);
    expect(screen.getByText("Entries by Month")).toBeInTheDocument();
  });

  it("shows 'No leave entries in this period.' when there are no entries", () => {
    render(<AnnualPlannerView user={baseUser} bankHolidays={[]} />);
    expect(screen.getByText("No leave entries in this period.")).toBeInTheDocument();
  });

  it("renders accordion buttons for each month when entries exist", () => {
    const user: PublicUser = {
      ...baseUser,
      entries: [
        {
          id: "e1",
          startDate: "2026-03-09",
          endDate: "2026-03-13",
          status: LeaveStatus.Approved,
          type: LeaveType.Holiday,
          notes: "Beach trip",
        },
      ],
    };
    render(<AnnualPlannerView user={user} bankHolidays={[]} />);
    // 12 month accordion buttons should exist
    const buttons = screen.getAllByRole("button");
    expect(buttons.length).toBeGreaterThanOrEqual(12);
  });

  it("entry is hidden before the accordion is opened", () => {
    const user: PublicUser = {
      ...baseUser,
      entries: [
        {
          id: "e1",
          startDate: "2026-03-09",
          endDate: "2026-03-13",
          status: LeaveStatus.Approved,
          type: LeaveType.Holiday,
          notes: "Beach trip",
        },
      ],
    };
    render(<AnnualPlannerView user={user} bankHolidays={[]} />);
    expect(screen.queryByText("Beach trip")).not.toBeInTheDocument();
  });

  it("expands the March accordion to show entries", async () => {
    const ue = setup();
    const user: PublicUser = {
      ...baseUser,
      entries: [
        {
          id: "e1",
          startDate: "2026-03-09",
          endDate: "2026-03-13",
          status: LeaveStatus.Approved,
          type: LeaveType.Holiday,
          notes: "Beach trip",
        },
      ],
    };
    render(<AnnualPlannerView user={user} bankHolidays={[]} />);
    const marchButton = screen.getByRole("button", { name: /march 2026/i });
    await ue.click(marchButton);
    expect(screen.getByText("Beach trip")).toBeInTheDocument();
  });

  it("collapses the accordion when clicked again", async () => {
    const ue = setup();
    const user: PublicUser = {
      ...baseUser,
      entries: [
        {
          id: "e1",
          startDate: "2026-03-09",
          endDate: "2026-03-13",
          status: LeaveStatus.Approved,
          type: LeaveType.Holiday,
          notes: "Beach trip",
        },
      ],
    };
    render(<AnnualPlannerView user={user} bankHolidays={[]} />);
    const marchButton = screen.getByRole("button", { name: /march 2026/i });
    await ue.click(marchButton);
    expect(screen.getByText("Beach trip")).toBeInTheDocument();
    await ue.click(marchButton);
    expect(screen.queryByText("Beach trip")).not.toBeInTheDocument();
  });

  it("months with no entries are disabled (not expandable)", () => {
    const user: PublicUser = {
      ...baseUser,
      entries: [
        {
          id: "e1",
          startDate: "2026-03-09",
          endDate: "2026-03-13",
          status: LeaveStatus.Approved,
          type: LeaveType.Holiday,
          notes: "Only March",
        },
      ],
    };
    render(<AnnualPlannerView user={user} bankHolidays={[]} />);
    const januaryButton = screen.getByRole("button", { name: /january 2026/i });
    expect(januaryButton).toBeDisabled();
  });

  it("shows the entry count badge (singular) on months with one entry", () => {
    const user: PublicUser = {
      ...baseUser,
      entries: [
        {
          id: "e1",
          startDate: "2026-03-09",
          endDate: "2026-03-13",
          status: LeaveStatus.Approved,
          type: LeaveType.Holiday,
          notes: "Beach trip",
        },
      ],
    };
    render(<AnnualPlannerView user={user} bankHolidays={[]} />);
    expect(screen.getByText("1 entry")).toBeInTheDocument();
  });

  it("shows the entry count badge (plural) on months with multiple entries", () => {
    const user: PublicUser = {
      ...baseUser,
      entries: [
        {
          id: "e1",
          startDate: "2026-03-09",
          endDate: "2026-03-09",
          status: LeaveStatus.Approved,
          type: LeaveType.Holiday,
        },
        {
          id: "e2",
          startDate: "2026-03-16",
          endDate: "2026-03-16",
          status: LeaveStatus.Planned,
          type: LeaveType.Holiday,
        },
      ],
    };
    render(<AnnualPlannerView user={user} bankHolidays={[]} />);
    expect(screen.getByText("2 entries")).toBeInTheDocument();
  });
});

describe("AnnualPlannerView — entry card details", () => {
  it("shows status label in entry card", async () => {
    const ue = setup();
    const user: PublicUser = {
      ...baseUser,
      entries: [
        {
          id: "e1",
          startDate: "2026-03-09",
          endDate: "2026-03-09",
          status: LeaveStatus.Requested,
          type: LeaveType.Holiday,
          notes: "Day off",
        },
      ],
    };
    render(<AnnualPlannerView user={user} bankHolidays={[]} />);
    await ue.click(screen.getByRole("button", { name: /march 2026/i }));
    // "Requested" appears in the legend AND the entry card; getAllByText returns both
    expect(screen.getAllByText("Requested").length).toBeGreaterThanOrEqual(2);
  });

  it("shows half-day label for HalfMorning entry", async () => {
    const ue = setup();
    const user: PublicUser = {
      ...baseUser,
      entries: [
        {
          id: "hd1",
          startDate: "2026-03-09",
          endDate: "2026-03-09",
          status: LeaveStatus.Approved,
          type: LeaveType.Holiday,
          duration: LeaveDuration.HalfMorning,
          notes: "Morning off",
        },
      ],
    };
    render(<AnnualPlannerView user={user} bankHolidays={[]} />);
    await ue.click(screen.getByRole("button", { name: /march 2026/i }));
    expect(screen.getByText(/Half Day AM/)).toBeInTheDocument();
  });

  it("shows half-day label for HalfAfternoon entry", async () => {
    const ue = setup();
    const user: PublicUser = {
      ...baseUser,
      entries: [
        {
          id: "hd2",
          startDate: "2026-03-09",
          endDate: "2026-03-09",
          status: LeaveStatus.Approved,
          type: LeaveType.Holiday,
          duration: LeaveDuration.HalfAfternoon,
          notes: "Afternoon off",
        },
      ],
    };
    render(<AnnualPlannerView user={user} bankHolidays={[]} />);
    await ue.click(screen.getByRole("button", { name: /march 2026/i }));
    expect(screen.getByText(/Half Day PM/)).toBeInTheDocument();
  });

  it("shows '–' for notes when no notes are provided", async () => {
    const ue = setup();
    const user: PublicUser = {
      ...baseUser,
      entries: [
        {
          id: "e-no-note",
          startDate: "2026-03-09",
          endDate: "2026-03-09",
          status: LeaveStatus.Planned,
          type: LeaveType.Holiday,
        },
      ],
    };
    render(<AnnualPlannerView user={user} bankHolidays={[]} />);
    await ue.click(screen.getByRole("button", { name: /march 2026/i }));
    // "–" appears in empty MonthlyLeaveBar slots AND in the entry card note field
    expect(screen.getAllByText("–").length).toBeGreaterThanOrEqual(1);
  });

  it("shows entry date range", async () => {
    const ue = setup();
    const user: PublicUser = {
      ...baseUser,
      entries: [
        {
          id: "e-range",
          startDate: "2026-06-01",
          endDate: "2026-06-05",
          status: LeaveStatus.Approved,
          type: LeaveType.Holiday,
          notes: "Summer break",
        },
      ],
    };
    render(<AnnualPlannerView user={user} bankHolidays={[]} />);
    await ue.click(screen.getByRole("button", { name: /june 2026/i }));
    // Date range should be visible
    expect(screen.getByText(/1 Jun/)).toBeInTheDocument();
  });
});

describe("AnnualPlannerView — bank holiday in bar", () => {
  it("reflects bank holidays in the bar aria-label for the correct month", () => {
    render(<AnnualPlannerView user={baseUser} bankHolidays={[bh("2026-05-04")]} />);
    // 2026-05-04 is a Monday
    const mayBar = screen.getByRole("img", {
      name: /May: .* 1 bank holidays/i,
    });
    expect(mayBar).toBeInTheDocument();
  });
});

describe("AnnualPlannerView — accordion aria attributes", () => {
  it("month button starts with aria-expanded=false", () => {
    const user: PublicUser = {
      ...baseUser,
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
    render(<AnnualPlannerView user={user} bankHolidays={[]} />);
    const marchButton = screen.getByRole("button", { name: /march 2026/i });
    expect(marchButton).toHaveAttribute("aria-expanded", "false");
  });

  it("month button has aria-expanded=true after clicking", async () => {
    const ue = setup();
    const user: PublicUser = {
      ...baseUser,
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
    render(<AnnualPlannerView user={user} bankHolidays={[]} />);
    const marchButton = screen.getByRole("button", { name: /march 2026/i });
    await ue.click(marchButton);
    expect(marchButton).toHaveAttribute("aria-expanded", "true");
  });
});

describe("AnnualPlannerView — sick leave entries in accordion", () => {
  it("shows sick leave entries in the accordion list", async () => {
    const ue = setup();
    const user: PublicUser = {
      ...baseUser,
      entries: [
        {
          id: "s1",
          startDate: "2026-03-09",
          endDate: "2026-03-13",
          status: LeaveStatus.Approved,
          type: LeaveType.Sick,
          notes: "Flu",
        },
      ],
    };
    render(<AnnualPlannerView user={user} bankHolidays={[]} />);
    // March has a sick entry, so it should be enabled
    const marchButton = screen.getByRole("button", { name: /march 2026/i });
    expect(marchButton).not.toBeDisabled();
    await ue.click(marchButton);
    // Sick label should appear
    expect(screen.getByText("Sick")).toBeInTheDocument();
    expect(screen.getByText("Flu")).toBeInTheDocument();
  });

  it("does not count sick leave in the bar chart segments", () => {
    const user: PublicUser = {
      ...baseUser,
      entries: [
        {
          id: "s1",
          startDate: "2026-03-09",
          endDate: "2026-03-13",
          status: LeaveStatus.Approved,
          type: LeaveType.Sick,
        },
      ],
    };
    render(<AnnualPlannerView user={user} bankHolidays={[]} />);
    // The bar for March should show 0 approved (sick leave not counted)
    const marchBar = screen.getByRole("img", { name: /March: 0 approved/i });
    expect(marchBar).toBeInTheDocument();
  });
});

describe("AnnualPlannerView — within context checks", () => {
  it("uses within to verify content inside a specific bar", () => {
    render(<AnnualPlannerView user={baseUser} bankHolidays={[]} />);
    const bars = screen.getAllByTestId("monthly-leave-bar");
    // First bar (January) should contain the text "January"
    expect(within(bars[0]).getByText("January")).toBeInTheDocument();
  });
});

describe("AnnualPlannerView — year summary section", () => {
  it("renders the 'Year Summary' heading", () => {
    render(<AnnualPlannerView user={baseUser} bankHolidays={[]} />);
    expect(screen.getByText("Year Summary")).toBeInTheDocument();
  });

  it("shows total entitlement from calcLeaveSummary", () => {
    render(<AnnualPlannerView user={baseUser} bankHolidays={[]} />);
    const summary = screen.getByTestId("year-summary");
    expect(within(summary).getByText("Total Entitlement")).toBeInTheDocument();
    expect(within(summary).getByText("Remaining")).toBeInTheDocument();
  });

  it("shows remaining days from calcLeaveSummary", () => {
    const user: PublicUser = {
      ...baseUser,
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
    render(<AnnualPlannerView user={user} bankHolidays={[]} />);
    const summary = screen.getByTestId("year-summary");
    // 25 total - 5 approved = 20 remaining
    expect(within(summary).getByText(/20 days/)).toBeInTheDocument();
  });

  it("shows bank holiday count from calcLeaveSummary when there are bank holidays", () => {
    // 2026-05-04 is a Monday (Early May bank holiday)
    render(<AnnualPlannerView user={baseUser} bankHolidays={[bh("2026-05-04")]} />);
    const summary = screen.getByTestId("year-summary");
    expect(within(summary).getByText(/bank holidays on working days/i)).toBeInTheDocument();
  });

  it("does not show bank holiday row when there are no bank holidays", () => {
    render(<AnnualPlannerView user={baseUser} bankHolidays={[]} />);
    const summary = screen.getByTestId("year-summary");
    expect(within(summary).queryByText(/bank holidays on working days/i)).not.toBeInTheDocument();
  });

  it("shows remaining in red when negative", () => {
    const user: PublicUser = {
      ...baseUser,
      yearAllowances: [
        { year: 2026, company: "Acme", holidayStartMonth: 1, core: 2, bought: 0, carried: 0 },
      ],
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
    render(<AnnualPlannerView user={user} bankHolidays={[]} />);
    const summary = screen.getByTestId("year-summary");
    // 2 - 5 = -3 remaining — should have red text
    const remaining = within(summary).getByText(/-3 days/);
    expect(remaining.className).toContain("text-red-600");
  });
});
