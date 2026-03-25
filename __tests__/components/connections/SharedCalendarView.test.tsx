import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import SharedCalendarView from "@/components/connections/SharedCalendarView";
import { LeaveStatus, LeaveType, LeaveDuration } from "@/types";
import type { PublicUser, BankHolidayEntry } from "@/types";

// Fix today so tests are deterministic
beforeEach(() => {
  jest.useFakeTimers();
  jest.setSystemTime(new Date("2026-03-15")); // Sunday 15 March 2026
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

const alice: PublicUser = {
  id: "u1",
  profile: {
    firstName: "Alice",
    lastName: "Smith",
    email: "alice@example.com",
    nonWorkingDays: [0, 6],
    pinnedUserIds: ["u2"],
  },
  yearAllowances: [
    { year: 2026, company: "Acme", holidayStartMonth: 1, core: 25, bought: 0, carried: 0 },
  ],
  entries: [],
};

const bob: PublicUser = {
  id: "u2",
  profile: {
    firstName: "Bob",
    lastName: "Jones",
    email: "bob@example.com",
    nonWorkingDays: [0, 6],
    pinnedUserIds: [],
  },
  yearAllowances: [],
  entries: [],
};

describe("SharedCalendarView — rendering", () => {
  it("renders the current month heading", () => {
    render(
      <SharedCalendarView currentUser={alice} pinnedUsers={[]} bankHolidays={[]} />
    );
    expect(screen.getByRole("heading", { name: /March 2026/i })).toBeInTheDocument();
  });

  it("renders 'You' label for the current user row", () => {
    render(
      <SharedCalendarView currentUser={alice} pinnedUsers={[]} bankHolidays={[]} />
    );
    expect(screen.getByText("You")).toBeInTheDocument();
  });

  it("renders the first name of pinned users", () => {
    render(
      <SharedCalendarView currentUser={alice} pinnedUsers={[bob]} bankHolidays={[]} />
    );
    expect(screen.getByText("Bob")).toBeInTheDocument();
  });

  it("renders day numbers 1 through 31 for March", () => {
    render(
      <SharedCalendarView currentUser={alice} pinnedUsers={[]} bankHolidays={[]} />
    );
    // There should be cells for day 1 and day 31
    const allCells = screen.getAllByRole("columnheader");
    const dayNums = allCells
      .map((c) => parseInt(c.textContent ?? "", 10))
      .filter((n) => !isNaN(n));
    expect(dayNums).toContain(1);
    expect(dayNums).toContain(31);
  });

  it("renders a legend with Approved, Requested, Planned, Bank Holiday items (no Clash)", () => {
    render(
      <SharedCalendarView currentUser={alice} pinnedUsers={[]} bankHolidays={[]} />
    );
    expect(screen.getByText("Approved")).toBeInTheDocument();
    expect(screen.getByText("Requested")).toBeInTheDocument();
    expect(screen.getByText("Planned")).toBeInTheDocument();
    expect(screen.getByText("Bank Holiday")).toBeInTheDocument();
    expect(screen.queryByText("Clash")).not.toBeInTheDocument();
  });

  it("renders user initials in the name column", () => {
    render(
      <SharedCalendarView currentUser={alice} pinnedUsers={[bob]} bankHolidays={[]} />
    );
    // Alice Smith → AS, Bob Jones → BJ
    expect(screen.getByText("AS")).toBeInTheDocument();
    expect(screen.getByText("BJ")).toBeInTheDocument();
  });
});

describe("SharedCalendarView — month navigation", () => {
  it("navigates to the previous month on ‹ click", async () => {
    const user = setup();
    render(
      <SharedCalendarView currentUser={alice} pinnedUsers={[]} bankHolidays={[]} />
    );
    await user.click(screen.getByRole("button", { name: "Previous month" }));
    expect(screen.getByRole("heading", { name: /February 2026/i })).toBeInTheDocument();
  });

  it("navigates to the next month on › click", async () => {
    const user = setup();
    render(
      <SharedCalendarView currentUser={alice} pinnedUsers={[]} bankHolidays={[]} />
    );
    await user.click(screen.getByRole("button", { name: "Next month" }));
    expect(screen.getByRole("heading", { name: /April 2026/i })).toBeInTheDocument();
  });

  it("wraps from January to December when navigating back", async () => {
    jest.setSystemTime(new Date("2026-01-15"));
    const user = setup();
    render(
      <SharedCalendarView currentUser={alice} pinnedUsers={[]} bankHolidays={[]} />
    );
    await user.click(screen.getByRole("button", { name: "Previous month" }));
    expect(screen.getByRole("heading", { name: /December 2025/i })).toBeInTheDocument();
  });

  it("wraps from December to January when navigating forward", async () => {
    jest.setSystemTime(new Date("2026-12-01"));
    const user = setup();
    render(
      <SharedCalendarView currentUser={alice} pinnedUsers={[]} bankHolidays={[]} />
    );
    await user.click(screen.getByRole("button", { name: "Next month" }));
    expect(screen.getByRole("heading", { name: /January 2027/i })).toBeInTheDocument();
  });
});

describe("SharedCalendarView — clash highlighting", () => {
  it("highlights clash date numbers in red", () => {
    const aliceWithLeave: PublicUser = {
      ...alice,
      entries: [
        {
          id: "e1",
          startDate: "2026-03-10",
          endDate: "2026-03-10",
          status: LeaveStatus.Approved,
          type: LeaveType.Holiday,
          duration: LeaveDuration.Full,
        },
      ],
    };
    const bobWithLeave: PublicUser = {
      ...bob,
      entries: [
        {
          id: "e2",
          startDate: "2026-03-10",
          endDate: "2026-03-10",
          status: LeaveStatus.Approved,
          type: LeaveType.Holiday,
          duration: LeaveDuration.Full,
        },
      ],
    };

    const { container } = render(
      <SharedCalendarView
        currentUser={aliceWithLeave}
        pinnedUsers={[bobWithLeave]}
        bankHolidays={[]}
      />
    );

    // The "10" day header should carry a red text class
    const redHeaders = container.querySelectorAll("th.text-red-600");
    const dayTen = Array.from(redHeaders).find((el) => el.textContent === "10");
    expect(dayTen).toBeTruthy();
  });

  it("does not apply clash ring to clashing day cells (ring was removed)", () => {
    const aliceWithLeave: PublicUser = {
      ...alice,
      entries: [
        {
          id: "e1",
          startDate: "2026-03-10",
          endDate: "2026-03-10",
          status: LeaveStatus.Requested,
          type: LeaveType.Holiday,
          duration: LeaveDuration.Full,
        },
      ],
    };
    const bobWithLeave: PublicUser = {
      ...bob,
      entries: [
        {
          id: "e2",
          startDate: "2026-03-10",
          endDate: "2026-03-10",
          status: LeaveStatus.Requested,
          type: LeaveType.Holiday,
          duration: LeaveDuration.Full,
        },
      ],
    };

    const { container } = render(
      <SharedCalendarView
        currentUser={aliceWithLeave}
        pinnedUsers={[bobWithLeave]}
        bankHolidays={[]}
      />
    );

    // Ring was removed from cells — only the day header goes red for clashes
    expect(container.querySelectorAll("td.ring-red-500").length).toBe(0);
  });

  it("does not highlight days where only one user has leave", () => {
    const aliceWithLeave: PublicUser = {
      ...alice,
      entries: [
        {
          id: "e1",
          startDate: "2026-03-05",
          endDate: "2026-03-05",
          status: LeaveStatus.Approved,
          type: LeaveType.Holiday,
          duration: LeaveDuration.Full,
        },
      ],
    };

    const { container } = render(
      <SharedCalendarView
        currentUser={aliceWithLeave}
        pinnedUsers={[bob]}
        bankHolidays={[]}
      />
    );

    // Check table cells only (not the legend swatch)
    const clashCells = container.querySelectorAll("td.ring-red-500");
    expect(clashCells.length).toBe(0);
  });

  it("does not clash when only Planned entries overlap", () => {
    const aliceWithLeave: PublicUser = {
      ...alice,
      entries: [
        {
          id: "e1",
          startDate: "2026-03-10",
          endDate: "2026-03-10",
          status: LeaveStatus.Planned,
          type: LeaveType.Holiday,
          duration: LeaveDuration.Full,
        },
      ],
    };
    const bobWithLeave: PublicUser = {
      ...bob,
      entries: [
        {
          id: "e2",
          startDate: "2026-03-10",
          endDate: "2026-03-10",
          status: LeaveStatus.Planned,
          type: LeaveType.Holiday,
          duration: LeaveDuration.Full,
        },
      ],
    };

    const { container } = render(
      <SharedCalendarView
        currentUser={aliceWithLeave}
        pinnedUsers={[bobWithLeave]}
        bankHolidays={[]}
      />
    );

    // Check table cells only (not the legend swatch)
    expect(container.querySelectorAll("td.ring-red-500").length).toBe(0);
  });
});

describe("SharedCalendarView — leave cell colouring", () => {
  it("applies green background to cells with approved leave", () => {
    const aliceWithLeave: PublicUser = {
      ...alice,
      entries: [
        {
          id: "e1",
          startDate: "2026-03-20",
          endDate: "2026-03-20",
          status: LeaveStatus.Approved,
          type: LeaveType.Holiday,
          duration: LeaveDuration.Full,
        },
      ],
    };
    const { container } = render(
      <SharedCalendarView currentUser={aliceWithLeave} pinnedUsers={[]} bankHolidays={[]} />
    );
    const greenCells = container.querySelectorAll("td.bg-green-300");
    expect(greenCells.length).toBeGreaterThan(0);
  });

  it("applies blue background to cells with requested leave", () => {
    const aliceWithLeave: PublicUser = {
      ...alice,
      entries: [
        {
          id: "e1",
          startDate: "2026-03-20",
          endDate: "2026-03-20",
          status: LeaveStatus.Requested,
          type: LeaveType.Holiday,
          duration: LeaveDuration.Full,
        },
      ],
    };
    const { container } = render(
      <SharedCalendarView currentUser={aliceWithLeave} pinnedUsers={[]} bankHolidays={[]} />
    );
    const blueCells = container.querySelectorAll("td.bg-blue-300");
    expect(blueCells.length).toBeGreaterThan(0);
  });

  it("applies yellow background to cells with planned leave", () => {
    const aliceWithLeave: PublicUser = {
      ...alice,
      entries: [
        {
          id: "e1",
          startDate: "2026-03-20",
          endDate: "2026-03-20",
          status: LeaveStatus.Planned,
          type: LeaveType.Holiday,
          duration: LeaveDuration.Full,
        },
      ],
    };
    const { container } = render(
      <SharedCalendarView currentUser={aliceWithLeave} pinnedUsers={[]} bankHolidays={[]} />
    );
    const yellowCells = container.querySelectorAll("td.bg-yellow-200");
    expect(yellowCells.length).toBeGreaterThan(0);
  });

  it("applies purple background to cells on bank holiday dates", () => {
    const { container } = render(
      <SharedCalendarView
        currentUser={alice}
        pinnedUsers={[]}
        bankHolidays={[bh("2026-03-20")]}
      />
    );
    const purpleCells = container.querySelectorAll("td.bg-purple-100");
    expect(purpleCells.length).toBeGreaterThan(0);
  });
});

describe("SharedCalendarView — sticky person column", () => {
  it("applies sticky class to the Person header cell", () => {
    const { container } = render(
      <SharedCalendarView currentUser={alice} pinnedUsers={[]} bankHolidays={[]} />
    );
    const personHeader = container.querySelector("th.sticky");
    expect(personHeader).toBeTruthy();
    expect(personHeader?.textContent).toBe("Person");
  });

  it("applies sticky class to each person name cell in the body", () => {
    const { container } = render(
      <SharedCalendarView currentUser={alice} pinnedUsers={[bob]} bankHolidays={[]} />
    );
    const stickyBodyCells = container.querySelectorAll("td.sticky");
    // One sticky cell per user row (2 users: alice + bob)
    expect(stickyBodyCells.length).toBe(2);
  });
});

describe("SharedCalendarView — no pinned users", () => {
  it("renders only the current user row when there are no pinned users", () => {
    render(
      <SharedCalendarView currentUser={alice} pinnedUsers={[]} bankHolidays={[]} />
    );
    // "You" row should be present; no "Bob" row
    expect(screen.getByText("You")).toBeInTheDocument();
    expect(screen.queryByText("Bob")).not.toBeInTheDocument();
  });
});
