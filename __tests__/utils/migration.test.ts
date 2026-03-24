import { migrateYearAllowance, migrateUsersAllowances } from "@/utils/migration";
import type { YearAllowance } from "@/types";

// ---------------------------------------------------------------------------
// migrateYearAllowance
// ---------------------------------------------------------------------------
describe("migrateYearAllowance", () => {
  it("adds id, startDate and endDate when all are missing", () => {
    const ya: YearAllowance = {
      year: 2025,
      company: "Acme",
      holidayStartMonth: 1,
      core: 25,
      bought: 0,
      carried: 0,
    };
    const result = migrateYearAllowance(ya);
    expect(result.id).toBeDefined();
    expect(result.startDate).toBe("2025-01-01");
    expect(result.endDate).toBe("2025-12-31");
  });

  it("derives the id from year, month and company", () => {
    const ya: YearAllowance = {
      year: 2026,
      company: "My Company",
      holidayStartMonth: 4,
      core: 25,
      bought: 0,
      carried: 0,
    };
    const result = migrateYearAllowance(ya);
    expect(result.id).toBe("ya-2026-4-my-company");
  });

  it("uses 'unknown' company slug when company is empty", () => {
    const ya: YearAllowance = {
      year: 2026,
      company: "",
      holidayStartMonth: 1,
      core: 25,
      bought: 0,
      carried: 0,
    };
    const result = migrateYearAllowance(ya);
    expect(result.id).toBe("ya-2026-1-unknown");
  });

  it("defaults holidayStartMonth to 1 when missing", () => {
    const ya = {
      year: 2026,
      company: "Acme",
      core: 25,
      bought: 0,
      carried: 0,
    } as YearAllowance;
    const result = migrateYearAllowance(ya);
    expect(result.startDate).toBe("2026-01-01");
    expect(result.endDate).toBe("2026-12-31");
    expect(result.id).toBe("ya-2026-1-acme");
  });

  it("preserves an existing id when already set", () => {
    const ya: YearAllowance = {
      id: "existing-id",
      year: 2025,
      company: "Acme",
      holidayStartMonth: 1,
      core: 25,
      bought: 0,
      carried: 0,
    };
    const result = migrateYearAllowance(ya);
    expect(result.id).toBe("existing-id");
  });

  it("preserves existing startDate and endDate when already set", () => {
    const ya: YearAllowance = {
      id: "existing-id",
      startDate: "2025-04-01",
      endDate: "2026-03-31",
      year: 2025,
      company: "Acme",
      holidayStartMonth: 4,
      core: 25,
      bought: 0,
      carried: 0,
    };
    const result = migrateYearAllowance(ya);
    expect(result.startDate).toBe("2025-04-01");
    expect(result.endDate).toBe("2026-03-31");
  });

  it("preserves all other fields unchanged", () => {
    const ya: YearAllowance = {
      year: 2025,
      company: "Acme",
      holidayStartMonth: 4,
      core: 20,
      bought: 3,
      carried: 2,
      active: false,
    };
    const result = migrateYearAllowance(ya);
    expect(result.core).toBe(20);
    expect(result.bought).toBe(3);
    expect(result.carried).toBe(2);
    expect(result.active).toBe(false);
    expect(result.company).toBe("Acme");
  });

  it("computes correct April-start dates", () => {
    const ya: YearAllowance = {
      year: 2025,
      company: "Acme",
      holidayStartMonth: 4,
      core: 25,
      bought: 0,
      carried: 0,
    };
    const result = migrateYearAllowance(ya);
    expect(result.startDate).toBe("2025-04-01");
    expect(result.endDate).toBe("2026-03-31");
  });
});

// ---------------------------------------------------------------------------
// migrateUsersAllowances
// ---------------------------------------------------------------------------
describe("migrateUsersAllowances", () => {
  const makeUser = (id: string, allowances: YearAllowance[]) => ({
    id,
    yearAllowances: allowances,
    password: "pw",
    profile: {
      firstName: "Test",
      lastName: "User",
      email: `${id}@example.com`,
      nonWorkingDays: [0, 6],
    },
    entries: [],
  });

  it("populates missing fields on all allowances", () => {
    const ya: YearAllowance = {
      year: 2025,
      company: "Acme",
      holidayStartMonth: 1,
      core: 25,
      bought: 0,
      carried: 0,
    };
    const users = [makeUser("u1", [ya])];
    const result = migrateUsersAllowances(users);
    expect(result[0].yearAllowances[0].id).toBeDefined();
    expect(result[0].yearAllowances[0].startDate).toBe("2025-01-01");
    expect(result[0].yearAllowances[0].endDate).toBe("2025-12-31");
  });

  it("returns the same user object reference when no migration was needed", () => {
    const ya: YearAllowance = {
      id: "existing-id",
      startDate: "2025-01-01",
      endDate: "2025-12-31",
      year: 2025,
      company: "Acme",
      holidayStartMonth: 1,
      core: 25,
      bought: 0,
      carried: 0,
    };
    const users = [makeUser("u1", [ya])];
    const result = migrateUsersAllowances(users);
    // Same reference — no new object was created
    expect(result[0]).toBe(users[0]);
  });

  it("returns a new user object when migration was needed", () => {
    const ya: YearAllowance = {
      year: 2025,
      company: "Acme",
      holidayStartMonth: 1,
      core: 25,
      bought: 0,
      carried: 0,
    };
    const users = [makeUser("u1", [ya])];
    const result = migrateUsersAllowances(users);
    expect(result[0]).not.toBe(users[0]);
  });

  it("migrates allowances across multiple users independently", () => {
    const ya1: YearAllowance = {
      year: 2025,
      company: "Acme",
      holidayStartMonth: 1,
      core: 25,
      bought: 0,
      carried: 0,
    };
    const ya2: YearAllowance = {
      id: "already-set",
      startDate: "2026-01-01",
      endDate: "2026-12-31",
      year: 2026,
      company: "Globex",
      holidayStartMonth: 1,
      core: 30,
      bought: 0,
      carried: 0,
    };
    const users = [makeUser("u1", [ya1]), makeUser("u2", [ya2])];
    const result = migrateUsersAllowances(users);
    expect(result[0].yearAllowances[0].id).toBeDefined();
    expect(result[1]).toBe(users[1]); // Already migrated — same reference
  });

  it("handles users with no allowances without error", () => {
    const users = [makeUser("u1", [])];
    const result = migrateUsersAllowances(users);
    expect(result[0].yearAllowances).toHaveLength(0);
  });
});
