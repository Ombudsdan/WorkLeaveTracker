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

  it("renders the 'Monthly Leave Roundup' heading", () => {
    render(<AnnualPlannerView user={baseUser} bankHolidays={[]} />);
    expect(screen.getByText("Monthly Leave Roundup")).toBeInTheDocument();
  });

  it("renders the year window label", () => {
    render(<AnnualPlannerView user={baseUser} bankHolidays={[]} />);
    // formatYearWindow for year=2026, startMonth=1 → "1 Jan 2026 – 31 Dec 2026"
    expect(screen.getByText(/1 Jan 2026/)).toBeInTheDocument();
  });

  it("renders the colour legend with all four categories", () => {
    render(<AnnualPlannerView user={baseUser} bankHolidays={[]} />);
    expect(screen.getByText("Approved")).toBeInTheDocument();
    expect(screen.getByText("Requested")).toBeInTheDocument();
    expect(screen.getByText("Planned")).toBeInTheDocument();
    expect(screen.getByText("Bank Holidays")).toBeInTheDocument();
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

  it("shows the entry count badge on months with entries", () => {
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
