import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import LeaveList from "@/components/dashboard/LeaveList";
import { LeaveStatus, LeaveType, LeaveDuration } from "@/types";
import type { PublicUser, LeaveEntry, BankHolidayEntry } from "@/types";

beforeEach(() => {
  jest.useFakeTimers();
  jest.setSystemTime(new Date("2026-03-15"));
});

afterEach(() => {
  jest.useRealTimers();
});

// Use userEvent.setup with advanceTimers so fake timers don't block async interactions
function setup() {
  return userEvent.setup({ advanceTimers: jest.advanceTimersByTime.bind(jest) });
}

/** Helper to wrap a date string into the BankHolidayEntry shape expected by the component */
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
  },
  yearAllowances: [
    { year: 2026, company: "Acme", holidayStartMonth: 1, core: 25, bought: 0, carried: 0 },
  ],
  entries: [],
};

const entry: LeaveEntry = {
  id: "e1",
  startDate: "2026-03-09",
  endDate: "2026-03-13",
  status: LeaveStatus.Approved,
  type: LeaveType.Holiday,
  notes: "Beach trip",
};

const singleDayEntry: LeaveEntry = {
  id: "e2",
  startDate: "2026-03-20",
  endDate: "2026-03-20",
  status: LeaveStatus.Planned,
  type: LeaveType.Holiday,
};

describe("LeaveList — empty state", () => {
  it("shows 'No upcoming leave.' for own empty list", () => {
    render(
      <LeaveList
        user={alice}
        bankHolidays={[]}
        isOwnProfile={true}
        onEdit={jest.fn()}
        onDelete={jest.fn()}
      />
    );
    expect(screen.getByText("No upcoming leave.")).toBeInTheDocument();
  });

  it("shows 'No upcoming leave.' for another user's empty list", () => {
    render(
      <LeaveList
        user={alice}
        bankHolidays={[]}
        isOwnProfile={false}
        onEdit={jest.fn()}
        onDelete={jest.fn()}
      />
    );
    expect(screen.getByText("No upcoming leave.")).toBeInTheDocument();
  });

  it("hides past entries (endDate before today) from the list", () => {
    const userWithPast: PublicUser = {
      ...alice,
      entries: [
        {
          id: "past",
          startDate: "2026-01-05",
          endDate: "2026-01-09",
          status: LeaveStatus.Approved,
          type: LeaveType.Holiday,
          notes: "Past holiday",
        },
      ],
    };
    render(
      <LeaveList
        user={userWithPast}
        bankHolidays={[]}
        isOwnProfile={true}
        onEdit={jest.fn()}
        onDelete={jest.fn()}
      />
    );
    // Past entry should not be visible; empty state should show
    expect(screen.queryByText("Past holiday")).toBeNull();
    expect(screen.getByText("No upcoming leave.")).toBeInTheDocument();
  });
});

describe("LeaveList — headings", () => {
  it("shows 'Upcoming Leave' heading for own profile", () => {
    render(
      <LeaveList
        user={alice}
        bankHolidays={[]}
        isOwnProfile={true}
        onEdit={jest.fn()}
        onDelete={jest.fn()}
      />
    );
    expect(screen.getByText("Upcoming Leave")).toBeInTheDocument();
  });

  it("shows the other user's first name + possessive in the heading", () => {
    render(
      <LeaveList
        user={alice}
        bankHolidays={[]}
        isOwnProfile={false}
        onEdit={jest.fn()}
        onDelete={jest.fn()}
      />
    );
    expect(screen.getByText("Alice\u2019s Leave")).toBeInTheDocument();
  });
});

describe("LeaveList — add button", () => {
  it("does not show an Add button (it was moved to CalendarView)", () => {
    render(
      <LeaveList
        user={alice}
        bankHolidays={[]}
        isOwnProfile={true}
        onEdit={jest.fn()}
        onDelete={jest.fn()}
      />
    );
    expect(screen.queryByRole("button", { name: /add/i })).toBeNull();
  });
});

describe("LeaveList — with entries", () => {
  // singleDayEntry ends 2026-03-20 (>= today 2026-03-15) → visible
  // entry ends 2026-03-13 (< today 2026-03-15) → filtered out as past leave
  const userWithUpcoming: PublicUser = { ...alice, entries: [singleDayEntry] };
  const userWithBoth: PublicUser = { ...alice, entries: [entry, singleDayEntry] };

  it("renders upcoming leave entry (endDate >= today)", () => {
    render(
      <LeaveList
        user={userWithUpcoming}
        bankHolidays={[]}
        isOwnProfile={true}
        onEdit={jest.fn()}
        onDelete={jest.fn()}
      />
    );
    expect(screen.getByText(/20 Mar/i)).toBeInTheDocument();
  });

  it("does not render a past entry (endDate < today)", () => {
    render(
      <LeaveList
        user={userWithBoth}
        bankHolidays={[]}
        isOwnProfile={true}
        onEdit={jest.fn()}
        onDelete={jest.fn()}
      />
    );
    // entry (ends 2026-03-13) should be filtered out
    expect(screen.queryByText(/9 Mar/i)).toBeNull();
    // singleDayEntry (ends 2026-03-20) should still show
    expect(screen.getByText(/20 Mar/i)).toBeInTheDocument();
  });

  it("shows the working day count for an entry", () => {
    render(
      <LeaveList
        user={userWithUpcoming}
        bankHolidays={[]}
        isOwnProfile={true}
        onEdit={jest.fn()}
        onDelete={jest.fn()}
      />
    );
    // singleDayEntry is 1 working day
    expect(screen.getByText("(1d)")).toBeInTheDocument();
  });

  it("shows a dash when notes are absent", () => {
    render(
      <LeaveList
        user={{ ...alice, entries: [singleDayEntry] }}
        bankHolidays={[]}
        isOwnProfile={true}
        onEdit={jest.fn()}
        onDelete={jest.fn()}
      />
    );
    expect(screen.getByText("–")).toBeInTheDocument();
  });

  it("shows notes when present (upcoming entry)", () => {
    const noteEntry: LeaveEntry = {
      id: "note",
      startDate: "2026-03-20",
      endDate: "2026-03-20",
      status: LeaveStatus.Approved,
      type: LeaveType.Holiday,
      notes: "Beach trip",
    };
    render(
      <LeaveList
        user={{ ...alice, entries: [noteEntry] }}
        bankHolidays={[]}
        isOwnProfile={true}
        onEdit={jest.fn()}
        onDelete={jest.fn()}
      />
    );
    expect(screen.getByText("Beach trip")).toBeInTheDocument();
  });

  it("shows the status label for an entry", () => {
    render(
      <LeaveList
        user={{ ...alice, entries: [singleDayEntry] }}
        bankHolidays={[]}
        isOwnProfile={true}
        onEdit={jest.fn()}
        onDelete={jest.fn()}
      />
    );
    expect(screen.getByText("Planned")).toBeInTheDocument();
  });

  it("shows Edit and Delete icon buttons for own profile entries", () => {
    render(
      <LeaveList
        user={userWithUpcoming}
        bankHolidays={[]}
        isOwnProfile={true}
        onEdit={jest.fn()}
        onDelete={jest.fn()}
      />
    );
    expect(screen.getAllByRole("button", { name: "Edit" })).toHaveLength(1);
    expect(screen.getAllByRole("button", { name: "Delete" })).toHaveLength(1);
  });

  it("hides Edit and Delete buttons for other user's entries", () => {
    render(
      <LeaveList
        user={userWithUpcoming}
        bankHolidays={[]}
        isOwnProfile={false}
        onEdit={jest.fn()}
        onDelete={jest.fn()}
      />
    );
    expect(screen.queryByRole("button", { name: "Edit" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Delete" })).toBeNull();
  });

  it("calls onEdit with the entry when the Edit button is clicked", async () => {
    const user = setup();
    const onEdit = jest.fn();
    render(
      <LeaveList
        user={{ ...alice, entries: [singleDayEntry] }}
        bankHolidays={[]}
        isOwnProfile={true}
        onEdit={onEdit}
        onDelete={jest.fn()}
      />
    );
    await user.click(screen.getByRole("button", { name: "Edit" }));
    expect(onEdit).toHaveBeenCalledWith(singleDayEntry);
  });

  it("calls onDelete with the entry id when the Delete button is clicked", async () => {
    const user = setup();
    const onDelete = jest.fn();
    render(
      <LeaveList
        user={{ ...alice, entries: [singleDayEntry] }}
        bankHolidays={[]}
        isOwnProfile={true}
        onEdit={jest.fn()}
        onDelete={onDelete}
      />
    );
    await user.click(screen.getByRole("button", { name: "Delete" }));
    expect(onDelete).toHaveBeenCalledWith(singleDayEntry.id);
  });

  it("deducts bank holidays from the working day count for an upcoming entry", () => {
    const upcomingFiveDay: LeaveEntry = {
      id: "five",
      startDate: "2026-03-16",
      endDate: "2026-03-20",
      status: LeaveStatus.Approved,
      type: LeaveType.Holiday,
    };
    render(
      <LeaveList
        user={{ ...alice, entries: [upcomingFiveDay] }}
        bankHolidays={[bh("2026-03-16")]} // Monday is a bank holiday
        isOwnProfile={true}
        onEdit={jest.fn()}
        onDelete={jest.fn()}
      />
    );
    // Mon–Fri minus 1 bank holiday = 4 working days
    expect(screen.getByText("(4d)")).toBeInTheDocument();
  });
});

describe("LeaveList — half-day entries", () => {
  const halfDayEntry: LeaveEntry = {
    id: "e3",
    startDate: "2026-03-20",
    endDate: "2026-03-20",
    status: LeaveStatus.Approved,
    type: LeaveType.Holiday,
    notes: "Dentist",
    duration: LeaveDuration.HalfMorning,
  };

  it("shows '(Half Day AM)' for an AM half-day entry", () => {
    render(
      <LeaveList
        user={{ ...alice, entries: [halfDayEntry] }}
        bankHolidays={[]}
        isOwnProfile={true}
        onEdit={jest.fn()}
        onDelete={jest.fn()}
      />
    );
    expect(screen.getByText("(Half Day AM)")).toBeInTheDocument();
  });

  it("appends (AM) to the reason for an AM half-day entry", () => {
    render(
      <LeaveList
        user={{ ...alice, entries: [halfDayEntry] }}
        bankHolidays={[]}
        isOwnProfile={true}
        onEdit={jest.fn()}
        onDelete={jest.fn()}
      />
    );
    expect(screen.getByText("Dentist (AM)")).toBeInTheDocument();
  });

  it("appends (PM) to the reason for a PM half-day entry", () => {
    const pmEntry: LeaveEntry = {
      ...halfDayEntry,
      id: "e4",
      duration: LeaveDuration.HalfAfternoon,
      notes: "Physio",
    };
    render(
      <LeaveList
        user={{ ...alice, entries: [pmEntry] }}
        bankHolidays={[]}
        isOwnProfile={true}
        onEdit={jest.fn()}
        onDelete={jest.fn()}
      />
    );
    expect(screen.getByText("Physio (PM)")).toBeInTheDocument();
  });

  it("also handles legacy halfDay/halfDayPeriod fields for backward compat", () => {
    const legacyEntry: LeaveEntry = {
      id: "e-legacy",
      startDate: "2026-03-20",
      endDate: "2026-03-20",
      status: LeaveStatus.Approved,
      type: LeaveType.Holiday,
      notes: "Old format",
      halfDay: true,
      halfDayPeriod: "am",
    };
    render(
      <LeaveList
        user={{ ...alice, entries: [legacyEntry] }}
        bankHolidays={[]}
        isOwnProfile={true}
        onEdit={jest.fn()}
        onDelete={jest.fn()}
      />
    );
    expect(screen.getByText("(Half Day AM)")).toBeInTheDocument();
    expect(screen.getByText("Old format (AM)")).toBeInTheDocument();
  });
});

describe("LeaveList — sick leave entries", () => {
  const sickEntry: LeaveEntry = {
    id: "e-sick",
    startDate: "2026-03-20",
    endDate: "2026-03-20",
    status: LeaveStatus.Approved,
    type: LeaveType.Sick,
    notes: "Cold",
  };

  it("shows sick leave entries in the list", () => {
    render(
      <LeaveList
        user={{ ...alice, entries: [sickEntry] }}
        bankHolidays={[]}
        isOwnProfile={true}
        onEdit={jest.fn()}
        onDelete={jest.fn()}
      />
    );
    expect(screen.getByText("Cold")).toBeInTheDocument();
  });

  it("shows 'Sick' label (not 'Approved') for a sick-leave entry", () => {
    render(
      <LeaveList
        user={{ ...alice, entries: [sickEntry] }}
        bankHolidays={[]}
        isOwnProfile={true}
        onEdit={jest.fn()}
        onDelete={jest.fn()}
      />
    );
    expect(screen.getByText("Sick")).toBeInTheDocument();
    expect(screen.queryByText("Approved")).toBeNull();
  });

  it("renders sick entry with red card styling (bg-red-100)", () => {
    const { container } = render(
      <LeaveList
        user={{ ...alice, entries: [sickEntry] }}
        bankHolidays={[]}
        isOwnProfile={true}
        onEdit={jest.fn()}
        onDelete={jest.fn()}
      />
    );
    expect(container.querySelector(".bg-red-100")).toBeInTheDocument();
  });
});
