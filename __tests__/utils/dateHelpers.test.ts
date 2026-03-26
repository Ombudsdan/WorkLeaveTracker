import {
  countWorkingDays,
  getHolidayYearBounds,
  getDaysInMonth,
  getFirstDayOfMonth,
  getEntryForDate,
  getEntriesForDate,
  isNonWorkingDay,
  toIsoDate,
  formatYearWindow,
  yearAllowanceDates,
  yearAllowancesOverlap,
  getLeaveDataBounds,
} from "@/utils/dateHelpers";
import { LeaveStatus, LeaveType } from "@/types";
import type { LeaveEntry, YearAllowance } from "@/types";

// ---------------------------------------------------------------------------
// countWorkingDays
// ---------------------------------------------------------------------------
describe("countWorkingDays", () => {
  // Mon-Fri working week, no bank holidays
  const weekdays = [0, 6]; // Sun + Sat are non-working
  const noBankHolidays: string[] = [];

  it("counts a single working day as 1", () => {
    expect(countWorkingDays("2026-01-05", "2026-01-05", weekdays, noBankHolidays)).toBe(1);
  });

  it("counts a full Mon–Fri week as 5", () => {
    expect(countWorkingDays("2026-01-05", "2026-01-09", weekdays, noBankHolidays)).toBe(5);
  });

  it("returns 0 for a single non-working day (Saturday)", () => {
    expect(countWorkingDays("2026-01-10", "2026-01-10", weekdays, noBankHolidays)).toBe(0);
  });

  it("returns 0 for a weekend range", () => {
    expect(countWorkingDays("2026-01-10", "2026-01-11", weekdays, noBankHolidays)).toBe(0);
  });

  it("excludes bank holidays that fall on working days", () => {
    // 2026-01-05 is a Monday; mark it as a bank holiday
    expect(countWorkingDays("2026-01-05", "2026-01-09", weekdays, ["2026-01-05"])).toBe(4);
  });

  it("does not double-exclude a bank holiday on a non-working day", () => {
    // 2026-01-10 is a Saturday (already non-working); bank holiday has no additional effect
    expect(countWorkingDays("2026-01-05", "2026-01-10", weekdays, ["2026-01-10"])).toBe(5);
  });

  it("returns 0 when all days are non-working", () => {
    // User has every day as non-working
    expect(
      countWorkingDays("2026-01-05", "2026-01-09", [0, 1, 2, 3, 4, 5, 6], noBankHolidays)
    ).toBe(0);
  });

  it("handles a multi-week range correctly", () => {
    // Jan 5–16 = two full Mon–Fri weeks = 10 days
    expect(countWorkingDays("2026-01-05", "2026-01-16", weekdays, noBankHolidays)).toBe(10);
  });

  it("handles same start and end date that is a bank holiday", () => {
    expect(countWorkingDays("2026-01-05", "2026-01-05", weekdays, ["2026-01-05"])).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// getHolidayYearBounds
// ---------------------------------------------------------------------------
describe("getHolidayYearBounds", () => {
  // We use a fixed "now" so tests don't depend on the real system date.
  // Jest fake timers let us do this cleanly.

  beforeEach(() => {
    // Fix the current date to 15 March 2026
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2026-03-15"));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("returns Jan 2026 – Dec 2026 when holiday year starts in January and current month is March", () => {
    const { start, end } = getHolidayYearBounds(1);
    expect(start.toISOString().slice(0, 10)).toBe("2026-01-01");
    expect(end.toISOString().slice(0, 10)).toBe("2026-12-31");
  });

  it("returns Apr 2025 – Mar 2026 when holiday year starts in April and current month is March", () => {
    // March is before April → we're in the previous holiday year
    const { start, end } = getHolidayYearBounds(4);
    expect(start.toISOString().slice(0, 10)).toBe("2025-04-01");
    expect(end.toISOString().slice(0, 10)).toBe("2026-03-31");
  });

  it("returns Apr 2026 – Mar 2027 when current month equals the start month", () => {
    jest.setSystemTime(new Date("2026-04-01"));
    const { start, end } = getHolidayYearBounds(4);
    expect(start.toISOString().slice(0, 10)).toBe("2026-04-01");
    expect(end.toISOString().slice(0, 10)).toBe("2027-03-31");
  });

  it("handles December start month", () => {
    jest.setSystemTime(new Date("2026-12-01"));
    const { start, end } = getHolidayYearBounds(12);
    expect(start.toISOString().slice(0, 10)).toBe("2026-12-01");
    expect(end.toISOString().slice(0, 10)).toBe("2027-11-30");
  });
});

// ---------------------------------------------------------------------------
// getDaysInMonth
// ---------------------------------------------------------------------------
describe("getDaysInMonth", () => {
  it("returns 31 for January", () => {
    expect(getDaysInMonth(2026, 0)).toBe(31);
  });

  it("returns 28 for February in a non-leap year", () => {
    expect(getDaysInMonth(2026, 1)).toBe(28);
  });

  it("returns 29 for February in a leap year", () => {
    expect(getDaysInMonth(2024, 1)).toBe(29);
  });

  it("returns 30 for April", () => {
    expect(getDaysInMonth(2026, 3)).toBe(30);
  });

  it("returns 31 for December", () => {
    expect(getDaysInMonth(2026, 11)).toBe(31);
  });
});

// ---------------------------------------------------------------------------
// getFirstDayOfMonth
// ---------------------------------------------------------------------------
describe("getFirstDayOfMonth", () => {
  it("returns 4 (Thursday) for January 2026", () => {
    expect(getFirstDayOfMonth(2026, 0)).toBe(4);
  });

  it("returns 0 (Sunday) for March 2026", () => {
    expect(getFirstDayOfMonth(2026, 2)).toBe(0);
  });

  it("returns 1 (Monday) for June 2026", () => {
    expect(getFirstDayOfMonth(2026, 5)).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// getEntryForDate
// ---------------------------------------------------------------------------
describe("getEntryForDate", () => {
  const entry: LeaveEntry = {
    id: "1",
    startDate: "2026-03-10",
    endDate: "2026-03-14",
    status: LeaveStatus.Approved,
    type: LeaveType.Holiday,
  };

  it("finds an entry when the date falls on startDate", () => {
    expect(getEntryForDate("2026-03-10", [entry])).toBe(entry);
  });

  it("finds an entry when the date falls on endDate", () => {
    expect(getEntryForDate("2026-03-14", [entry])).toBe(entry);
  });

  it("finds an entry for a date in the middle of the range", () => {
    expect(getEntryForDate("2026-03-12", [entry])).toBe(entry);
  });

  it("returns undefined for a date before the range", () => {
    expect(getEntryForDate("2026-03-09", [entry])).toBeUndefined();
  });

  it("returns undefined for a date after the range", () => {
    expect(getEntryForDate("2026-03-15", [entry])).toBeUndefined();
  });

  it("returns undefined for an empty entries array", () => {
    expect(getEntryForDate("2026-03-12", [])).toBeUndefined();
  });

  it("returns the first matching entry when ranges overlap", () => {
    const overlap: LeaveEntry = {
      id: "2",
      startDate: "2026-03-12",
      endDate: "2026-03-16",
      status: LeaveStatus.Planned,
      type: LeaveType.Holiday,
    };
    // entry covers 10-14, overlap covers 12-16; 12 is in both → first in array wins
    expect(getEntryForDate("2026-03-12", [entry, overlap])).toBe(entry);
  });
});

// ---------------------------------------------------------------------------
// getEntriesForDate
// ---------------------------------------------------------------------------
describe("getEntriesForDate", () => {
  const entry: LeaveEntry = {
    id: "1",
    startDate: "2026-03-10",
    endDate: "2026-03-14",
    status: LeaveStatus.Approved,
    type: LeaveType.Holiday,
  };

  const overlap: LeaveEntry = {
    id: "2",
    startDate: "2026-03-12",
    endDate: "2026-03-16",
    status: LeaveStatus.Planned,
    type: LeaveType.Holiday,
  };

  const thirdEntry: LeaveEntry = {
    id: "3",
    startDate: "2026-03-11",
    endDate: "2026-03-13",
    status: LeaveStatus.Requested,
    type: LeaveType.Holiday,
  };

  it("returns an empty array when no entries match", () => {
    expect(getEntriesForDate("2026-03-09", [entry])).toEqual([]);
  });

  it("returns a single-item array when exactly one entry covers the date", () => {
    expect(getEntriesForDate("2026-03-10", [entry])).toEqual([entry]);
  });

  it("returns both entries when two overlap on a date", () => {
    const result = getEntriesForDate("2026-03-12", [entry, overlap]);
    expect(result).toHaveLength(2);
    expect(result).toContain(entry);
    expect(result).toContain(overlap);
  });

  it("caps results at 2 even when 3 entries overlap on the same date", () => {
    const result = getEntriesForDate("2026-03-12", [entry, overlap, thirdEntry]);
    expect(result).toHaveLength(2);
  });

  it("returns an empty array for an empty entries array", () => {
    expect(getEntriesForDate("2026-03-12", [])).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// isNonWorkingDay
// ---------------------------------------------------------------------------
describe("isNonWorkingDay", () => {
  // 2026-01-04 = Sunday (0), 2026-01-05 = Monday (1)
  it("returns true when the day of week is in the non-working list", () => {
    expect(isNonWorkingDay("2026-01-04", [0, 6])).toBe(true); // Sunday
  });

  it("returns false when the day of week is not in the non-working list", () => {
    expect(isNonWorkingDay("2026-01-05", [0, 6])).toBe(false); // Monday
  });

  it("returns true when every day is non-working", () => {
    expect(isNonWorkingDay("2026-01-05", [0, 1, 2, 3, 4, 5, 6])).toBe(true);
  });

  it("returns false when the non-working list is empty", () => {
    expect(isNonWorkingDay("2026-01-04", [])).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// toIsoDate
// ---------------------------------------------------------------------------
describe("toIsoDate", () => {
  it("formats a Date as YYYY-MM-DD", () => {
    expect(toIsoDate(new Date("2026-03-15T12:00:00Z"))).toBe("2026-03-15");
  });

  it("handles start of year", () => {
    expect(toIsoDate(new Date("2026-01-01T00:00:00Z"))).toBe("2026-01-01");
  });

  it("handles end of year", () => {
    expect(toIsoDate(new Date("2026-12-31T23:59:59Z"))).toBe("2026-12-31");
  });
});

// ---------------------------------------------------------------------------
// getActiveYearAllowance
// ---------------------------------------------------------------------------
import { getActiveYearAllowance } from "@/utils/dateHelpers";
import type { YearAllowance } from "@/types";

// Fix "today" so tests are deterministic
const MARCH_2026 = new Date("2026-03-15");

describe("getActiveYearAllowance", () => {
  const ya2025: YearAllowance = {
    year: 2025,
    company: "Acme",
    holidayStartMonth: 1,
    core: 25,
    bought: 0,
    carried: 0,
  };
  const ya2026: YearAllowance = {
    year: 2026,
    company: "Acme",
    holidayStartMonth: 1,
    core: 25,
    bought: 0,
    carried: 0,
  };
  const ya2027: YearAllowance = {
    year: 2027,
    company: "Acme",
    holidayStartMonth: 1,
    core: 25,
    bought: 0,
    carried: 0,
  };

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(MARCH_2026);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("returns the allowance whose holiday year contains today", () => {
    const result = getActiveYearAllowance([ya2025, ya2026, ya2027]);
    expect(result?.year).toBe(2026);
  });

  it("returns undefined for an empty array", () => {
    expect(getActiveYearAllowance([])).toBeUndefined();
  });

  it("falls back to the most recent past allowance when no allowance contains today", () => {
    // Only a 2024 allowance exists; today is March 2026 → past, no exact match
    const ya2024: YearAllowance = {
      year: 2024,
      company: "Acme",
      holidayStartMonth: 1,
      core: 25,
      bought: 0,
      carried: 0,
    };
    const result = getActiveYearAllowance([ya2024]);
    expect(result?.year).toBe(2024);
  });

  it("falls back to the earliest future allowance when all are in the future", () => {
    // Only 2027+ allowances; today is March 2026 → all future
    const result = getActiveYearAllowance([ya2027]);
    expect(result?.year).toBe(2027);
  });

  it("prefers active allowances over inactive ones when both cover today", () => {
    // Two allowances for 2026: one inactive (came first) and one active
    const inactive2026: YearAllowance = { ...ya2026, company: "OldCo", active: false };
    const active2026: YearAllowance = { ...ya2026, company: "NewCo" };
    const result = getActiveYearAllowance([inactive2026, active2026]);
    expect(result?.company).toBe("NewCo");
  });

  it("returns the pre-configured next-year allowance when its start is within 60 days", () => {
    // Dan's scenario: today = Mar 15 2026; 2025 allowance (holidayStartMonth: 4) covers
    // Apr 2025–Apr 2026 which contains today, but the 2026 allowance has been set up in
    // advance and its start (Apr 1, 2026) is only ~17 days away — within the 60-day
    // lookahead — so the newer year should win WITHOUT needing any active: true flag.
    const ya2025April: YearAllowance = {
      year: 2025,
      company: "Test",
      holidayStartMonth: 4,
      core: 27,
      bought: 2,
      carried: 3,
    };
    const ya2026April: YearAllowance = {
      year: 2026,
      company: "Test",
      holidayStartMonth: 4,
      core: 27,
      bought: 2,
      carried: 4,
      // No active: true needed — the lookahead handles it
    };
    const result = getActiveYearAllowance([ya2025April, ya2026April]);
    expect(result?.year).toBe(2026);
  });

  it("does not prefer the next-year allowance when its start is more than 60 days away", () => {
    // Same April-start setup, but today is fixed to mid-January 2026 (76 days before
    // April 1) so the 2026 year is outside the 60-day lookahead window.
    jest.setSystemTime(new Date("2026-01-15"));
    const ya2025April: YearAllowance = {
      year: 2025,
      company: "Test",
      holidayStartMonth: 4,
      core: 27,
      bought: 2,
      carried: 3,
    };
    const ya2026April: YearAllowance = {
      year: 2026,
      company: "Test",
      holidayStartMonth: 4,
      core: 27,
      bought: 2,
      carried: 4,
    };
    // Jan 15 + 60 days = Mar 16, which is before Apr 1 → 2026 outside lookahead
    const result = getActiveYearAllowance([ya2025April, ya2026April]);
    expect(result?.year).toBe(2025);
  });

  it("falls back to an inactive allowance when no active one covers today", () => {
    // Only an inactive 2026 allowance exists; should still return it as a fallback
    const inactive2026: YearAllowance = { ...ya2026, company: "OldCo", active: false };
    const result = getActiveYearAllowance([inactive2026]);
    expect(result?.company).toBe("OldCo");
  });

  it("defaults holidayStartMonth to 1 when the field is missing in the primary loop (backward compat)", () => {
    // Simulate legacy data without holidayStartMonth — but year 2026 still matches today
    const legacy = {
      year: 2026,
      company: "Acme",
      core: 25,
      bought: 0,
      carried: 0,
    } as YearAllowance;
    const result = getActiveYearAllowance([legacy]);
    expect(result?.year).toBe(2026);
  });

  it("defaults holidayStartMonth to 1 in the fallback filter when the field is missing", () => {
    // Simulate legacy data where no entry matches today via primary loop
    // Use year 2024 so it falls into the "past fallback" path with undefined holidayStartMonth
    const legacy = {
      year: 2024,
      company: "Acme",
      core: 25,
      bought: 0,
      carried: 0,
    } as YearAllowance;
    const result = getActiveYearAllowance([legacy]);
    // Jan 2024 start, Jan 2025 end → today (Mar 2026) is past → falls back to most recent past
    expect(result?.year).toBe(2024);
  });
});

// ---------------------------------------------------------------------------
// formatYearWindow
// ---------------------------------------------------------------------------
describe("formatYearWindow", () => {
  it("formats a January-start window as 'D Jan YYYY – D Dec YYYY'", () => {
    const ya: YearAllowance = {
      year: 2026,
      company: "Acme",
      holidayStartMonth: 1,
      core: 25,
      bought: 0,
      carried: 0,
    };
    const result = formatYearWindow(ya);
    expect(result).toMatch(/1 Jan 2026/);
    expect(result).toMatch(/31 Dec 2026/);
  });

  it("formats an April-start window as 'D Apr YYYY – D Mar YYYY+1'", () => {
    const ya: YearAllowance = {
      year: 2025,
      company: "Acme",
      holidayStartMonth: 4,
      core: 25,
      bought: 0,
      carried: 0,
    };
    const result = formatYearWindow(ya);
    expect(result).toMatch(/1 Apr 2025/);
    expect(result).toMatch(/31 Mar 2026/);
  });

  it("defaults to January when holidayStartMonth is missing", () => {
    const ya = {
      year: 2026,
      company: "Acme",
      core: 25,
      bought: 0,
      carried: 0,
    } as YearAllowance;
    const result = formatYearWindow(ya);
    expect(result).toMatch(/1 Jan 2026/);
    expect(result).toMatch(/31 Dec 2026/);
  });
});

// ---------------------------------------------------------------------------
// yearAllowanceDates
// ---------------------------------------------------------------------------
describe("yearAllowanceDates", () => {
  it("returns 2026-01-01 to 2026-12-31 for year=2026, holidayStartMonth=1", () => {
    const { startDate, endDate } = yearAllowanceDates(2026, 1);
    expect(startDate).toBe("2026-01-01");
    expect(endDate).toBe("2026-12-31");
  });

  it("returns 2025-04-01 to 2026-03-31 for year=2025, holidayStartMonth=4", () => {
    const { startDate, endDate } = yearAllowanceDates(2025, 4);
    expect(startDate).toBe("2025-04-01");
    expect(endDate).toBe("2026-03-31");
  });

  it("returns 2025-12-01 to 2026-11-30 for year=2025, holidayStartMonth=12", () => {
    const { startDate, endDate } = yearAllowanceDates(2025, 12);
    expect(startDate).toBe("2025-12-01");
    expect(endDate).toBe("2026-11-30");
  });

  it("handles leap-year boundary correctly for February start", () => {
    // year=2024, holidayStartMonth=2 → 2024-02-01 to 2025-01-31
    const { startDate, endDate } = yearAllowanceDates(2024, 2);
    expect(startDate).toBe("2024-02-01");
    expect(endDate).toBe("2025-01-31");
  });
});

// ---------------------------------------------------------------------------
// yearAllowancesOverlap
// ---------------------------------------------------------------------------
describe("yearAllowancesOverlap", () => {
  it("returns true when ranges are identical", () => {
    expect(
      yearAllowancesOverlap(
        { startDate: "2026-01-01", endDate: "2026-12-31" },
        { startDate: "2026-01-01", endDate: "2026-12-31" }
      )
    ).toBe(true);
  });

  it("returns true when one range is completely inside the other", () => {
    expect(
      yearAllowancesOverlap(
        { startDate: "2026-01-01", endDate: "2026-12-31" },
        { startDate: "2026-06-01", endDate: "2026-09-30" }
      )
    ).toBe(true);
  });

  it("returns true when ranges partially overlap (b starts before a ends)", () => {
    expect(
      yearAllowancesOverlap(
        { startDate: "2026-01-01", endDate: "2026-06-30" },
        { startDate: "2026-06-01", endDate: "2026-12-31" }
      )
    ).toBe(true);
  });

  it("returns true when ranges share exactly one day", () => {
    expect(
      yearAllowancesOverlap(
        { startDate: "2026-01-01", endDate: "2026-06-30" },
        { startDate: "2026-06-30", endDate: "2026-12-31" }
      )
    ).toBe(true);
  });

  it("returns false when a ends the day before b starts", () => {
    expect(
      yearAllowancesOverlap(
        { startDate: "2026-01-01", endDate: "2026-06-29" },
        { startDate: "2026-06-30", endDate: "2026-12-31" }
      )
    ).toBe(false);
  });

  it("returns false when ranges are entirely non-overlapping (a before b)", () => {
    expect(
      yearAllowancesOverlap(
        { startDate: "2025-01-01", endDate: "2025-12-31" },
        { startDate: "2026-01-01", endDate: "2026-12-31" }
      )
    ).toBe(false);
  });

  it("returns false when ranges are entirely non-overlapping (b before a)", () => {
    expect(
      yearAllowancesOverlap(
        { startDate: "2026-01-01", endDate: "2026-12-31" },
        { startDate: "2025-01-01", endDate: "2025-12-31" }
      )
    ).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// getLeaveDataBounds
// ---------------------------------------------------------------------------
describe("getLeaveDataBounds", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2026-03-15")); // Sunday 15 March 2026
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("returns current month for both min and max when no users have data", () => {
    const result = getLeaveDataBounds([{ entries: [], yearAllowances: [] }]);
    expect(result.min).toEqual({ year: 2026, month: 2 }); // March
    expect(result.max).toEqual({ year: 2026, month: 2 }); // March
  });

  it("returns the earliest entry startDate as min", () => {
    const entries: LeaveEntry[] = [
      {
        id: "e1",
        startDate: "2025-06-10",
        endDate: "2025-06-14",
        status: LeaveStatus.Approved,
        type: LeaveType.Holiday,
      },
      {
        id: "e2",
        startDate: "2024-12-01",
        endDate: "2024-12-05",
        status: LeaveStatus.Approved,
        type: LeaveType.Holiday,
      },
    ];
    const result = getLeaveDataBounds([{ entries, yearAllowances: [] }]);
    expect(result.min).toEqual({ year: 2024, month: 11 }); // December 2024
  });

  it("returns the end of the latest year allowance as max", () => {
    const allowances: YearAllowance[] = [
      { year: 2026, company: "Acme", holidayStartMonth: 1, core: 25, bought: 0, carried: 0 },
      { year: 2027, company: "Acme", holidayStartMonth: 1, core: 25, bought: 0, carried: 0 },
    ];
    const result = getLeaveDataBounds([{ entries: [], yearAllowances: allowances }]);
    // End of year 2027 (holidayStartMonth=1) → December 31 2027 → month index 11
    expect(result.max).toEqual({ year: 2027, month: 11 });
  });

  it("handles an April-start allowance year correctly for max", () => {
    const allowances: YearAllowance[] = [
      { year: 2026, company: "Acme", holidayStartMonth: 4, core: 25, bought: 0, carried: 0 },
    ];
    const result = getLeaveDataBounds([{ entries: [], yearAllowances: allowances }]);
    // yearAllowanceDates(2026, 4) → endDate = 2027-03-31 → month index 2 (March)
    expect(result.max).toEqual({ year: 2027, month: 2 });
  });

  it("aggregates data across multiple users", () => {
    const user1 = {
      entries: [
        {
          id: "e1",
          startDate: "2024-11-01",
          endDate: "2024-11-05",
          status: LeaveStatus.Approved,
          type: LeaveType.Holiday,
        },
      ],
      yearAllowances: [
        { year: 2026, company: "Acme", holidayStartMonth: 1, core: 25, bought: 0, carried: 0 },
      ],
    };
    const user2 = {
      entries: [],
      yearAllowances: [
        { year: 2027, company: "Acme", holidayStartMonth: 1, core: 25, bought: 0, carried: 0 },
      ],
    };
    const result = getLeaveDataBounds([user1, user2]);
    expect(result.min).toEqual({ year: 2024, month: 10 }); // November 2024
    expect(result.max).toEqual({ year: 2027, month: 11 }); // December 2027
  });

  it("returns min = max when max would be before min", () => {
    // If somehow max is earlier than min (edge case), max is clamped to min
    jest.setSystemTime(new Date("2026-08-15"));
    const result = getLeaveDataBounds([{ entries: [], yearAllowances: [] }]);
    expect(result.min.year).toEqual(result.max.year);
    expect(result.min.month).toEqual(result.max.month);
  });

  it("falls back to current month for min when no entries exist", () => {
    const allowances: YearAllowance[] = [
      { year: 2026, company: "Acme", holidayStartMonth: 1, core: 25, bought: 0, carried: 0 },
    ];
    const result = getLeaveDataBounds([{ entries: [], yearAllowances: allowances }]);
    expect(result.min).toEqual({ year: 2026, month: 2 }); // March 2026 (today)
  });
});
