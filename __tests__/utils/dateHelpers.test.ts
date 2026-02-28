import {
  countWorkingDays,
  getHolidayYearBounds,
  getDaysInMonth,
  getFirstDayOfMonth,
  getEntryForDate,
  isNonWorkingDay,
  toIsoDate,
} from "@/utils/dateHelpers";
import { LeaveStatus, LeaveType } from "@/types";
import type { LeaveEntry } from "@/types";

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
