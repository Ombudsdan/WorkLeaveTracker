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
  it("shows 'No leave entries yet.' for own empty list", () => {
    render(
      <LeaveList
        user={alice}
        bankHolidays={[]}
        isOwnProfile={true}
        onEdit={jest.fn()}
        onDelete={jest.fn()}
      />
    );
    expect(screen.getByText("No leave entries yet.")).toBeInTheDocument();
  });

  it("shows 'No leave entries.' for another user's empty list", () => {
    render(
      <LeaveList
        user={alice}
        bankHolidays={[]}
        isOwnProfile={false}
        onEdit={jest.fn()}
        onDelete={jest.fn()}
      />
    );
    expect(screen.getByText("No leave entries.")).toBeInTheDocument();
  });
});

describe("LeaveList — headings", () => {
  it("shows 'My Leave' heading for own profile", () => {
    render(
      <LeaveList
        user={alice}
        bankHolidays={[]}
        isOwnProfile={true}
        onEdit={jest.fn()}
        onDelete={jest.fn()}
      />
    );
    expect(screen.getByText("My Leave")).toBeInTheDocument();
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
  const userWithEntries: PublicUser = { ...alice, entries: [entry, singleDayEntry] };

  it("renders each leave entry", () => {
    render(
      <LeaveList
        user={userWithEntries}
        bankHolidays={[]}
        isOwnProfile={true}
        onEdit={jest.fn()}
        onDelete={jest.fn()}
      />
    );
    // entry spans 9–13 Mar; singleDayEntry is 20 Mar
    expect(screen.getByText(/9 Mar/i)).toBeInTheDocument();
    expect(screen.getByText(/20 Mar/i)).toBeInTheDocument();
  });

  it("shows the working day count for an entry", () => {
    render(
      <LeaveList
        user={userWithEntries}
        bankHolidays={[]}
        isOwnProfile={true}
        onEdit={jest.fn()}
        onDelete={jest.fn()}
      />
    );
    // Mon–Fri = 5 working days; shown as "(5d)"
    expect(screen.getByText("(5d)")).toBeInTheDocument();
  });

  it("shows notes when present", () => {
    render(
      <LeaveList
        user={userWithEntries}
        bankHolidays={[]}
        isOwnProfile={true}
        onEdit={jest.fn()}
        onDelete={jest.fn()}
      />
    );
    expect(screen.getByText("Beach trip")).toBeInTheDocument();
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

  it("shows the status label for an entry", () => {
    render(
      <LeaveList
        user={{ ...alice, entries: [entry] }}
        bankHolidays={[]}
        isOwnProfile={true}
        onEdit={jest.fn()}
        onDelete={jest.fn()}
      />
    );
    expect(screen.getByText("Approved")).toBeInTheDocument();
  });

  it("shows Edit and Delete icon buttons for own profile entries", () => {
    render(
      <LeaveList
        user={userWithEntries}
        bankHolidays={[]}
        isOwnProfile={true}
        onEdit={jest.fn()}
        onDelete={jest.fn()}
      />
    );
    expect(screen.getAllByRole("button", { name: "Edit" })).toHaveLength(2);
    expect(screen.getAllByRole("button", { name: "Delete" })).toHaveLength(2);
  });

  it("hides Edit and Delete buttons for other user's entries", () => {
    render(
      <LeaveList
        user={userWithEntries}
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
        user={{ ...alice, entries: [entry] }}
        bankHolidays={[]}
        isOwnProfile={true}
        onEdit={onEdit}
        onDelete={jest.fn()}
      />
    );
    await user.click(screen.getByRole("button", { name: "Edit" }));
    expect(onEdit).toHaveBeenCalledWith(entry);
  });

  it("calls onDelete with the entry id when the Delete button is clicked", async () => {
    const user = setup();
    const onDelete = jest.fn();
    render(
      <LeaveList
        user={{ ...alice, entries: [entry] }}
        bankHolidays={[]}
        isOwnProfile={true}
        onEdit={jest.fn()}
        onDelete={onDelete}
      />
    );
    await user.click(screen.getByRole("button", { name: "Delete" }));
    expect(onDelete).toHaveBeenCalledWith(entry.id);
  });

  it("deducts bank holidays from the working day count", () => {
    render(
      <LeaveList
        user={{ ...alice, entries: [entry] }}
        bankHolidays={[bh("2026-03-09")]} // Monday is a bank holiday
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
    startDate: "2026-03-09",
    endDate: "2026-03-09",
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
    const pmEntry: LeaveEntry = { ...halfDayEntry, id: "e4", duration: LeaveDuration.HalfAfternoon, notes: "Physio" };
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
      startDate: "2026-03-09",
      endDate: "2026-03-09",
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
    startDate: "2026-03-10",
    endDate: "2026-03-10",
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
