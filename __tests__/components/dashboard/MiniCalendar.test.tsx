import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import MiniCalendar from "@/components/dashboard/MiniCalendar";
import { LeaveStatus, LeaveType, LeaveDuration } from "@/types";
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

  it("shows day numbers inside leave dots", () => {
    render(<MiniCalendar user={aliceWithLeave} bankHolidays={[]} />);
    // Day 9 has leave — day number should appear INSIDE the leave dot
    const dot = screen.getAllByTestId("leave-dot").find((el) => el.textContent === "9");
    expect(dot).toBeTruthy();
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

describe("MiniCalendar — month navigation", () => {
  function setup() {
    return userEvent.setup({ advanceTimers: jest.advanceTimersByTime.bind(jest) });
  }

  it("renders Previous month and Next month buttons", () => {
    render(<MiniCalendar user={alice} bankHolidays={[]} />);
    expect(screen.getByRole("button", { name: "Previous month" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Next month" })).toBeInTheDocument();
  });

  it("navigates to the next month when Next month is clicked", async () => {
    const user = setup();
    render(<MiniCalendar user={alice} bankHolidays={[]} />);
    await user.click(screen.getByRole("button", { name: "Next month" }));
    // Should now show April 2026
    expect(
      screen.getByRole("button", { name: /April 2026.*open month-year picker/i })
    ).toBeInTheDocument();
  });

  it("navigates to the previous month when Previous month is clicked", async () => {
    const user = setup();
    // Alice has entries in 2026, so min bound is at or before March 2026
    // Give Alice a historical entry to ensure min goes back to 2025
    const aliceWithHistory: PublicUser = {
      ...alice,
      entries: [
        {
          id: "eh",
          startDate: "2025-06-01",
          endDate: "2025-06-01",
          status: LeaveStatus.Approved,
          type: LeaveType.Holiday,
        },
      ],
    };
    render(<MiniCalendar user={aliceWithHistory} bankHolidays={[]} />);
    await user.click(screen.getByRole("button", { name: "Previous month" }));
    expect(
      screen.getByRole("button", { name: /February 2026.*open month-year picker/i })
    ).toBeInTheDocument();
  });

  it("disables Previous month at the earliest navigable month", () => {
    // With no historical entries, min = current month (March 2026) so at min already
    render(<MiniCalendar user={alice} bankHolidays={[]} />);
    expect(screen.getByRole("button", { name: "Previous month" })).toBeDisabled();
  });

  it("opens the MonthYearPicker when the label is clicked", async () => {
    const user = setup();
    render(<MiniCalendar user={alice} bankHolidays={[]} />);
    await user.click(
      screen.getByRole("button", { name: /March 2026.*open month-year picker/i })
    );
    expect(screen.getByRole("dialog", { name: "Month-year picker" })).toBeInTheDocument();
  });
});

describe("MiniCalendar — bank holidays", () => {
  it("renders bank holidays with the purple bg-purple-200 style", () => {
    render(<MiniCalendar user={alice} bankHolidays={[{ date: "2026-03-16", title: "Good Friday" }]} />);
    const bhDot = screen.getByTestId("bank-holiday-dot");
    expect(bhDot).toBeInTheDocument();
    expect(bhDot.className).toContain("bg-purple-200");
  });

  it("shows the day number inside the bank holiday dot", () => {
    render(<MiniCalendar user={alice} bankHolidays={[{ date: "2026-03-16", title: "Good Friday" }]} />);
    const bhDot = screen.getByTestId("bank-holiday-dot");
    expect(bhDot.textContent).toBe("16");
  });

  it("shows a popover with the bank holiday name when clicked", async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime.bind(jest) });
    render(<MiniCalendar user={alice} bankHolidays={[{ date: "2026-03-16", title: "Good Friday" }]} />);
    await user.click(screen.getByTestId("bank-holiday-dot"));
    const popover = screen.getByRole("tooltip");
    expect(popover).toBeInTheDocument();
    expect(popover.textContent).toContain("Good Friday");
  });

  it("shows Bank Holiday in the legend", () => {
    render(<MiniCalendar user={alice} bankHolidays={[]} />);
    expect(screen.getByText("Bank Holiday")).toBeInTheDocument();
  });
});

describe("MiniCalendar — half-day circle rendering", () => {
  it("renders a half-morning entry with a gradient style (top half coloured)", () => {
    const aliceAM: PublicUser = {
      ...alice,
      entries: [
        {
          id: "e-am",
          startDate: "2026-03-16",
          endDate: "2026-03-16",
          status: LeaveStatus.Approved,
          type: LeaveType.Holiday,
          duration: LeaveDuration.HalfMorning,
        },
      ],
    };
    render(<MiniCalendar user={aliceAM} bankHolidays={[]} />);
    const dots = screen.getAllByTestId("leave-dot");
    expect(dots).toHaveLength(1);
    // A half-morning should use a linear-gradient (not a solid background-color)
    const style = dots[0].getAttribute("style") ?? "";
    expect(style).toMatch(/linear-gradient/);
  });

  it("renders a half-afternoon entry with a gradient style (bottom half coloured)", () => {
    const alicePM: PublicUser = {
      ...alice,
      entries: [
        {
          id: "e-pm",
          startDate: "2026-03-16",
          endDate: "2026-03-16",
          status: LeaveStatus.Approved,
          type: LeaveType.Holiday,
          duration: LeaveDuration.HalfAfternoon,
        },
      ],
    };
    render(<MiniCalendar user={alicePM} bankHolidays={[]} />);
    const dots = screen.getAllByTestId("leave-dot");
    expect(dots).toHaveLength(1);
    const style = dots[0].getAttribute("style") ?? "";
    expect(style).toMatch(/linear-gradient/);
  });

  it("renders a full-day entry with a solid background (no gradient)", () => {
    const aliceFull: PublicUser = {
      ...alice,
      entries: [
        {
          id: "e-full",
          startDate: "2026-03-16",
          endDate: "2026-03-16",
          status: LeaveStatus.Approved,
          type: LeaveType.Holiday,
          duration: LeaveDuration.Full,
        },
      ],
    };
    render(<MiniCalendar user={aliceFull} bankHolidays={[]} />);
    const dots = screen.getAllByTestId("leave-dot");
    expect(dots).toHaveLength(1);
    const style = dots[0].getAttribute("style") ?? "";
    // Full-day circle uses background-color, not gradient
    expect(style).not.toMatch(/linear-gradient/);
  });
});

describe("MiniCalendar — leave click popover", () => {
  const aliceWithLeave: PublicUser = {
    ...alice,
    entries: [
      {
        id: "e1",
        startDate: "2026-03-16",
        endDate: "2026-03-16",
        status: LeaveStatus.Approved,
        type: LeaveType.Holiday,
        notes: "Approved leave",
      },
    ],
  };

  it("shows a popover when a leave dot is clicked", async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime.bind(jest) });
    render(<MiniCalendar user={aliceWithLeave} bankHolidays={[]} />);
    await user.click(screen.getAllByTestId("leave-dot")[0]);
    expect(screen.getByRole("tooltip")).toBeInTheDocument();
  });

  it("popover contains the leave notes", async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime.bind(jest) });
    render(<MiniCalendar user={aliceWithLeave} bankHolidays={[]} />);
    await user.click(screen.getAllByTestId("leave-dot")[0]);
    expect(screen.getByRole("tooltip").textContent).toContain("Approved leave");
  });

  it("closes the popover when the Close button is clicked", async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime.bind(jest) });
    render(<MiniCalendar user={aliceWithLeave} bankHolidays={[]} />);
    await user.click(screen.getAllByTestId("leave-dot")[0]);
    expect(screen.getByRole("tooltip")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Close popover" }));
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
  });
});

describe("MiniCalendar — today indicator uses ring (not solid fill)", () => {
  it("today's date span does not have bg-indigo-600 class", () => {
    // System time is 2026-03-15 so day 15 is today
    render(<MiniCalendar user={alice} bankHolidays={[]} />);
    // Find span containing '15'
    const spans = document.querySelectorAll("span");
    const todaySpan = Array.from(spans).find(
      (el) => el.textContent === "15" && el.tagName === "SPAN"
    );
    expect(todaySpan).toBeTruthy();
    expect(todaySpan?.className).not.toContain("bg-indigo-600");
    expect(todaySpan?.className).toContain("ring-indigo-600");
  });
});

describe("MiniCalendar — popover matches CalendarView style", () => {
  const aliceWithLeave: PublicUser = {
    ...alice,
    entries: [
      {
        id: "e1",
        startDate: "2026-03-16",
        endDate: "2026-03-16",
        status: LeaveStatus.Approved,
        type: LeaveType.Holiday,
        notes: "Beach day",
      },
    ],
  };

  it("popover shows a status badge", async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime.bind(jest) });
    render(<MiniCalendar user={aliceWithLeave} bankHolidays={[]} />);
    await user.click(screen.getAllByTestId("leave-dot")[0]);
    const tooltip = screen.getByRole("tooltip");
    // Badge text is the status capitalised
    expect(tooltip.textContent).toContain("Approved");
  });

  it("popover shows the date range", async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime.bind(jest) });
    render(<MiniCalendar user={aliceWithLeave} bankHolidays={[]} />);
    await user.click(screen.getAllByTestId("leave-dot")[0]);
    const tooltip = screen.getByRole("tooltip");
    expect(tooltip.textContent).toContain("16 Mar");
  });

  it("popover shows the duration line", async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime.bind(jest) });
    render(<MiniCalendar user={aliceWithLeave} bankHolidays={[]} />);
    await user.click(screen.getAllByTestId("leave-dot")[0]);
    const tooltip = screen.getByRole("tooltip");
    expect(tooltip.textContent).toMatch(/working day/i);
  });

  it("bank holiday popover shows a 'Bank Holiday' badge", async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime.bind(jest) });
    render(<MiniCalendar user={alice} bankHolidays={[{ date: "2026-03-17", title: "St Patrick" }]} />);
    const bh = screen.getAllByTestId("bank-holiday-dot");
    await user.click(bh[0]);
    const tooltip = screen.getByRole("tooltip");
    expect(tooltip.textContent).toContain("Bank Holiday");
    expect(tooltip.textContent).toContain("St Patrick");
  });
});
