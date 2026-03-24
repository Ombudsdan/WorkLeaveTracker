import { render, screen } from "@testing-library/react";
import ClashSummary from "@/components/connections/ClashSummary";
import { LeaveStatus, LeaveType, LeaveDuration } from "@/types";
import type { PublicUser } from "@/types";

// Fix today so tests are deterministic
beforeEach(() => {
  jest.useFakeTimers();
  jest.setSystemTime(new Date("2026-03-15")); // Sunday 15 March 2026
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
    nonWorkingDays: [0, 6],
    pinnedUserIds: ["u2"],
  },
  yearAllowances: [],
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

describe("ClashSummary — no connections", () => {
  it("shows a prompt to add connections when pinnedUsers is empty", () => {
    render(<ClashSummary currentUser={alice} pinnedUsers={[]} bankHolidays={[]} />);
    expect(
      screen.getByText(/add connections to see upcoming leave clashes/i)
    ).toBeInTheDocument();
  });

  it("renders the 'Clash Summary' heading", () => {
    render(<ClashSummary currentUser={alice} pinnedUsers={[]} bankHolidays={[]} />);
    expect(screen.getByText("Clash Summary")).toBeInTheDocument();
  });
});

describe("ClashSummary — no upcoming clashes", () => {
  it("shows a no-clashes message when there are connections but no overlapping leave", () => {
    render(<ClashSummary currentUser={alice} pinnedUsers={[bob]} bankHolidays={[]} />);
    expect(screen.getByText(/no upcoming leave clashes/i)).toBeInTheDocument();
  });

  it("mentions the lookAheadDays in the no-clashes message", () => {
    render(
      <ClashSummary
        currentUser={alice}
        pinnedUsers={[bob]}
        bankHolidays={[]}
        lookAheadDays={30}
      />
    );
    expect(screen.getByText(/30 days/i)).toBeInTheDocument();
  });

  it("uses default lookAheadDays of 90 in the no-clashes message", () => {
    render(<ClashSummary currentUser={alice} pinnedUsers={[bob]} bankHolidays={[]} />);
    expect(screen.getByText(/90 days/i)).toBeInTheDocument();
  });
});

describe("ClashSummary — with upcoming clashes", () => {
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

  it("renders a clash entry for an overlapping date", () => {
    render(
      <ClashSummary
        currentUser={aliceWithLeave}
        pinnedUsers={[bobWithLeave]}
        bankHolidays={[]}
      />
    );
    // Should show something about being off on 20 Mar
    expect(screen.getByText(/20 Mar 2026/i)).toBeInTheDocument();
  });

  it("shows 'You and Bob are both off' for a clash", () => {
    render(
      <ClashSummary
        currentUser={aliceWithLeave}
        pinnedUsers={[bobWithLeave]}
        bankHolidays={[]}
      />
    );
    expect(screen.getByText(/You and Bob are both off/i)).toBeInTheDocument();
  });

  it("merges consecutive clash dates into a single range entry", () => {
    const aliceMulti: PublicUser = {
      ...alice,
      entries: [
        {
          id: "e1",
          startDate: "2026-03-20",
          endDate: "2026-03-22",
          status: LeaveStatus.Approved,
          type: LeaveType.Holiday,
          duration: LeaveDuration.Full,
        },
      ],
    };
    const bobMulti: PublicUser = {
      ...bob,
      entries: [
        {
          id: "e2",
          startDate: "2026-03-20",
          endDate: "2026-03-22",
          status: LeaveStatus.Approved,
          type: LeaveType.Holiday,
          duration: LeaveDuration.Full,
        },
      ],
    };

    render(
      <ClashSummary
        currentUser={aliceMulti}
        pinnedUsers={[bobMulti]}
        bankHolidays={[]}
      />
    );

    // Should show a date range "20 Mar – 22 Mar 2026"
    expect(screen.getByText(/20 Mar/i)).toBeInTheDocument();
    expect(screen.getByText(/22 Mar 2026/i)).toBeInTheDocument();
  });

  it("does not show past clashes (before today)", () => {
    const alicePast: PublicUser = {
      ...alice,
      entries: [
        {
          id: "e1",
          startDate: "2026-03-01",
          endDate: "2026-03-05",
          status: LeaveStatus.Approved,
          type: LeaveType.Holiday,
          duration: LeaveDuration.Full,
        },
      ],
    };
    const bobPast: PublicUser = {
      ...bob,
      entries: [
        {
          id: "e2",
          startDate: "2026-03-01",
          endDate: "2026-03-05",
          status: LeaveStatus.Approved,
          type: LeaveType.Holiday,
          duration: LeaveDuration.Full,
        },
      ],
    };

    render(
      <ClashSummary
        currentUser={alicePast}
        pinnedUsers={[bobPast]}
        bankHolidays={[]}
      />
    );

    // The past clashes (before March 15) should not appear
    expect(screen.getByText(/no upcoming leave clashes/i)).toBeInTheDocument();
  });

  it("does not treat Planned leave as a clash", () => {
    const alicePlanned: PublicUser = {
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
    const bobPlanned: PublicUser = {
      ...bob,
      entries: [
        {
          id: "e2",
          startDate: "2026-03-20",
          endDate: "2026-03-20",
          status: LeaveStatus.Planned,
          type: LeaveType.Holiday,
          duration: LeaveDuration.Full,
        },
      ],
    };

    render(
      <ClashSummary
        currentUser={alicePlanned}
        pinnedUsers={[bobPlanned]}
        bankHolidays={[]}
      />
    );

    expect(screen.getByText(/no upcoming leave clashes/i)).toBeInTheDocument();
  });

  it("respects the lookAheadDays boundary and excludes far-future clashes", () => {
    // Leave in 91 days — beyond the default 90-day window
    const futureDate = new Date("2026-03-15");
    futureDate.setDate(futureDate.getDate() + 91);
    const futureDateStr = futureDate.toISOString().slice(0, 10);

    const aliceFuture: PublicUser = {
      ...alice,
      entries: [
        {
          id: "e1",
          startDate: futureDateStr,
          endDate: futureDateStr,
          status: LeaveStatus.Approved,
          type: LeaveType.Holiday,
          duration: LeaveDuration.Full,
        },
      ],
    };
    const bobFuture: PublicUser = {
      ...bob,
      entries: [
        {
          id: "e2",
          startDate: futureDateStr,
          endDate: futureDateStr,
          status: LeaveStatus.Approved,
          type: LeaveType.Holiday,
          duration: LeaveDuration.Full,
        },
      ],
    };

    render(
      <ClashSummary
        currentUser={aliceFuture}
        pinnedUsers={[bobFuture]}
        bankHolidays={[]}
        lookAheadDays={90}
      />
    );

    expect(screen.getByText(/no upcoming leave clashes/i)).toBeInTheDocument();
  });

  it("formats 3+ clashing users as 'You, Bob and Carol are both off'", () => {
    const carol: PublicUser = {
      id: "u3",
      profile: {
        firstName: "Carol",
        lastName: "Lee",
        email: "carol@example.com",
        nonWorkingDays: [0, 6],
        pinnedUserIds: [],
      },
      yearAllowances: [],
      entries: [
        {
          id: "e3",
          startDate: "2026-03-20",
          endDate: "2026-03-20",
          status: LeaveStatus.Approved,
          type: LeaveType.Holiday,
          duration: LeaveDuration.Full,
        },
      ],
    };

    const aliceLeave: PublicUser = {
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
    const bobLeave: PublicUser = {
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

    render(
      <ClashSummary
        currentUser={aliceLeave}
        pinnedUsers={[bobLeave, carol]}
        bankHolidays={[]}
      />
    );

    // 3-way clash: "You, Bob and Carol are both off"
    expect(screen.getByText(/You, Bob and Carol are both off/i)).toBeInTheDocument();
  });
});
