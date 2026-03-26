import { render, screen } from "@testing-library/react";
import MiniCalendar from "@/components/dashboard/MiniCalendar";
import { LeaveStatus, LeaveType } from "@/types";
import type { PublicUser } from "@/types";

// Fix date so tests are deterministic: 2026-03-15 (Sunday)
// March 2026 starts on a Sunday (getDay()=0)
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

describe("MiniCalendar — basic rendering", () => {
  it("renders the widget container", () => {
    render(<MiniCalendar user={alice} bankHolidays={[]} />);
    expect(screen.getByTestId("mini-calendar")).toBeInTheDocument();
  });

  it("shows the current month and year as the heading", () => {
    render(<MiniCalendar user={alice} bankHolidays={[]} />);
    expect(screen.getByText(/march 2026/i)).toBeInTheDocument();
  });

  it("renders 7 day-of-week header columns", () => {
    render(<MiniCalendar user={alice} bankHolidays={[]} />);
    const headers = screen.getAllByTestId("day-header");
    expect(headers).toHaveLength(7);
  });

  it("renders a link to the annual planner", () => {
    render(<MiniCalendar user={alice} bankHolidays={[]} />);
    const link = screen.getByRole("link", { name: /view calendar/i });
    expect(link).toHaveAttribute("href", "/annual-planner");
  });

  it("shows the leave legend with Approved, Requested, Planned labels", () => {
    render(<MiniCalendar user={alice} bankHolidays={[]} />);
    expect(screen.getByText("Approved")).toBeInTheDocument();
    expect(screen.getByText("Requested")).toBeInTheDocument();
    expect(screen.getByText("Planned")).toBeInTheDocument();
  });
});

describe("MiniCalendar — no-leave days show day numbers", () => {
  it("shows day numbers for working days without leave", () => {
    render(<MiniCalendar user={alice} bankHolidays={[]} />);
    // March has 31 days; Mon 2 should be visible as a number
    expect(screen.getByText("2")).toBeInTheDocument();
  });

  it("does not render any leave dots when there are no entries", () => {
    render(<MiniCalendar user={alice} bankHolidays={[]} />);
    expect(screen.queryAllByTestId("leave-dot")).toHaveLength(0);
  });
});

describe("MiniCalendar — leave days show colored dots", () => {
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

  it("renders colored dots for each day with approved leave", () => {
    render(<MiniCalendar user={aliceWithLeave} bankHolidays={[]} />);
    // Mon 9 → Fri 13 = 5 working days (Sat/Sun are non-working)
    const dots = screen.getAllByTestId("leave-dot");
    expect(dots).toHaveLength(5);
  });

  it("does not show day numbers for days that have a leave dot", () => {
    render(<MiniCalendar user={aliceWithLeave} bankHolidays={[]} />);
    // Day 9 has leave so should not appear as plain text
    expect(screen.queryByText("9")).toBeNull();
  });

  it("shows dots for requested leave", () => {
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
    render(<MiniCalendar user={userRequested} bankHolidays={[]} />);
    const dots = screen.getAllByTestId("leave-dot");
    expect(dots).toHaveLength(1);
    expect(dots[0]).toHaveAttribute("aria-label", expect.stringContaining("requested"));
  });

  it("shows dots for planned leave", () => {
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
    render(<MiniCalendar user={userPlanned} bankHolidays={[]} />);
    const dots = screen.getAllByTestId("leave-dot");
    expect(dots).toHaveLength(1);
    expect(dots[0]).toHaveAttribute("aria-label", expect.stringContaining("planned"));
  });

  it("does not show a dot for sick leave entries", () => {
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
    render(<MiniCalendar user={userSick} bankHolidays={[]} />);
    expect(screen.queryAllByTestId("leave-dot")).toHaveLength(0);
  });

  it("approved dot takes priority over planned dot on the same day", () => {
    const userMulti: PublicUser = {
      ...alice,
      entries: [
        {
          id: "e5",
          startDate: "2026-03-16",
          endDate: "2026-03-16",
          status: LeaveStatus.Planned,
          type: LeaveType.Holiday,
        },
        {
          id: "e6",
          startDate: "2026-03-16",
          endDate: "2026-03-16",
          status: LeaveStatus.Approved,
          type: LeaveType.Holiday,
        },
      ],
    };
    render(<MiniCalendar user={userMulti} bankHolidays={[]} />);
    const dots = screen.getAllByTestId("leave-dot");
    expect(dots).toHaveLength(1);
    expect(dots[0]).toHaveAttribute("aria-label", expect.stringContaining("approved"));  });

  it("does not show dots for entries outside the current month", () => {
    const userOtherMonth: PublicUser = {
      ...alice,
      entries: [
        {
          id: "e7",
          startDate: "2026-04-01",
          endDate: "2026-04-05",
          status: LeaveStatus.Approved,
          type: LeaveType.Holiday,
        },
      ],
    };
    render(<MiniCalendar user={userOtherMonth} bankHolidays={[]} />);
    expect(screen.queryAllByTestId("leave-dot")).toHaveLength(0);
  });
});
