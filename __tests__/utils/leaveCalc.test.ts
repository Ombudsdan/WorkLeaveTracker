import { calcLeaveSummary } from "@/utils/leaveCalc";
import { LeaveStatus, LeaveType } from "@/types";
import type { PublicUser } from "@/types";

// Fix the current date so getHolidayYearBounds is deterministic
beforeEach(() => {
  jest.useFakeTimers();
  jest.setSystemTime(new Date("2026-03-15"));
});

afterEach(() => {
  jest.useRealTimers();
});

// Holiday year Jan–Dec 2026
const baseUser: PublicUser = {
  id: "u1",
  profile: {
    firstName: "Alice",
    lastName: "Smith",
    company: "Acme",
    email: "alice@example.com",
    nonWorkingDays: [0, 6], // Sat + Sun
    holidayStartMonth: 1,
  },
  allowance: { core: 25, bought: 0, carried: 0 },
  entries: [],
};

describe("calcLeaveSummary — totals", () => {
  it("returns total as sum of core + bought + carried", () => {
    const user: PublicUser = {
      ...baseUser,
      allowance: { core: 20, bought: 3, carried: 2 },
    };
    const { total } = calcLeaveSummary(user, []);
    expect(total).toBe(25);
  });

  it("returns all zeros when user has no entries", () => {
    const summary = calcLeaveSummary(baseUser, []);
    expect(summary.approved).toBe(0);
    expect(summary.requested).toBe(0);
    expect(summary.planned).toBe(0);
    expect(summary.used).toBe(0);
    expect(summary.remaining).toBe(25);
  });
});

describe("calcLeaveSummary — leave type filtering", () => {
  it("does not count sick leave in the summary", () => {
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
    const { used } = calcLeaveSummary(user, []);
    expect(used).toBe(0);
  });

  it("does not count 'other' type leave in the summary", () => {
    const user: PublicUser = {
      ...baseUser,
      entries: [
        {
          id: "o1",
          startDate: "2026-03-09",
          endDate: "2026-03-09",
          status: LeaveStatus.Approved,
          type: LeaveType.Other,
        },
      ],
    };
    const { used } = calcLeaveSummary(user, []);
    expect(used).toBe(0);
  });
});

describe("calcLeaveSummary — status bucketing", () => {
  it("counts Mon–Fri holiday as 5 approved days", () => {
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
    const summary = calcLeaveSummary(user, []);
    expect(summary.approved).toBe(5);
    expect(summary.requested).toBe(0);
    expect(summary.planned).toBe(0);
    expect(summary.used).toBe(5);
    expect(summary.remaining).toBe(20);
  });

  it("counts a requested entry correctly", () => {
    const user: PublicUser = {
      ...baseUser,
      entries: [
        {
          id: "e2",
          startDate: "2026-03-09",
          endDate: "2026-03-10",
          status: LeaveStatus.Requested,
          type: LeaveType.Holiday,
        },
      ],
    };
    const { requested } = calcLeaveSummary(user, []);
    expect(requested).toBe(2);
  });

  it("counts a planned entry correctly", () => {
    const user: PublicUser = {
      ...baseUser,
      entries: [
        {
          id: "e3",
          startDate: "2026-03-09",
          endDate: "2026-03-09",
          status: LeaveStatus.Planned,
          type: LeaveType.Holiday,
        },
      ],
    };
    const { planned } = calcLeaveSummary(user, []);
    expect(planned).toBe(1);
  });
});

describe("calcLeaveSummary — holiday year boundary filtering", () => {
  it("excludes entries that end before the holiday year starts", () => {
    // Holiday year = Jan–Dec 2026; entry is Dec 2025 → outside
    const user: PublicUser = {
      ...baseUser,
      entries: [
        {
          id: "e4",
          startDate: "2025-12-29",
          endDate: "2025-12-31",
          status: LeaveStatus.Approved,
          type: LeaveType.Holiday,
        },
      ],
    };
    const { approved } = calcLeaveSummary(user, []);
    expect(approved).toBe(0);
  });

  it("excludes entries that start after the holiday year ends", () => {
    const user: PublicUser = {
      ...baseUser,
      entries: [
        {
          id: "e5",
          startDate: "2027-01-04",
          endDate: "2027-01-08",
          status: LeaveStatus.Approved,
          type: LeaveType.Holiday,
        },
      ],
    };
    const { approved } = calcLeaveSummary(user, []);
    expect(approved).toBe(0);
  });
});

describe("calcLeaveSummary — bank holiday interaction", () => {
  it("excludes a bank holiday that falls on a working day", () => {
    // Mon–Fri week; Monday 2026-03-09 is a bank holiday
    const user: PublicUser = {
      ...baseUser,
      entries: [
        {
          id: "e6",
          startDate: "2026-03-09",
          endDate: "2026-03-13",
          status: LeaveStatus.Approved,
          type: LeaveType.Holiday,
        },
      ],
    };
    // bank holiday on the Monday → 4 working days instead of 5
    const { approved } = calcLeaveSummary(user, ["2026-03-09"]);
    expect(approved).toBe(4);
  });

  it("does NOT exclude a bank holiday that falls on a non-working day", () => {
    // Saturday bank holiday has no effect on working day count
    const user: PublicUser = {
      ...baseUser,
      entries: [
        {
          id: "e7",
          startDate: "2026-03-09",
          endDate: "2026-03-13",
          status: LeaveStatus.Approved,
          type: LeaveType.Holiday,
        },
      ],
    };
    const { approved } = calcLeaveSummary(user, ["2026-03-14"]); // Saturday
    expect(approved).toBe(5);
  });

  it("does NOT exclude a bank holiday outside the holiday year", () => {
    const user: PublicUser = {
      ...baseUser,
      entries: [
        {
          id: "e8",
          startDate: "2026-03-09",
          endDate: "2026-03-13",
          status: LeaveStatus.Approved,
          type: LeaveType.Holiday,
        },
      ],
    };
    const { approved } = calcLeaveSummary(user, ["2027-01-01"]);
    expect(approved).toBe(5);
  });
});

describe("calcLeaveSummary — remaining can go negative", () => {
  it("returns a negative remaining when used days exceed allowance", () => {
    const user: PublicUser = {
      ...baseUser,
      allowance: { core: 1, bought: 0, carried: 0 },
      entries: [
        {
          id: "e9",
          startDate: "2026-03-09",
          endDate: "2026-03-13", // 5 days
          status: LeaveStatus.Approved,
          type: LeaveType.Holiday,
        },
      ],
    };
    const { remaining } = calcLeaveSummary(user, []);
    expect(remaining).toBe(-4);
  });
});
