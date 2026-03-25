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
    render(<SharedCalendarView currentUser={alice} pinnedUsers={[]} bankHolidays={[]} />);
    expect(screen.getByRole("heading", { name: /March 2026/i })).toBeInTheDocument();
  });

  it("renders 'You' label for the current user row", () => {
    render(<SharedCalendarView currentUser={alice} pinnedUsers={[]} bankHolidays={[]} />);
    expect(screen.getByText("You")).toBeInTheDocument();
  });

  it("renders the first name of pinned users", () => {
    render(<SharedCalendarView currentUser={alice} pinnedUsers={[bob]} bankHolidays={[]} />);
    expect(screen.getByText("Bob")).toBeInTheDocument();
  });

  it("renders day numbers 1 through 31 for March", () => {
    render(<SharedCalendarView currentUser={alice} pinnedUsers={[]} bankHolidays={[]} />);
    // There should be cells for day 1 and day 31
    const allCells = screen.getAllByRole("columnheader");
    const dayNums = allCells.map((c) => parseInt(c.textContent ?? "", 10)).filter((n) => !isNaN(n));
    expect(dayNums).toContain(1);
    expect(dayNums).toContain(31);
  });

  it("renders a legend with Approved, Requested, Planned, Bank Holiday items (no Clash)", () => {
    render(<SharedCalendarView currentUser={alice} pinnedUsers={[]} bankHolidays={[]} />);
    expect(screen.getByText("Approved")).toBeInTheDocument();
    expect(screen.getByText("Requested")).toBeInTheDocument();
    expect(screen.getByText("Planned")).toBeInTheDocument();
    expect(screen.getByText("Bank Holiday")).toBeInTheDocument();
    expect(screen.queryByText("Clash")).not.toBeInTheDocument();
  });

  it("renders user initials in the name column", () => {
    render(<SharedCalendarView currentUser={alice} pinnedUsers={[bob]} bankHolidays={[]} />);
    // Alice Smith → AS, Bob Jones → BJ
    expect(screen.getByText("AS")).toBeInTheDocument();
    expect(screen.getByText("BJ")).toBeInTheDocument();
  });
});

describe("SharedCalendarView — month navigation", () => {
  it("navigates to the previous month on ‹ click", async () => {
    const user = setup();
    render(<SharedCalendarView currentUser={alice} pinnedUsers={[]} bankHolidays={[]} />);
    await user.click(screen.getByRole("button", { name: "Previous month" }));
    expect(screen.getByRole("heading", { name: /February 2026/i })).toBeInTheDocument();
  });

  it("navigates to the next month on › click", async () => {
    const user = setup();
    render(<SharedCalendarView currentUser={alice} pinnedUsers={[]} bankHolidays={[]} />);
    await user.click(screen.getByRole("button", { name: "Next month" }));
    expect(screen.getByRole("heading", { name: /April 2026/i })).toBeInTheDocument();
  });

  it("wraps from January to December when navigating back", async () => {
    jest.setSystemTime(new Date("2026-01-15"));
    const user = setup();
    render(<SharedCalendarView currentUser={alice} pinnedUsers={[]} bankHolidays={[]} />);
    await user.click(screen.getByRole("button", { name: "Previous month" }));
    expect(screen.getByRole("heading", { name: /December 2025/i })).toBeInTheDocument();
  });

  it("wraps from December to January when navigating forward", async () => {
    jest.setSystemTime(new Date("2026-12-01"));
    const user = setup();
    render(<SharedCalendarView currentUser={alice} pinnedUsers={[]} bankHolidays={[]} />);
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
      <SharedCalendarView currentUser={aliceWithLeave} pinnedUsers={[bob]} bankHolidays={[]} />
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
      <SharedCalendarView currentUser={alice} pinnedUsers={[]} bankHolidays={[bh("2026-03-20")]} />
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
    render(<SharedCalendarView currentUser={alice} pinnedUsers={[]} bankHolidays={[]} />);
    // "You" row should be present; no "Bob" row
    expect(screen.getByText("You")).toBeInTheDocument();
    expect(screen.queryByText("Bob")).not.toBeInTheDocument();
  });
});

describe("SharedCalendarView — current day marker", () => {
  it("applies underline to today's header cell", () => {
    const { container } = render(
      <SharedCalendarView currentUser={alice} pinnedUsers={[]} bankHolidays={[]} />
    );
    // Today is 2026-03-15 → day "15" header should have underline class
    const todayHeader = Array.from(container.querySelectorAll("th")).find(
      (el) => el.textContent === "15"
    );
    expect(todayHeader).toBeTruthy();
    expect(todayHeader?.className).toMatch(/underline/);
    expect(todayHeader?.className).toMatch(/text-indigo-600/);
  });

  it("does not apply blue outline to today's data cells", () => {
    const { container } = render(
      <SharedCalendarView currentUser={alice} pinnedUsers={[]} bankHolidays={[]} />
    );
    // No td should have the old outline-indigo-500 class
    expect(container.querySelectorAll("td.outline-indigo-500").length).toBe(0);
  });
});

describe("SharedCalendarView — interactivity (add leave)", () => {
  it("calls onAddLeave with the date when clicking an empty cell in the current user row", async () => {
    const user = setup();
    const onAddLeave = jest.fn();
    const { container } = render(
      <SharedCalendarView
        currentUser={alice}
        pinnedUsers={[]}
        bankHolidays={[]}
        onAddLeave={onAddLeave}
      />
    );
    // Click the cell for day 20 in Alice's row (Alice has no entries)
    // The first <tbody> row belongs to Alice; day 20 maps to the 20th td (after the sticky name td)
    const aliceRow = container.querySelector("tbody tr");
    const cells = aliceRow?.querySelectorAll("td");
    // cells[0] is the name cell; cells[20] is day 20 (1-indexed offset by the name cell)
    const day20Cell = cells?.[20];
    expect(day20Cell).toBeTruthy();
    await user.click(day20Cell!);
    expect(onAddLeave).toHaveBeenCalledWith("2026-03-20");
  });

  it("does not call onAddLeave when clicking a cell in a pinned user's row", async () => {
    const user = setup();
    const onAddLeave = jest.fn();
    const { container } = render(
      <SharedCalendarView
        currentUser={alice}
        pinnedUsers={[bob]}
        bankHolidays={[]}
        onAddLeave={onAddLeave}
      />
    );
    // Click a cell in Bob's row (second <tbody> row)
    const rows = container.querySelectorAll("tbody tr");
    const bobRow = rows[1];
    const cells = bobRow?.querySelectorAll("td");
    await user.click(cells![20]);
    expect(onAddLeave).not.toHaveBeenCalled();
  });
});

describe("SharedCalendarView — leave entry popover", () => {
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
        notes: "Beach trip",
      },
    ],
  };

  it("shows a popover when clicking a leave cell", async () => {
    const user = setup();
    render(<SharedCalendarView currentUser={aliceWithLeave} pinnedUsers={[]} bankHolidays={[]} />);
    // Find the leave cell for day 20 and click it
    const leaveCell = screen
      .getAllByRole("cell")
      .find((el) => el.title === "approved: 2026-03-20 – 2026-03-20");
    expect(leaveCell).toBeTruthy();
    await user.click(leaveCell!);
    // Popover should be visible with leave details
    const tooltip = screen.getByRole("tooltip");
    expect(tooltip).toBeInTheDocument();
    // Both "Approved" badge (in popover) and in legend exist; check the popover has the note
    expect(screen.getByText("Beach trip")).toBeInTheDocument();
    // The tooltip itself should contain the status badge
    expect(tooltip.textContent).toMatch(/Approved/);
  });

  it("closes the popover when clicking the close button", async () => {
    const user = setup();
    render(<SharedCalendarView currentUser={aliceWithLeave} pinnedUsers={[]} bankHolidays={[]} />);
    const leaveCell = screen
      .getAllByRole("cell")
      .find((el) => el.title === "approved: 2026-03-20 – 2026-03-20");
    await user.click(leaveCell!);
    expect(screen.getByRole("tooltip")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Close" }));
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
  });

  it("shows edit and delete buttons in the popover for own leave entries when handlers provided", async () => {
    const user = setup();
    const onEdit = jest.fn();
    const onDelete = jest.fn();
    render(
      <SharedCalendarView
        currentUser={aliceWithLeave}
        pinnedUsers={[]}
        bankHolidays={[]}
        onEdit={onEdit}
        onDelete={onDelete}
      />
    );
    const leaveCell = screen
      .getAllByRole("cell")
      .find((el) => el.title === "approved: 2026-03-20 – 2026-03-20");
    await user.click(leaveCell!);
    expect(screen.getByRole("button", { name: "Edit" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Delete" })).toBeInTheDocument();
  });

  it("does not show edit/delete in the popover for a connection's leave entry", async () => {
    const bobWithLeave: PublicUser = {
      ...bob,
      entries: [
        {
          id: "e2",
          startDate: "2026-03-20",
          endDate: "2026-03-20",
          status: LeaveStatus.Approved,
          type: LeaveType.Holiday,
          duration: LeaveDuration.Full,
        },
      ],
    };
    const user = setup();
    const onEdit = jest.fn();
    const onDelete = jest.fn();
    render(
      <SharedCalendarView
        currentUser={alice}
        pinnedUsers={[bobWithLeave]}
        bankHolidays={[]}
        onEdit={onEdit}
        onDelete={onDelete}
      />
    );
    // Bob's leave cell
    const leaveCells = screen
      .getAllByRole("cell")
      .filter((el) => el.title === "approved: 2026-03-20 – 2026-03-20");
    // Click Bob's cell (second row's cell)
    await user.click(leaveCells[0]);
    expect(screen.getByRole("tooltip")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Edit" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Delete" })).not.toBeInTheDocument();
  });
});

describe("SharedCalendarView — View Calendar button", () => {
  it("renders a 'View calendar' button for each pinned user", () => {
    render(<SharedCalendarView currentUser={alice} pinnedUsers={[bob]} bankHolidays={[]} />);
    expect(screen.getByRole("button", { name: "View calendar for Bob" })).toBeInTheDocument();
  });

  it("does not render a 'View calendar' button for the current user row", () => {
    render(<SharedCalendarView currentUser={alice} pinnedUsers={[bob]} bankHolidays={[]} />);
    expect(
      screen.queryByRole("button", { name: "View calendar for Alice" })
    ).not.toBeInTheDocument();
  });

  it("toggles the expanded calendar when clicking the View Calendar button", async () => {
    const user = setup();
    render(<SharedCalendarView currentUser={alice} pinnedUsers={[bob]} bankHolidays={[]} />);
    const viewBtn = screen.getByRole("button", { name: "View calendar for Bob" });
    // Calendar should not be visible initially
    expect(screen.queryByText("Bob's Calendar")).not.toBeInTheDocument();
    // Click to expand
    await user.click(viewBtn);
    expect(screen.getByText("Bob's Calendar")).toBeInTheDocument();
    // Click close button to collapse
    await user.click(screen.getByRole("button", { name: "Close calendar" }));
    expect(screen.queryByText("Bob's Calendar")).not.toBeInTheDocument();
  });

  it("collapses the calendar when clicking the same View Calendar button again", async () => {
    const user = setup();
    render(<SharedCalendarView currentUser={alice} pinnedUsers={[bob]} bankHolidays={[]} />);
    const viewBtn = screen.getByRole("button", { name: "View calendar for Bob" });
    await user.click(viewBtn);
    expect(screen.getByText("Bob's Calendar")).toBeInTheDocument();
    // Click again to collapse
    await user.click(viewBtn);
    expect(screen.queryByText("Bob's Calendar")).not.toBeInTheDocument();
  });
});
