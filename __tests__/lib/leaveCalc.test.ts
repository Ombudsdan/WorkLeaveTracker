import {
  countWorkingDays,
  getBankHolidaysForUser,
  getHolidayYearStart,
  getHolidayYearEnd,
  calculateLeaveSummary,
} from "@/lib/leaveCalc";
import { LeaveStatus, LeaveType } from "@/types";
import type { AppUser } from "@/types";

// Fix date to 15 March 2026 so year-boundary logic is deterministic
beforeEach(() => {
  jest.useFakeTimers();
  jest.setSystemTime(new Date("2026-03-15"));
});

afterEach(() => {
  jest.useRealTimers();
});

const baseUser: AppUser = {
  id: "u1",
  password: "$2b$10$hash",
  profile: {
    firstName: "Alice",
    lastName: "Smith",
    company: "Acme",
    email: "alice@example.com",
    nonWorkingDays: [0, 6], // Sat + Sun
    holidayStartMonth: 1,
  },
  yearAllowances: [{ year: 2026, core: 25, bought: 0, carried: 0 }],
  entries: [],
};

// ---------------------------------------------------------------------------
// countWorkingDays
// ---------------------------------------------------------------------------
describe("lib/leaveCalc countWorkingDays", () => {
  it("returns 5 for a Mon–Fri week with no bank holidays", () => {
    expect(countWorkingDays("2026-03-09", "2026-03-13", [0, 6], [])).toBe(5);
  });

  it("excludes a bank holiday on a working day", () => {
    expect(countWorkingDays("2026-03-09", "2026-03-13", [0, 6], ["2026-03-09"])).toBe(4);
  });

  it("returns 0 for a Saturday–Sunday range", () => {
    expect(countWorkingDays("2026-03-14", "2026-03-15", [0, 6], [])).toBe(0);
  });

  it("returns 0 when all days are non-working", () => {
    expect(countWorkingDays("2026-03-09", "2026-03-13", [0, 1, 2, 3, 4, 5, 6], [])).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// getHolidayYearStart
// ---------------------------------------------------------------------------
describe("getHolidayYearStart", () => {
  it("returns Jan 1 2026 when start month is 1 and current month is March", () => {
    const start = getHolidayYearStart(1);
    expect(start.toISOString().slice(0, 10)).toBe("2026-01-01");
  });

  it("returns Apr 1 2025 when start month is 4 and current month is March (before April)", () => {
    const start = getHolidayYearStart(4);
    expect(start.toISOString().slice(0, 10)).toBe("2025-04-01");
  });

  it("returns Apr 1 2026 when current month equals start month (April)", () => {
    jest.setSystemTime(new Date("2026-04-15"));
    const start = getHolidayYearStart(4);
    expect(start.toISOString().slice(0, 10)).toBe("2026-04-01");
  });
});

// ---------------------------------------------------------------------------
// getHolidayYearEnd
// ---------------------------------------------------------------------------
describe("getHolidayYearEnd", () => {
  it("returns Dec 31 2026 for a January start", () => {
    const end = getHolidayYearEnd(1);
    expect(end.toISOString().slice(0, 10)).toBe("2026-12-31");
  });

  it("returns Mar 31 2026 for an April start (previous year)", () => {
    const end = getHolidayYearEnd(4);
    expect(end.toISOString().slice(0, 10)).toBe("2026-03-31");
  });
});

// ---------------------------------------------------------------------------
// getBankHolidaysForUser
// ---------------------------------------------------------------------------
describe("getBankHolidaysForUser", () => {
  it("returns only bank holidays within the holiday year on working days", () => {
    const bhs = getBankHolidaysForUser(baseUser, [
      "2026-01-01", // Jan 1 = Thursday (working) → included
      "2026-12-25", // Dec 25 = Friday (working) → included
      "2025-12-26", // Previous year → excluded
      "2027-01-01", // Next year → excluded
    ]);
    expect(bhs).toContain("2026-01-01");
    expect(bhs).toContain("2026-12-25");
    expect(bhs).not.toContain("2025-12-26");
    expect(bhs).not.toContain("2027-01-01");
  });

  it("excludes bank holidays that fall on non-working days", () => {
    // 2026-01-03 = Saturday (non-working for baseUser)
    const bhs = getBankHolidaysForUser(baseUser, ["2026-01-03"]);
    expect(bhs).toHaveLength(0);
  });

  it("returns an empty array when given no bank holidays", () => {
    expect(getBankHolidaysForUser(baseUser, [])).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// calculateLeaveSummary
// ---------------------------------------------------------------------------
describe("calculateLeaveSummary", () => {
  it("returns all zeros with no entries", () => {
    const summary = calculateLeaveSummary(baseUser, []);
    expect(summary.totalAllowance).toBe(25);
    expect(summary.approved).toBe(0);
    expect(summary.requested).toBe(0);
    expect(summary.planned).toBe(0);
    expect(summary.usedTotal).toBe(0);
    expect(summary.remaining).toBe(25);
  });

  it("counts approved holiday entries correctly", () => {
    const user: AppUser = {
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
    const { approved, usedTotal, remaining } = calculateLeaveSummary(user, []);
    expect(approved).toBe(5);
    expect(usedTotal).toBe(5);
    expect(remaining).toBe(20);
  });

  it("counts requested entries separately from approved", () => {
    const user: AppUser = {
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
    const { requested, approved } = calculateLeaveSummary(user, []);
    expect(requested).toBe(2);
    expect(approved).toBe(0);
  });

  it("counts planned entries correctly", () => {
    const user: AppUser = {
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
    const { planned } = calculateLeaveSummary(user, []);
    expect(planned).toBe(1);
  });

  it("ignores non-holiday entries", () => {
    const user: AppUser = {
      ...baseUser,
      entries: [
        {
          id: "e4",
          startDate: "2026-03-09",
          endDate: "2026-03-13",
          status: LeaveStatus.Approved,
          type: LeaveType.Sick,
        },
      ],
    };
    const { usedTotal } = calculateLeaveSummary(user, []);
    expect(usedTotal).toBe(0);
  });

  it("deducts bank holidays from working days count", () => {
    const user: AppUser = {
      ...baseUser,
      entries: [
        {
          id: "e5",
          startDate: "2026-03-09",
          endDate: "2026-03-13",
          status: LeaveStatus.Approved,
          type: LeaveType.Holiday,
        },
      ],
    };
    const { approved } = calculateLeaveSummary(user, ["2026-03-09"]);
    expect(approved).toBe(4);
  });

  it("calculates totalAllowance from core + bought + carried", () => {
    const user: AppUser = {
      ...baseUser,
      yearAllowances: [{ year: 2026, core: 20, bought: 3, carried: 2 }],
    };
    const { totalAllowance } = calculateLeaveSummary(user, []);
    expect(totalAllowance).toBe(25);
  });

  it("can return negative remaining when days exceed allowance", () => {
    const user: AppUser = {
      ...baseUser,
      yearAllowances: [{ year: 2026, core: 2, bought: 0, carried: 0 }],
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
    const { remaining } = calculateLeaveSummary(user, []);
    expect(remaining).toBe(-3);
  });

  it("returns 0 totalAllowance when no yearAllowance configured for current year", () => {
    const user: AppUser = { ...baseUser, yearAllowances: [] };
    const { totalAllowance } = calculateLeaveSummary(user, []);
    expect(totalAllowance).toBe(0);
  });
});
