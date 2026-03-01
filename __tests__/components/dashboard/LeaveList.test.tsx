import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import LeaveList from "@/components/dashboard/LeaveList";
import { LeaveStatus, LeaveType } from "@/types";
import type { PublicUser, LeaveEntry } from "@/types";

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

const alice: PublicUser = {
  id: "u1",
  profile: {
    firstName: "Alice",
    lastName: "Smith",
    company: "Acme",
    email: "alice@example.com",
    nonWorkingDays: [0, 6],
    holidayStartMonth: 1,
  },
  yearAllowances: [{ year: 2026, core: 25, bought: 0, carried: 0 }],
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
        onAdd={jest.fn()}
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
        onAdd={jest.fn()}
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
        onAdd={jest.fn()}
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
        onAdd={jest.fn()}
        onEdit={jest.fn()}
        onDelete={jest.fn()}
      />
    );
    expect(screen.getByText("Alice\u2019s Leave")).toBeInTheDocument();
  });
});

describe("LeaveList — add button", () => {
  it("shows the + Add button for own profile", () => {
    render(
      <LeaveList
        user={alice}
        bankHolidays={[]}
        isOwnProfile={true}
        onAdd={jest.fn()}
        onEdit={jest.fn()}
        onDelete={jest.fn()}
      />
    );
    expect(screen.getByRole("button", { name: "+ Add" })).toBeInTheDocument();
  });

  it("hides the + Add button for other user's profile", () => {
    render(
      <LeaveList
        user={alice}
        bankHolidays={[]}
        isOwnProfile={false}
        onAdd={jest.fn()}
        onEdit={jest.fn()}
        onDelete={jest.fn()}
      />
    );
    expect(screen.queryByRole("button", { name: "+ Add" })).toBeNull();
  });

  it("calls onAdd when the + Add button is clicked", async () => {
    const user = setup();
    const onAdd = jest.fn();
    render(
      <LeaveList
        user={alice}
        bankHolidays={[]}
        isOwnProfile={true}
        onAdd={onAdd}
        onEdit={jest.fn()}
        onDelete={jest.fn()}
      />
    );
    await user.click(screen.getByRole("button", { name: "+ Add" }));
    expect(onAdd).toHaveBeenCalledTimes(1);
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
        onAdd={jest.fn()}
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
        onAdd={jest.fn()}
        onEdit={jest.fn()}
        onDelete={jest.fn()}
      />
    );
    // Mon–Fri = 5 working days; shown as "5d"
    expect(screen.getByText("5d")).toBeInTheDocument();
  });

  it("shows notes when present", () => {
    render(
      <LeaveList
        user={userWithEntries}
        bankHolidays={[]}
        isOwnProfile={true}
        onAdd={jest.fn()}
        onEdit={jest.fn()}
        onDelete={jest.fn()}
      />
    );
    expect(screen.getByText("Beach trip")).toBeInTheDocument();
  });

  it("shows Edit and Delete buttons for own profile entries", () => {
    render(
      <LeaveList
        user={userWithEntries}
        bankHolidays={[]}
        isOwnProfile={true}
        onAdd={jest.fn()}
        onEdit={jest.fn()}
        onDelete={jest.fn()}
      />
    );
    expect(screen.getAllByRole("button", { name: "Edit" })).toHaveLength(2);
    expect(screen.getAllByRole("button", { name: "Del" })).toHaveLength(2);
  });

  it("hides Edit and Delete buttons for other user's entries", () => {
    render(
      <LeaveList
        user={userWithEntries}
        bankHolidays={[]}
        isOwnProfile={false}
        onAdd={jest.fn()}
        onEdit={jest.fn()}
        onDelete={jest.fn()}
      />
    );
    expect(screen.queryByRole("button", { name: "Edit" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Del" })).toBeNull();
  });

  it("calls onEdit with the entry when the Edit button is clicked", async () => {
    const user = setup();
    const onEdit = jest.fn();
    render(
      <LeaveList
        user={{ ...alice, entries: [entry] }}
        bankHolidays={[]}
        isOwnProfile={true}
        onAdd={jest.fn()}
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
        onAdd={jest.fn()}
        onEdit={jest.fn()}
        onDelete={onDelete}
      />
    );
    await user.click(screen.getByRole("button", { name: "Del" }));
    expect(onDelete).toHaveBeenCalledWith(entry.id);
  });

  it("deducts bank holidays from the working day count", () => {
    render(
      <LeaveList
        user={{ ...alice, entries: [entry] }}
        bankHolidays={["2026-03-09"]} // Monday is a bank holiday
        isOwnProfile={true}
        onAdd={jest.fn()}
        onEdit={jest.fn()}
        onDelete={jest.fn()}
      />
    );
    // Mon–Fri minus 1 bank holiday = 4 working days
    expect(screen.getByText("4d")).toBeInTheDocument();
  });
});
