import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import SummaryCard from "@/components/dashboard/SummaryCard";
import { LeaveStatus, LeaveType } from "@/types";
import type { PublicUser } from "@/types";

function setup() {
  return userEvent.setup({ advanceTimers: jest.advanceTimersByTime.bind(jest) });
}

// Fix date so holiday year bounds are deterministic
beforeEach(() => {
  jest.useFakeTimers();
  jest.setSystemTime(new Date("2026-03-15"));
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
  },
  yearAllowances: [
    { year: 2026, company: "Acme", holidayStartMonth: 1, core: 25, bought: 0, carried: 0 },
  ],
  entries: [],
};

describe("SummaryCard — basic display", () => {
  it("renders the user's full name", () => {
    render(<SummaryCard user={alice} bankHolidays={[]} isOwnProfile={true} />);
    expect(screen.getByText("Alice Smith")).toBeInTheDocument();
  });

  it("shows the holiday year range", () => {
    render(<SummaryCard user={alice} bankHolidays={[]} isOwnProfile={true} />);
    // Holiday year Jan 2026 – Dec 2026
    expect(screen.getByText(/1 Jan 2026/)).toBeInTheDocument();
    expect(screen.getByText(/31 Dec 2026/)).toBeInTheDocument();
  });

  it("shows the total allowance in the breakdown", async () => {
    const user = setup();
    render(<SummaryCard user={alice} bankHolidays={[]} isOwnProfile={true} />);
    await user.click(screen.getByRole("button", { name: /view breakdown/i }));
    expect(screen.getByText("Total")).toBeInTheDocument();
  });

  it("shows the donut SVG always (not just in breakdown)", () => {
    const { container } = render(
      <SummaryCard user={alice} bankHolidays={[]} isOwnProfile={true} />
    );
    expect(container.querySelector("svg")).toBeInTheDocument();
  });

  it("shows the status key rows (Approved, Requested, Planned) by default", () => {
    render(<SummaryCard user={alice} bankHolidays={[]} isOwnProfile={true} />);
    expect(screen.getByText("Approved")).toBeInTheDocument();
    expect(screen.getByText("Requested")).toBeInTheDocument();
    expect(screen.getByText("Planned")).toBeInTheDocument();
  });

  it("does not show the Read-only badge for own profile", () => {
    render(<SummaryCard user={alice} bankHolidays={[]} isOwnProfile={true} />);
    expect(screen.queryByText("Read-only")).toBeNull();
  });

  it("shows the Read-only badge when isOwnProfile is false", () => {
    render(<SummaryCard user={alice} bankHolidays={[]} isOwnProfile={false} />);
    expect(screen.getByText("Read-only")).toBeInTheDocument();
  });
});

describe("SummaryCard — with approved entries", () => {
  const userWithEntries: PublicUser = {
    ...alice,
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

  it("counts 5 approved days for a Mon–Fri entry", () => {
    render(<SummaryCard user={userWithEntries} bankHolidays={[]} isOwnProfile={true} />);
    expect(screen.getAllByText("5 days").length).toBeGreaterThan(0);
  });

  it("shows the correct remaining days in the center of the donut (via SVG)", async () => {
    const { container } = render(
      <SummaryCard user={userWithEntries} bankHolidays={[]} isOwnProfile={true} />
    );
    const svg = container.querySelector("svg") as SVGElement;
    expect(svg).toBeInTheDocument();
    // The center text should contain the remaining days (20)
    expect(svg.textContent).toContain("20");
  });

  it("shows remaining days in the breakdown", async () => {
    const user = setup();
    render(<SummaryCard user={userWithEntries} bankHolidays={[]} isOwnProfile={true} />);
    await user.click(screen.getByRole("button", { name: /view breakdown/i }));
    // Both "Actual leave remaining" and "Planned leave remaining" show 20 days
    // (no bank holidays, no requested/planned leave) — at least one must show "20 days"
    expect(screen.getAllByText("20 days").length).toBeGreaterThanOrEqual(1);
  });
});

describe("SummaryCard — single-ring donut", () => {
  it("renders the SVG donut chart by default (no click required)", () => {
    const { container } = render(
      <SummaryCard user={alice} bankHolidays={[]} isOwnProfile={true} />
    );
    expect(container.querySelector("svg")).toBeInTheDocument();
  });

  it("shows remaining days in the donut center", () => {
    const { container } = render(
      <SummaryCard user={alice} bankHolidays={[]} isOwnProfile={true} />
    );
    const svgText = container.querySelector("svg")?.textContent;
    expect(svgText).toContain("25"); // 25 remaining when no entries
  });

  it("renders only one SVG ring (single circle track)", () => {
    const { container } = render(
      <SummaryCard user={alice} bankHolidays={[]} isOwnProfile={true} />
    );
    // Single ring: one track circle (gray) — only 1 circle element in the SVG
    const svg = container.querySelector("svg");
    expect(svg).toBeInTheDocument();
    const circles = svg!.querySelectorAll("circle");
    // There should be exactly 1 circle (the track; segments are paths when value > 0)
    expect(circles.length).toBe(1);
  });

  it("uses largeArc=1 when a segment spans more than half the ring (pct > 0.5)", () => {
    // approved = 14 out of 25 total → pct = 56% → arc = 201.6° > 180° → largeArc flag = 1
    // This means the path 'd' attribute will contain ' 1 1 ' (largeArcFlag=1, sweepFlag=1)
    const userWith14Days: PublicUser = {
      ...alice,
      entries: [
        {
          id: "e-large-arc",
          startDate: "2026-03-09",
          endDate: "2026-03-26", // Mon 9 → Thu 26: 14 working days
          status: LeaveStatus.Approved,
          type: LeaveType.Holiday,
        },
      ],
    };
    const { container } = render(
      <SummaryCard user={userWith14Days} bankHolidays={[]} isOwnProfile={true} />
    );
    const svg = container.querySelector("svg");
    expect(svg).toBeInTheDocument();
    // The arc path element should have largeArcFlag=1 in its 'd' attribute
    const paths = svg!.querySelectorAll("path");
    const hasLargeArc = Array.from(paths).some((p) => p.getAttribute("d")?.includes(" 1 1 "));
    expect(hasLargeArc).toBe(true);
  });
});

describe("SummaryCard — no year allowances (legacy/missing data)", () => {
  it("renders without error when user has no year allowances", () => {
    render(
      <SummaryCard user={{ ...alice, yearAllowances: [] }} bankHolidays={[]} isOwnProfile={true} />
    );
    // Just ensure it renders without throwing
    expect(screen.getByText("Alice Smith")).toBeInTheDocument();
  });
});

describe("SummaryCard — allowance breakdown toggle", () => {
  it("does not show Core Days initially", () => {
    render(<SummaryCard user={alice} bankHolidays={[]} isOwnProfile={true} />);
    expect(screen.queryByText("Core Days")).toBeNull();
  });

  it("shows Core Days after clicking 'View breakdown'", async () => {
    const user = setup();
    render(<SummaryCard user={alice} bankHolidays={[]} isOwnProfile={true} />);
    await user.click(screen.getByRole("button", { name: /view breakdown/i }));
    expect(screen.getByText("Core Days")).toBeInTheDocument();
  });

  it("shows Bought and Carried Over in the breakdown", async () => {
    const user = setup();
    render(<SummaryCard user={alice} bankHolidays={[]} isOwnProfile={true} />);
    await user.click(screen.getByRole("button", { name: /view breakdown/i }));
    expect(screen.getByText("Bought")).toBeInTheDocument();
    expect(screen.getByText("Carried Over")).toBeInTheDocument();
  });

  it("hides breakdown after clicking 'Hide breakdown'", async () => {
    const user = setup();
    render(<SummaryCard user={alice} bankHolidays={[]} isOwnProfile={true} />);
    await user.click(screen.getByRole("button", { name: /view breakdown/i }));
    expect(screen.getByText("Core Days")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /hide breakdown/i }));
    expect(screen.queryByText("Core Days")).toBeNull();
  });
});

describe("SummaryCard — breakdown Remaining row readability", () => {
  it("shows 'Planned leave remaining' in the breakdown with visible styling (text-gray-900)", async () => {
    const user = setup();
    render(<SummaryCard user={alice} bankHolidays={[]} isOwnProfile={true} />);
    await user.click(screen.getByRole("button", { name: /view breakdown/i }));
    const remaining = screen.getByText("Planned leave remaining");
    // Should have an explicit dark text colour class (text-gray-900 via the parent div)
    expect(remaining).toBeInTheDocument();
    const parentDiv = remaining.closest("div");
    expect(parentDiv?.className).toContain("text-gray-900");
  });
});

describe("SummaryCard — donut uses total allowance as ring denominator", () => {
  it("does not fill the full ring when only some leave is used (gray track remains visible)", () => {
    // Alice has 25 days total, 5 approved — ring should show 5/25 = 20% colored
    // The gray track circle should still be present (not covered by a full-segment circle)
    const userWith5Days: PublicUser = {
      ...alice,
      entries: [
        {
          id: "e-test",
          startDate: "2026-03-09",
          endDate: "2026-03-13",
          status: LeaveStatus.Approved,
          type: LeaveType.Holiday,
        },
      ],
    };
    const { container } = render(
      <SummaryCard user={userWith5Days} bankHolidays={[]} isOwnProfile={true} />
    );
    const svg = container.querySelector("svg");
    expect(svg).toBeInTheDocument();
    // The track circle should be present; path segments should not fill 100%
    // (a full 100% segment renders as a circle, partial as a path)
    const paths = svg!.querySelectorAll("path");
    // 5/25 = 20%, so the approved segment is a path (< 100%)
    expect(paths.length).toBeGreaterThan(0);
  });

  it("renders a circle (not a path) when a single segment fills the entire ring (pct=1)", () => {
    // total allowance = 1, one approved day → pct = 1/1 = 1 → circle rendered
    const userAllUsed: PublicUser = {
      ...alice,
      yearAllowances: [
        { year: 2026, company: "Acme", holidayStartMonth: 1, core: 1, bought: 0, carried: 0 },
      ],
      entries: [
        {
          id: "e-full",
          startDate: "2026-03-09",
          endDate: "2026-03-09",
          status: LeaveStatus.Approved,
          type: LeaveType.Holiday,
        },
      ],
    };
    const { container } = render(
      <SummaryCard user={userAllUsed} bankHolidays={[]} isOwnProfile={true} />
    );
    const svg = container.querySelector("svg");
    expect(svg).toBeInTheDocument();
    // Two circles: the gray track + the 100%-segment circle
    const circles = svg!.querySelectorAll("circle");
    expect(circles.length).toBe(2);
  });
});

describe("SummaryCard — breakdown Remaining row colour when over-allocated", () => {
  it("shows text-red-600 on the 'Planned leave remaining' value when leave exceeds budget", async () => {
    const user = setup();
    // core=1, bought=0, carried=0 → total=1; two 1-day approved entries → used=2
    // remaining = 1 - 0 (BH) - 2 (approved) = -1 → red
    const overAllocated: PublicUser = {
      ...alice,
      yearAllowances: [
        { year: 2026, company: "Acme", holidayStartMonth: 1, core: 1, bought: 0, carried: 0 },
      ],
      entries: [
        {
          id: "ea",
          startDate: "2026-03-09",
          endDate: "2026-03-09",
          status: LeaveStatus.Approved,
          type: LeaveType.Holiday,
        },
        {
          id: "eb",
          startDate: "2026-03-10",
          endDate: "2026-03-10",
          status: LeaveStatus.Approved,
          type: LeaveType.Holiday,
        },
      ],
    };
    render(<SummaryCard user={overAllocated} bankHolidays={[]} isOwnProfile={true} />);
    await user.click(screen.getByRole("button", { name: /view breakdown/i }));
    // The "Planned leave remaining" value span should have the red colour class
    const remainingLabel = screen.getByText("Planned leave remaining");
    const row = remainingLabel.closest("div");
    const valueSpan = row?.querySelector("span:last-child");
    expect(valueSpan?.className).toContain("text-red-600");
  });

  it("shows text-red-600 on 'Actual leave remaining' when approved leave exceeds budget", async () => {
    const user = setup();
    // core=1, two approved days → actualRemaining = 1 - 0 - 2 = -1
    const overAllocated: PublicUser = {
      ...alice,
      yearAllowances: [
        { year: 2026, company: "Acme", holidayStartMonth: 1, core: 1, bought: 0, carried: 0 },
      ],
      entries: [
        {
          id: "ea",
          startDate: "2026-03-09",
          endDate: "2026-03-09",
          status: LeaveStatus.Approved,
          type: LeaveType.Holiday,
        },
        {
          id: "eb",
          startDate: "2026-03-10",
          endDate: "2026-03-10",
          status: LeaveStatus.Approved,
          type: LeaveType.Holiday,
        },
      ],
    };
    render(<SummaryCard user={overAllocated} bankHolidays={[]} isOwnProfile={true} />);
    await user.click(screen.getByRole("button", { name: /view breakdown/i }));
    const actualLabel = screen.getByText("Actual leave remaining");
    const row = actualLabel.closest("div");
    const valueSpan = row?.querySelector("span:last-child");
    expect(valueSpan?.className).toContain("text-red-600");
  });
});

describe("SummaryCard — bank holidays on working days in breakdown", () => {
  it("shows 'Bank holidays on working days' row in the breakdown", async () => {
    const user = setup();
    render(
      <SummaryCard
        user={alice}
        bankHolidays={[{ date: "2026-01-01", title: "New Year's Day" }]}
        isOwnProfile={true}
      />
    );
    await user.click(screen.getByRole("button", { name: /view breakdown/i }));
    expect(screen.getByText("Bank holidays on working days")).toBeInTheDocument();
  });

  it("shows count of 0 when no bank holidays fall on working days", async () => {
    const user = setup();
    // Saturday bank holiday — alice has nonWorkingDays [0, 6]
    render(
      <SummaryCard
        user={alice}
        bankHolidays={[{ date: "2026-01-03", title: "Saturday Holiday" }]}
        isOwnProfile={true}
      />
    );
    await user.click(screen.getByRole("button", { name: /view breakdown/i }));
    const row = screen.getByText("Bank holidays on working days").closest("div");
    expect(row?.querySelector("span:last-child")?.textContent).toBe("0");
  });

  it("shows plain count (no prefix) when bankHolidayHandling is None", async () => {
    const user = setup();
    // Thursday 2026-01-01 is a working day for alice
    render(
      <SummaryCard
        user={alice}
        bankHolidays={[
          { date: "2026-01-01", title: "New Year's Day" },
          { date: "2026-12-25", title: "Christmas Day" },
        ]}
        isOwnProfile={true}
      />
    );
    await user.click(screen.getByRole("button", { name: /view breakdown/i }));
    const row = screen.getByText("Bank holidays on working days").closest("div");
    expect(row?.querySelector("span:last-child")?.textContent).toBe("2");
  });

  it("shows '−N' prefix when bankHolidayHandling is Deduct", async () => {
    const user = setup();
    const userWithDeduct: PublicUser = {
      ...alice,
      yearAllowances: [
        {
          year: 2026,
          company: "Acme",
          holidayStartMonth: 1,
          core: 25,
          bought: 0,
          carried: 0,
          bankHolidayHandling: "deduct" as import("@/types").BankHolidayHandling,
        },
      ],
    };
    render(
      <SummaryCard
        user={userWithDeduct}
        bankHolidays={[{ date: "2026-01-01", title: "New Year's Day" }]}
        isOwnProfile={true}
      />
    );
    await user.click(screen.getByRole("button", { name: /view breakdown/i }));
    const row = screen.getByText("Bank holidays on working days").closest("div");
    expect(row?.querySelector("span:last-child")?.textContent).toBe("−1");
  });
});

describe("SummaryCard — Actual No. of Days row", () => {
  it("shows 'Actual No. of Days' row when bank holidays fall on working days", async () => {
    const user = setup();
    // Thursday 2026-01-01 is a working day for alice
    render(
      <SummaryCard
        user={alice}
        bankHolidays={[{ date: "2026-01-01", title: "New Year's Day" }]}
        isOwnProfile={true}
      />
    );
    await user.click(screen.getByRole("button", { name: /view breakdown/i }));
    expect(screen.getByText("Actual No. of Days")).toBeInTheDocument();
    const row = screen.getByText("Actual No. of Days").closest("div");
    // Alice: 25 core - 1 BH on working day = 24
    expect(row?.querySelector("span:last-child")?.textContent).toBe("24");
  });

  it("does NOT show 'Actual No. of Days' row when no bank holidays are on working days", async () => {
    const user = setup();
    // No bank holidays at all
    render(<SummaryCard user={alice} bankHolidays={[]} isOwnProfile={true} />);
    await user.click(screen.getByRole("button", { name: /view breakdown/i }));
    expect(screen.queryByText("Actual No. of Days")).toBeNull();
  });
});

describe("SummaryCard — breakdown two remaining rows", () => {
  it("shows both 'Actual leave remaining' and 'Planned leave remaining' rows", async () => {
    const user = setup();
    render(<SummaryCard user={alice} bankHolidays={[]} isOwnProfile={true} />);
    await user.click(screen.getByRole("button", { name: /view breakdown/i }));
    expect(screen.getByText("Actual leave remaining")).toBeInTheDocument();
    expect(screen.getByText("Planned leave remaining")).toBeInTheDocument();
  });

  it("'Actual leave remaining' shows effectiveTotal minus approved only", async () => {
    const user = setup();
    // alice: 25 core, 1 BH on working day → effectiveTotal=24; 5 approved days
    // actualRemaining = 24 - 5 = 19 days
    const userWith5Approved: PublicUser = {
      ...alice,
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
    render(
      <SummaryCard
        user={userWith5Approved}
        bankHolidays={[{ date: "2026-01-01", title: "New Year's Day" }]}
        isOwnProfile={true}
      />
    );
    await user.click(screen.getByRole("button", { name: /view breakdown/i }));
    const row = screen.getByText("Actual leave remaining").closest("div");
    expect(row?.querySelector("span:last-child")?.textContent).toBe("19 days");
  });

  it("'Planned leave remaining' shows effectiveTotal minus all statuses", async () => {
    const user = setup();
    // alice: 25 core, 1 BH on working day → effectiveTotal=24
    // 5 approved + 2 planned = 7 used; remaining = 24 - 7 = 17
    const userWithMixedLeave: PublicUser = {
      ...alice,
      entries: [
        {
          id: "e1",
          startDate: "2026-03-09",
          endDate: "2026-03-13",
          status: LeaveStatus.Approved,
          type: LeaveType.Holiday,
        },
        {
          id: "e2",
          startDate: "2026-04-07",
          endDate: "2026-04-08",
          status: LeaveStatus.Planned,
          type: LeaveType.Holiday,
        },
      ],
    };
    render(
      <SummaryCard
        user={userWithMixedLeave}
        bankHolidays={[{ date: "2026-01-01", title: "New Year's Day" }]}
        isOwnProfile={true}
      />
    );
    await user.click(screen.getByRole("button", { name: /view breakdown/i }));
    const row = screen.getByText("Planned leave remaining").closest("div");
    expect(row?.querySelector("span:last-child")?.textContent).toBe("17 days");
  });

  it("'Planned leave remaining' row has text-gray-900 styling (bold, final row)", async () => {
    const user = setup();
    render(<SummaryCard user={alice} bankHolidays={[]} isOwnProfile={true} />);
    await user.click(screen.getByRole("button", { name: /view breakdown/i }));
    const planned = screen.getByText("Planned leave remaining");
    const parentDiv = planned.closest("div");
    expect(parentDiv?.className).toContain("text-gray-900");
  });
});

// ---------------------------------------------------------------------------
// Sick-leave tab (feature flag behaviour)
// ---------------------------------------------------------------------------

describe("SummaryCard — sick-leave tab", () => {
  const userWithSick: PublicUser = {
    ...alice,
    entries: [
      {
        id: "s1",
        startDate: "2026-03-10",
        endDate: "2026-03-10",
        status: LeaveStatus.Approved,
        type: LeaveType.Sick,
        notes: "Cold",
      },
    ],
  };

  it("does NOT show the Holiday/Sick tab strip when the user has no sick entries (feature flag default off)", () => {
    render(<SummaryCard user={alice} bankHolidays={[]} isOwnProfile={true} />);
    expect(screen.queryByRole("tab", { name: "Sick" })).toBeNull();
  });

  it("does NOT show the Holiday/Sick tab strip even with sick entries when feature flag is off (default env)", () => {
    // NEXT_PUBLIC_ENABLE_FEATURE_SICK_LEAVE is not set in the test env → SICK_LEAVE_ENABLED = false
    render(<SummaryCard user={userWithSick} bankHolidays={[]} isOwnProfile={true} />);
    expect(screen.queryByRole("tab", { name: "Sick" })).toBeNull();
  });
});
