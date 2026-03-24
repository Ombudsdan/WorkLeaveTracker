import { findClashes, groupClashesIntoRanges } from "@/utils/clashFinder";
import { LeaveStatus, LeaveType, LeaveDuration } from "@/types";
import type { LeaveEntry } from "@/types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

let entryId = 0;
function makeEntry(
  startDate: string,
  endDate: string,
  status: LeaveStatus,
  type: LeaveType = LeaveType.Holiday
): LeaveEntry {
  return {
    id: `e${++entryId}`,
    startDate,
    endDate,
    status,
    type,
    duration: LeaveDuration.Full,
  };
}

const userA = { id: "u1", name: "Alice", entries: [] as LeaveEntry[] };
const userB = { id: "u2", name: "Bob", entries: [] as LeaveEntry[] };
const userC = { id: "u3", name: "Carol", entries: [] as LeaveEntry[] };

// ---------------------------------------------------------------------------
// findClashes
// ---------------------------------------------------------------------------

describe("findClashes — no clashes", () => {
  it("returns empty array when no users provided", () => {
    expect(findClashes([], "2026-03-01", "2026-03-31")).toEqual([]);
  });

  it("returns empty array when only one user has leave", () => {
    const users = [
      { ...userA, entries: [makeEntry("2026-03-10", "2026-03-12", LeaveStatus.Approved)] },
      { ...userB, entries: [] },
    ];
    expect(findClashes(users, "2026-03-01", "2026-03-31")).toEqual([]);
  });

  it("returns empty array when two users have non-overlapping leave", () => {
    const users = [
      { ...userA, entries: [makeEntry("2026-03-01", "2026-03-05", LeaveStatus.Approved)] },
      { ...userB, entries: [makeEntry("2026-03-10", "2026-03-12", LeaveStatus.Approved)] },
    ];
    expect(findClashes(users, "2026-03-01", "2026-03-31")).toEqual([]);
  });

  it("ignores Planned leave when checking for clashes", () => {
    const users = [
      { ...userA, entries: [makeEntry("2026-03-10", "2026-03-10", LeaveStatus.Planned)] },
      { ...userB, entries: [makeEntry("2026-03-10", "2026-03-10", LeaveStatus.Planned)] },
    ];
    expect(findClashes(users, "2026-03-01", "2026-03-31")).toEqual([]);
  });

  it("ignores Sick leave regardless of status", () => {
    const users = [
      {
        ...userA,
        entries: [makeEntry("2026-03-10", "2026-03-10", LeaveStatus.Approved, LeaveType.Sick)],
      },
      {
        ...userB,
        entries: [makeEntry("2026-03-10", "2026-03-10", LeaveStatus.Approved, LeaveType.Sick)],
      },
    ];
    expect(findClashes(users, "2026-03-01", "2026-03-31")).toEqual([]);
  });

  it("returns empty array when overlap is outside the scan window", () => {
    const users = [
      { ...userA, entries: [makeEntry("2026-04-01", "2026-04-05", LeaveStatus.Approved)] },
      { ...userB, entries: [makeEntry("2026-04-01", "2026-04-05", LeaveStatus.Approved)] },
    ];
    // Scan only March — overlap in April should not appear
    expect(findClashes(users, "2026-03-01", "2026-03-31")).toEqual([]);
  });
});

describe("findClashes — with clashes", () => {
  it("finds a single-day clash", () => {
    const users = [
      { ...userA, entries: [makeEntry("2026-03-10", "2026-03-10", LeaveStatus.Approved)] },
      { ...userB, entries: [makeEntry("2026-03-10", "2026-03-10", LeaveStatus.Requested)] },
    ];
    const clashes = findClashes(users, "2026-03-01", "2026-03-31");
    expect(clashes).toHaveLength(1);
    expect(clashes[0].date).toBe("2026-03-10");
    expect(clashes[0].users.map((u) => u.id).sort()).toEqual(["u1", "u2"]);
  });

  it("finds multiple-day clashes when entries overlap for several days", () => {
    const users = [
      { ...userA, entries: [makeEntry("2026-03-10", "2026-03-12", LeaveStatus.Approved)] },
      { ...userB, entries: [makeEntry("2026-03-11", "2026-03-13", LeaveStatus.Requested)] },
    ];
    const clashes = findClashes(users, "2026-03-01", "2026-03-31");
    // Overlap on 11th and 12th
    expect(clashes).toHaveLength(2);
    expect(clashes.map((c) => c.date)).toEqual(["2026-03-11", "2026-03-12"]);
  });

  it("detects a 3-way clash", () => {
    const users = [
      { ...userA, entries: [makeEntry("2026-03-15", "2026-03-15", LeaveStatus.Approved)] },
      { ...userB, entries: [makeEntry("2026-03-15", "2026-03-15", LeaveStatus.Approved)] },
      { ...userC, entries: [makeEntry("2026-03-15", "2026-03-15", LeaveStatus.Requested)] },
    ];
    const clashes = findClashes(users, "2026-03-01", "2026-03-31");
    expect(clashes).toHaveLength(1);
    expect(clashes[0].users).toHaveLength(3);
  });

  it("matches Approved leave correctly", () => {
    const users = [
      { ...userA, entries: [makeEntry("2026-03-05", "2026-03-05", LeaveStatus.Approved)] },
      { ...userB, entries: [makeEntry("2026-03-05", "2026-03-05", LeaveStatus.Approved)] },
    ];
    const clashes = findClashes(users, "2026-03-01", "2026-03-31");
    expect(clashes).toHaveLength(1);
  });

  it("matches Requested leave correctly", () => {
    const users = [
      { ...userA, entries: [makeEntry("2026-03-05", "2026-03-05", LeaveStatus.Requested)] },
      { ...userB, entries: [makeEntry("2026-03-05", "2026-03-05", LeaveStatus.Requested)] },
    ];
    const clashes = findClashes(users, "2026-03-01", "2026-03-31");
    expect(clashes).toHaveLength(1);
  });

  it("includes only the first matching entry per user per day", () => {
    // Two entries for userA on the same day
    const a1 = makeEntry("2026-03-05", "2026-03-05", LeaveStatus.Approved);
    const a2 = makeEntry("2026-03-05", "2026-03-05", LeaveStatus.Requested);
    const users = [
      { ...userA, entries: [a1, a2] },
      { ...userB, entries: [makeEntry("2026-03-05", "2026-03-05", LeaveStatus.Approved)] },
    ];
    const clashes = findClashes(users, "2026-03-01", "2026-03-31");
    expect(clashes).toHaveLength(1);
    // Only the first match per user is included
    const clashUserIds = clashes[0].users.map((u) => u.id);
    expect(clashUserIds.filter((id) => id === "u1")).toHaveLength(1);
  });

  it("only counts entries whose date range actually covers the clash date", () => {
    const users = [
      { ...userA, entries: [makeEntry("2026-03-01", "2026-03-05", LeaveStatus.Approved)] },
      { ...userB, entries: [makeEntry("2026-03-06", "2026-03-10", LeaveStatus.Approved)] },
    ];
    // No overlap — they're consecutive but not shared
    expect(findClashes(users, "2026-03-01", "2026-03-31")).toHaveLength(0);
  });

  it("clashes at the boundary of the scan window are included", () => {
    const users = [
      { ...userA, entries: [makeEntry("2026-03-01", "2026-03-01", LeaveStatus.Approved)] },
      { ...userB, entries: [makeEntry("2026-03-01", "2026-03-01", LeaveStatus.Approved)] },
    ];
    const clashes = findClashes(users, "2026-03-01", "2026-03-31");
    expect(clashes[0].date).toBe("2026-03-01");
  });

  it("clashes on the last day of the scan window are included", () => {
    const users = [
      { ...userA, entries: [makeEntry("2026-03-31", "2026-03-31", LeaveStatus.Approved)] },
      { ...userB, entries: [makeEntry("2026-03-31", "2026-03-31", LeaveStatus.Approved)] },
    ];
    const clashes = findClashes(users, "2026-03-01", "2026-03-31");
    expect(clashes.map((c) => c.date)).toContain("2026-03-31");
  });

  it("returns results sorted ascending by date", () => {
    const users = [
      { ...userA, entries: [makeEntry("2026-03-01", "2026-03-20", LeaveStatus.Approved)] },
      { ...userB, entries: [makeEntry("2026-03-01", "2026-03-20", LeaveStatus.Approved)] },
    ];
    const clashes = findClashes(users, "2026-03-01", "2026-03-05");
    const dates = clashes.map((c) => c.date);
    expect(dates).toEqual([...dates].sort());
  });
});

// ---------------------------------------------------------------------------
// groupClashesIntoRanges
// ---------------------------------------------------------------------------

describe("groupClashesIntoRanges — empty input", () => {
  it("returns an empty array for empty input", () => {
    expect(groupClashesIntoRanges([])).toEqual([]);
  });
});

describe("groupClashesIntoRanges — single entry", () => {
  it("returns a single range for a single clash date", () => {
    const clashes = findClashes(
      [
        { ...userA, entries: [makeEntry("2026-03-10", "2026-03-10", LeaveStatus.Approved)] },
        { ...userB, entries: [makeEntry("2026-03-10", "2026-03-10", LeaveStatus.Approved)] },
      ],
      "2026-03-01",
      "2026-03-31"
    );
    const ranges = groupClashesIntoRanges(clashes);
    expect(ranges).toHaveLength(1);
    expect(ranges[0].startDate).toBe("2026-03-10");
    expect(ranges[0].endDate).toBe("2026-03-10");
    expect(ranges[0].userNames).toEqual(expect.arrayContaining(["Alice", "Bob"]));
  });
});

describe("groupClashesIntoRanges — merging consecutive dates", () => {
  it("merges consecutive clash days with the same users into one range", () => {
    const users = [
      { ...userA, entries: [makeEntry("2026-03-10", "2026-03-12", LeaveStatus.Approved)] },
      { ...userB, entries: [makeEntry("2026-03-10", "2026-03-12", LeaveStatus.Approved)] },
    ];
    const clashes = findClashes(users, "2026-03-01", "2026-03-31");
    const ranges = groupClashesIntoRanges(clashes);
    expect(ranges).toHaveLength(1);
    expect(ranges[0].startDate).toBe("2026-03-10");
    expect(ranges[0].endDate).toBe("2026-03-12");
  });

  it("creates two separate ranges when there is a gap between clashes", () => {
    const users = [
      {
        ...userA,
        entries: [
          makeEntry("2026-03-05", "2026-03-05", LeaveStatus.Approved),
          makeEntry("2026-03-10", "2026-03-10", LeaveStatus.Approved),
        ],
      },
      {
        ...userB,
        entries: [
          makeEntry("2026-03-05", "2026-03-05", LeaveStatus.Approved),
          makeEntry("2026-03-10", "2026-03-10", LeaveStatus.Approved),
        ],
      },
    ];
    const clashes = findClashes(users, "2026-03-01", "2026-03-31");
    const ranges = groupClashesIntoRanges(clashes);
    expect(ranges).toHaveLength(2);
    expect(ranges[0].startDate).toBe("2026-03-05");
    expect(ranges[1].startDate).toBe("2026-03-10");
  });

  it("creates separate ranges when the clashing users differ between days", () => {
    const users = [
      {
        ...userA,
        entries: [makeEntry("2026-03-05", "2026-03-06", LeaveStatus.Approved)],
      },
      {
        ...userB,
        entries: [makeEntry("2026-03-05", "2026-03-05", LeaveStatus.Approved)],
      },
      {
        ...userC,
        entries: [makeEntry("2026-03-06", "2026-03-06", LeaveStatus.Approved)],
      },
    ];
    const clashes = findClashes(users, "2026-03-01", "2026-03-31");
    const ranges = groupClashesIntoRanges(clashes);
    // Day 5: A+B, Day 6: A+C — different user sets, so 2 ranges
    expect(ranges).toHaveLength(2);
  });

  it("handles unsorted input by sorting before grouping", () => {
    // Construct two clash dates out of order
    const entry = makeEntry("2026-03-10", "2026-03-10", LeaveStatus.Approved);
    const clashes = [
      {
        date: "2026-03-12",
        users: [
          { id: "u1", name: "Alice", entry },
          { id: "u2", name: "Bob", entry },
        ],
      },
      {
        date: "2026-03-10",
        users: [
          { id: "u1", name: "Alice", entry },
          { id: "u2", name: "Bob", entry },
        ],
      },
      {
        date: "2026-03-11",
        users: [
          { id: "u1", name: "Alice", entry },
          { id: "u2", name: "Bob", entry },
        ],
      },
    ];
    const ranges = groupClashesIntoRanges(clashes);
    expect(ranges).toHaveLength(1);
    expect(ranges[0].startDate).toBe("2026-03-10");
    expect(ranges[0].endDate).toBe("2026-03-12");
  });
});
