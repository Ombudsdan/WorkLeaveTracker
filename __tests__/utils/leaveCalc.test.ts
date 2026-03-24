import { calcLeaveSummary, calcMonthlyLeaveBreakdown } from "@/utils/leaveCalc";
import { LeaveStatus, LeaveType, LeaveDuration, BankHolidayHandling } from "@/types";
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
    email: "alice@example.com",
    nonWorkingDays: [0, 6], // Sat + Sun
  },
  yearAllowances: [
    { year: 2026, company: "Acme", holidayStartMonth: 1, core: 25, bought: 0, carried: 0 },
  ],
  entries: [],
};

describe("calcLeaveSummary — totals", () => {
  it("returns total as sum of core + bought + carried", () => {
    const user: PublicUser = {
      ...baseUser,
      yearAllowances: [
        { year: 2026, company: "Acme", holidayStartMonth: 1, core: 20, bought: 3, carried: 2 },
      ],
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
      yearAllowances: [
        { year: 2026, company: "Acme", holidayStartMonth: 1, core: 1, bought: 0, carried: 0 },
      ],
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

describe("calcLeaveSummary — no allowance configured", () => {
  it("returns 0 total when no yearAllowance is configured for the current year", () => {
    const user: PublicUser = { ...baseUser, yearAllowances: [] };
    const summary = calcLeaveSummary(user, []);
    expect(summary.total).toBe(0);
    expect(summary.remaining).toBe(0);
  });

  it("returns all zeros (early return) when yearAllowances is empty", () => {
    const user: PublicUser = { ...baseUser, yearAllowances: [] };
    const summary = calcLeaveSummary(user, []);
    expect(summary).toEqual({
      total: 0,
      approved: 0,
      requested: 0,
      planned: 0,
      used: 0,
      remaining: 0,
      bankHolidaysOnWorkingDays: 0,
    });
  });
});

describe("calcLeaveSummary — allowance without explicit holidayStartMonth", () => {
  it("uses January as the default holidayStartMonth when the field is missing", () => {
    // The allowance has no holidayStartMonth — the ?? 1 fallback should default to January.
    const user: PublicUser = {
      ...baseUser,
      yearAllowances: [
        {
          year: 2026,
          company: "Acme",
          // No holidayStartMonth — should default to 1 (January)
          holidayStartMonth: undefined as unknown as number,
          core: 20,
          bought: 0,
          carried: 0,
        },
      ],
      entries: [
        {
          id: "e-no-sm",
          startDate: "2026-03-09",
          endDate: "2026-03-13",
          status: LeaveStatus.Approved,
          type: LeaveType.Holiday,
        },
      ],
    };
    const { approved } = calcLeaveSummary(user, []);
    // Mon–Fri = 5 days, within Jan–Dec 2026
    expect(approved).toBe(5);
  });
});

describe("calcLeaveSummary — half-day entries count as 0.5", () => {
  it("counts an AM half-day approved entry as 0.5 days", () => {
    const user: PublicUser = {
      ...baseUser,
      entries: [
        {
          id: "hd1",
          startDate: "2026-03-09",
          endDate: "2026-03-09",
          status: LeaveStatus.Approved,
          type: LeaveType.Holiday,
          duration: LeaveDuration.HalfMorning,
        },
      ],
    };
    const { approved } = calcLeaveSummary(user, []);
    expect(approved).toBe(0.5);
  });

  it("counts a PM half-day planned entry as 0.5 days", () => {
    const user: PublicUser = {
      ...baseUser,
      entries: [
        {
          id: "hd2",
          startDate: "2026-03-09",
          endDate: "2026-03-09",
          status: LeaveStatus.Planned,
          type: LeaveType.Holiday,
          duration: LeaveDuration.HalfAfternoon,
        },
      ],
    };
    const { planned } = calcLeaveSummary(user, []);
    expect(planned).toBe(0.5);
  });
});

describe("calcLeaveSummary — bankHolidaysOnWorkingDays", () => {
  it("counts bank holidays on working days within the holiday year", () => {
    // Two bank holidays on working days (Mon/Tue = day 1/2) within Jan–Dec 2026
    const { bankHolidaysOnWorkingDays } = calcLeaveSummary(baseUser, [
      "2026-01-01", // Thursday (working day)
      "2026-12-25", // Friday (working day)
      "2026-12-26", // Saturday (non-working) — should NOT count
      "2025-12-26", // Outside holiday year — should NOT count
    ]);
    expect(bankHolidaysOnWorkingDays).toBe(2);
  });

  it("returns 0 bankHolidaysOnWorkingDays when no bank holidays provided", () => {
    const { bankHolidaysOnWorkingDays } = calcLeaveSummary(baseUser, []);
    expect(bankHolidaysOnWorkingDays).toBe(0);
  });

  it("returns 0 bankHolidaysOnWorkingDays when all bank holidays fall on non-working days", () => {
    // Saturday 2026-01-03 is a non-working day for alice (nonWorkingDays: [0, 6])
    const { bankHolidaysOnWorkingDays } = calcLeaveSummary(baseUser, ["2026-01-03"]);
    expect(bankHolidaysOnWorkingDays).toBe(0);
  });
});

describe("calcLeaveSummary — bankHolidayHandling", () => {
  it("does NOT reduce total when handling is None (default)", () => {
    const user: PublicUser = {
      ...baseUser,
      yearAllowances: [
        {
          year: 2026,
          company: "Acme",
          holidayStartMonth: 1,
          core: 26,
          bought: 0,
          carried: 0,
          bankHolidayHandling: BankHolidayHandling.None,
        },
      ],
    };
    // 4 bank holidays on working days (Mon–Fri)
    const summary = calcLeaveSummary(user, [
      "2026-01-01",
      "2026-04-03",
      "2026-12-25",
      "2026-12-28",
    ]);
    expect(summary.total).toBe(26);
    expect(summary.bankHolidaysOnWorkingDays).toBe(4);
  });

  it("does NOT reduce total when bankHolidayHandling is absent (backwards compatibility)", () => {
    const user: PublicUser = {
      ...baseUser,
      yearAllowances: [
        { year: 2026, company: "Acme", holidayStartMonth: 1, core: 26, bought: 0, carried: 0 },
      ],
    };
    const summary = calcLeaveSummary(user, ["2026-01-01", "2026-04-03"]);
    expect(summary.total).toBe(26);
    // remaining is NOT reduced by bank holidays when handling is absent
    expect(summary.remaining).toBe(26);
  });

  it("does NOT deduct bank holidays from remaining when handling is None", () => {
    // With handling=None: total stays raw, and remaining does NOT deduct bank holidays
    const user: PublicUser = {
      ...baseUser,
      yearAllowances: [
        {
          year: 2026,
          company: "Acme",
          holidayStartMonth: 1,
          core: 26,
          bought: 0,
          carried: 0,
          bankHolidayHandling: BankHolidayHandling.None,
        },
      ],
    };
    const summary = calcLeaveSummary(user, [
      "2026-01-01",
      "2026-04-03",
      "2026-12-25",
      "2026-12-28",
    ]);
    expect(summary.total).toBe(26); // raw total unchanged
    expect(summary.bankHolidaysOnWorkingDays).toBe(4);
    // remaining = 26 - 0 (bank holidays NOT deducted) - 0 (no leave used) = 26
    expect(summary.remaining).toBe(26);
  });

  it("total is always raw (not reduced) even when handling is Deduct", () => {
    // bankHolidayHandling=Deduct only affects UI display; total stays raw in LeaveSummary
    const user: PublicUser = {
      ...baseUser,
      yearAllowances: [
        {
          year: 2026,
          company: "Acme",
          holidayStartMonth: 1,
          core: 26,
          bought: 0,
          carried: 0,
          bankHolidayHandling: BankHolidayHandling.Deduct,
        },
      ],
    };
    // 4 bank holidays on working days → remaining = 26 - 4 = 22 (no leave used)
    const summary = calcLeaveSummary(user, [
      "2026-01-01",
      "2026-04-03",
      "2026-12-25",
      "2026-12-28",
    ]);
    expect(summary.total).toBe(26); // raw, not reduced
    expect(summary.bankHolidaysOnWorkingDays).toBe(4);
    expect(summary.remaining).toBe(22); // = 26 - 4 bank holidays
  });

  it("does not deduct bank holidays on non-working days even with Deduct handling", () => {
    const user: PublicUser = {
      ...baseUser,
      yearAllowances: [
        {
          year: 2026,
          company: "Acme",
          holidayStartMonth: 1,
          core: 26,
          bought: 0,
          carried: 0,
          bankHolidayHandling: BankHolidayHandling.Deduct,
        },
      ],
    };
    // Saturday bank holiday (nonWorkingDay) — should not be deducted
    const summary = calcLeaveSummary(user, ["2026-01-03"]); // Saturday
    expect(summary.total).toBe(26);
    expect(summary.bankHolidaysOnWorkingDays).toBe(0);
  });

  it("accounts for remaining correctly after bank holidays and leave usage", () => {
    // core=26, 4 bank holidays on working days, 5 approved leave days
    // remaining = 26 - 4 (bank holidays) - 5 (approved) = 17
    const user: PublicUser = {
      ...baseUser,
      yearAllowances: [
        {
          year: 2026,
          company: "Acme",
          holidayStartMonth: 1,
          core: 26,
          bought: 0,
          carried: 0,
          bankHolidayHandling: BankHolidayHandling.Deduct,
        },
      ],
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
    const summary = calcLeaveSummary(user, [
      "2026-01-01",
      "2026-04-03",
      "2026-12-25",
      "2026-12-28",
    ]);
    expect(summary.total).toBe(26); // raw total
    expect(summary.approved).toBe(5);
    expect(summary.remaining).toBe(17); // 26 - 4 bank holidays - 5 approved
  });
});

describe("calcLeaveSummary — forYearAllowance override", () => {
  it("uses the provided allowance instead of auto-detecting the active one", () => {
    // today = 2026-03-15 → active allowance would be 2026 (Jan–Dec 2026)
    // We override to the 2025 allowance (Jan–Dec 2025) and expect 2025 entries to be counted
    const ya2025 = {
      year: 2025,
      company: "Acme",
      holidayStartMonth: 1,
      core: 20,
      bought: 0,
      carried: 0,
    };
    const user: PublicUser = {
      ...baseUser,
      yearAllowances: [
        ya2025,
        { year: 2026, company: "Acme", holidayStartMonth: 1, core: 25, bought: 0, carried: 0 },
      ],
      entries: [
        {
          id: "e-2025",
          startDate: "2025-03-10",
          endDate: "2025-03-14",
          status: LeaveStatus.Approved,
          type: LeaveType.Holiday,
        },
      ],
    };
    const summary = calcLeaveSummary(user, [], ya2025);
    // The override ensures we use the 2025 window (total=20) and count the 2025 entry
    expect(summary.total).toBe(20);
    expect(summary.approved).toBe(5);
    expect(summary.remaining).toBe(15);
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// calcMonthlyLeaveBreakdown
// ──────────────────────────────────────────────────────────────────────────────

describe("calcMonthlyLeaveBreakdown — no allowance", () => {
  it("returns an empty array when the user has no yearAllowances", () => {
    const user: PublicUser = { ...baseUser, yearAllowances: [] };
    expect(calcMonthlyLeaveBreakdown(user, [])).toEqual([]);
  });
});

describe("calcMonthlyLeaveBreakdown — basic structure", () => {
  it("returns 12 months for a January-start year", () => {
    const result = calcMonthlyLeaveBreakdown(baseUser, []);
    expect(result).toHaveLength(12);
  });

  it("first month is January of the allowance year", () => {
    const result = calcMonthlyLeaveBreakdown(baseUser, []);
    expect(result[0].month).toBe(0); // January
    expect(result[0].year).toBe(2026);
  });

  it("last month is December of the allowance year", () => {
    const result = calcMonthlyLeaveBreakdown(baseUser, []);
    expect(result[11].month).toBe(11); // December
    expect(result[11].year).toBe(2026);
  });

  it("returns 12 months for an April-start year spanning two calendar years", () => {
    const user: PublicUser = {
      ...baseUser,
      yearAllowances: [
        { year: 2025, company: "Acme", holidayStartMonth: 4, core: 25, bought: 0, carried: 0 },
      ],
    };
    const result = calcMonthlyLeaveBreakdown(user, []);
    expect(result).toHaveLength(12);
    expect(result[0].month).toBe(3); // April (0-indexed)
    expect(result[0].year).toBe(2025);
    expect(result[11].month).toBe(2); // March (0-indexed)
    expect(result[11].year).toBe(2026);
  });
});

describe("calcMonthlyLeaveBreakdown — all zeros with no entries", () => {
  it("all months have 0 approved, requested, planned, bankHolidays when there are no entries", () => {
    const result = calcMonthlyLeaveBreakdown(baseUser, []);
    for (const m of result) {
      expect(m.approved).toBe(0);
      expect(m.requested).toBe(0);
      expect(m.planned).toBe(0);
      expect(m.bankHolidays).toBe(0);
      expect(m.totalCombined).toBe(0);
      expect(m.entries).toHaveLength(0);
    }
  });
});

describe("calcMonthlyLeaveBreakdown — entry bucketing", () => {
  it("places a Mon–Fri week of approved leave in the correct month", () => {
    const user: PublicUser = {
      ...baseUser,
      entries: [
        {
          id: "e1",
          startDate: "2026-03-09", // Monday
          endDate: "2026-03-13", // Friday
          status: LeaveStatus.Approved,
          type: LeaveType.Holiday,
        },
      ],
    };
    const result = calcMonthlyLeaveBreakdown(user, []);
    const march = result.find((m) => m.month === 2)!; // March = index 2
    expect(march.approved).toBe(5);
    expect(march.requested).toBe(0);
    expect(march.planned).toBe(0);
    expect(march.entries).toHaveLength(1);
  });

  it("puts a requested entry in the correct month", () => {
    const user: PublicUser = {
      ...baseUser,
      entries: [
        {
          id: "e2",
          startDate: "2026-06-01",
          endDate: "2026-06-02",
          status: LeaveStatus.Requested,
          type: LeaveType.Holiday,
        },
      ],
    };
    const result = calcMonthlyLeaveBreakdown(user, []);
    const june = result.find((m) => m.month === 5)!;
    expect(june.requested).toBe(2);
  });

  it("puts a planned entry in the correct month", () => {
    const user: PublicUser = {
      ...baseUser,
      entries: [
        {
          id: "e3",
          startDate: "2026-08-10",
          endDate: "2026-08-10",
          status: LeaveStatus.Planned,
          type: LeaveType.Holiday,
        },
      ],
    };
    const result = calcMonthlyLeaveBreakdown(user, []);
    const aug = result.find((m) => m.month === 7)!;
    expect(aug.planned).toBe(1);
  });
});

describe("calcMonthlyLeaveBreakdown — multi-month entry clipping", () => {
  it("splits a multi-month entry across the correct months", () => {
    // Entry spans 2 weeks covering the March/April boundary (Mon 23 Mar → Fri 3 Apr)
    const user: PublicUser = {
      ...baseUser,
      entries: [
        {
          id: "e-cross",
          startDate: "2026-03-23", // Monday
          endDate: "2026-04-03", // Friday
          status: LeaveStatus.Approved,
          type: LeaveType.Holiday,
        },
      ],
    };
    const result = calcMonthlyLeaveBreakdown(user, []);
    const march = result.find((m) => m.month === 2)!;
    const april = result.find((m) => m.month === 3)!;
    // 23–27 Mar = 5 days; 30–31 Mar = 2 days → 7 in March
    expect(march.approved).toBe(7);
    // 1–3 Apr = 3 days (Wed, Thu, Fri) → 3 in April
    expect(april.approved).toBe(3);
    // Both months include the entry
    expect(march.entries).toHaveLength(1);
    expect(april.entries).toHaveLength(1);
  });
});

describe("calcMonthlyLeaveBreakdown — half-day entries", () => {
  it("counts a half-day entry as 0.5 in its month", () => {
    const user: PublicUser = {
      ...baseUser,
      entries: [
        {
          id: "hd1",
          startDate: "2026-05-04",
          endDate: "2026-05-04",
          status: LeaveStatus.Approved,
          type: LeaveType.Holiday,
          duration: LeaveDuration.HalfMorning,
        },
      ],
    };
    const result = calcMonthlyLeaveBreakdown(user, []);
    const may = result.find((m) => m.month === 4)!;
    expect(may.approved).toBe(0.5);
  });
});

describe("calcMonthlyLeaveBreakdown — bank holidays", () => {
  it("counts bank holidays on working days in the correct month", () => {
    // 2026-05-04 is a Monday (working day)
    const result = calcMonthlyLeaveBreakdown(baseUser, ["2026-05-04"]);
    const may = result.find((m) => m.month === 4)!;
    expect(may.bankHolidays).toBe(1);
    expect(may.totalCombined).toBe(1);
  });

  it("does not count bank holidays on non-working days", () => {
    // Saturday 2026-05-02
    const result = calcMonthlyLeaveBreakdown(baseUser, ["2026-05-02"]);
    const may = result.find((m) => m.month === 4)!;
    expect(may.bankHolidays).toBe(0);
  });

  it("does not count bank holidays outside the holiday year", () => {
    const result = calcMonthlyLeaveBreakdown(baseUser, ["2027-01-01"]);
    for (const m of result) {
      expect(m.bankHolidays).toBe(0);
    }
  });
});

describe("calcMonthlyLeaveBreakdown — totalCombined", () => {
  it("totalCombined = approved + requested + planned + bankHolidays", () => {
    const user: PublicUser = {
      ...baseUser,
      entries: [
        {
          id: "e-combo",
          startDate: "2026-03-09",
          endDate: "2026-03-10",
          status: LeaveStatus.Approved,
          type: LeaveType.Holiday,
        },
      ],
    };
    // Bank holiday on working day in March
    const result = calcMonthlyLeaveBreakdown(user, ["2026-03-16"]);
    const march = result.find((m) => m.month === 2)!;
    expect(march.totalCombined).toBe(
      march.approved + march.requested + march.planned + march.bankHolidays
    );
  });
});

describe("calcMonthlyLeaveBreakdown — sick leave in entries list", () => {
  it("includes sick leave in m.entries but does not count it in bar stats", () => {
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
    const result = calcMonthlyLeaveBreakdown(user, []);
    const march = result.find((m) => m.month === 2)!;
    // Sick entry IS included in the entries list (for the accordion)
    expect(march.entries).toHaveLength(1);
    // But NOT counted in the bar stats
    expect(march.approved).toBe(0);
    expect(march.totalCombined).toBe(0);
  });
});

describe("calcMonthlyLeaveBreakdown — forYearAllowance override", () => {
  it("uses the provided allowance when forYearAllowance is specified", () => {
    const ya2025 = {
      year: 2025,
      company: "Acme",
      holidayStartMonth: 1,
      core: 20,
      bought: 0,
      carried: 0,
    };
    const user: PublicUser = {
      ...baseUser,
      yearAllowances: [
        ya2025,
        { year: 2026, company: "Acme", holidayStartMonth: 1, core: 25, bought: 0, carried: 0 },
      ],
      entries: [
        {
          id: "e-2025",
          startDate: "2025-06-02",
          endDate: "2025-06-06",
          status: LeaveStatus.Approved,
          type: LeaveType.Holiday,
        },
      ],
    };
    const result = calcMonthlyLeaveBreakdown(user, [], ya2025);
    expect(result).toHaveLength(12);
    expect(result[0].year).toBe(2025);
    const june = result.find((m) => m.month === 5)!;
    expect(june.approved).toBe(5);
  });
});

describe("calcMonthlyLeaveBreakdown — missing holidayStartMonth fallback", () => {
  it("defaults to January when holidayStartMonth is missing", () => {
    const user: PublicUser = {
      ...baseUser,
      yearAllowances: [
        {
          year: 2026,
          company: "Acme",
          holidayStartMonth: undefined as unknown as number,
          core: 25,
          bought: 0,
          carried: 0,
        },
      ],
    };
    const result = calcMonthlyLeaveBreakdown(user, []);
    // Falls back to month=1 (January) so first element should be January 2026
    expect(result[0].month).toBe(0);
    expect(result[0].year).toBe(2026);
  });
});

describe("calcMonthlyLeaveBreakdown — sick leave entries included in list", () => {
  it("includes sick leave entries in m.entries but not in bar counts", () => {
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
    const result = calcMonthlyLeaveBreakdown(user, []);
    const march = result.find((m) => m.month === 2)!;
    // Sick entry is included in the entries list
    expect(march.entries).toHaveLength(1);
    // But not counted in the bar stats
    expect(march.approved).toBe(0);
    expect(march.totalCombined).toBe(0);
  });
});
