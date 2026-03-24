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

// ---------------------------------------------------------------------------
// migrateConnectionsBidirectional
// ---------------------------------------------------------------------------
import { migrateConnectionsBidirectional } from "@/utils/migration";
import type { UserProfile } from "@/types";

function makeConnUser(id: string, pinnedUserIds: string[] = []) {
  return {
    id,
    profile: {
      firstName: id,
      lastName: "Test",
      email: `${id}@example.com`,
      nonWorkingDays: [],
      pinnedUserIds,
    } as UserProfile,
    yearAllowances: [],
    entries: [],
  };
}

describe("migrateConnectionsBidirectional", () => {
  it("returns same references when all connections are already bidirectional", () => {
    const a = makeConnUser("a", ["b"]);
    const b = makeConnUser("b", ["a"]);
    const result = migrateConnectionsBidirectional([a, b]);
    expect(result[0]).toBe(a);
    expect(result[1]).toBe(b);
  });

  it("adds missing reverse connection when A pins B but B does not pin A", () => {
    const a = makeConnUser("a", ["b"]);
    const b = makeConnUser("b", []);
    const result = migrateConnectionsBidirectional([a, b]);
    expect(result[0]).toBe(a); // A unchanged
    expect(result[1]).not.toBe(b); // B was updated
    expect(result[1].profile.pinnedUserIds).toContain("a");
  });

  it("fixes multiple asymmetric connections in one pass", () => {
    const a = makeConnUser("a", ["b", "c"]);
    const b = makeConnUser("b", []);
    const c = makeConnUser("c", []);
    const result = migrateConnectionsBidirectional([a, b, c]);
    expect(result[1].profile.pinnedUserIds).toContain("a");
    expect(result[2].profile.pinnedUserIds).toContain("a");
  });

  it("does not add a reverse connection when the target is not in the users list", () => {
    const a = makeConnUser("a", ["unknown"]);
    const result = migrateConnectionsBidirectional([a]);
    expect(result[0]).toBe(a); // unchanged
  });

  it("does not exceed the 3-connection cap when adding reverse connections", () => {
    const a = makeConnUser("a", ["b"]);
    const b = makeConnUser("b", ["x", "y", "z"]); // already at cap
    const result = migrateConnectionsBidirectional([a, b]);
    // B is at cap — A should not be added to B
    expect(result[1]).toBe(b);
    expect(result[1].profile.pinnedUserIds).not.toContain("a");
  });

  it("handles empty users array", () => {
    expect(migrateConnectionsBidirectional([])).toEqual([]);
  });

  it("handles users with no pinnedUserIds", () => {
    const a = makeConnUser("a");
    const result = migrateConnectionsBidirectional([a]);
    expect(result[0]).toBe(a);
  });
});
