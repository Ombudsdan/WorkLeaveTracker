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
    // Leave window: Jan 2026 – Dec 2026 (shown as text when there is only one allowance)
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
    expect(screen.getByText("20 days")).toBeInTheDocument();
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
  it("shows Remaining in the breakdown with visible styling (text-gray-900)", async () => {
    const user = setup();
    render(<SummaryCard user={alice} bankHolidays={[]} isOwnProfile={true} />);
    await user.click(screen.getByRole("button", { name: /view breakdown/i }));
    const remaining = screen.getByText("Remaining");
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
  it("shows text-red-600 on the Remaining value when leave used exceeds total allowance", async () => {
    const user = setup();
    // core=1, bought=0, carried=0 → total=1; two 1-day approved entries → used=2, remaining=-1
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
    // The remaining value span should have the red colour class
    const remainingLabel = screen.getByText("Remaining");
    const row = remainingLabel.closest("div");
    const valueSpan = row?.querySelector("span:last-child");
    expect(valueSpan?.className).toContain("text-red-600");
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

// ---------------------------------------------------------------------------
// Leave window selector
// ---------------------------------------------------------------------------

describe("SummaryCard — leave window selector", () => {
  const multiWindowUser: PublicUser = {
    ...alice,
    yearAllowances: [
      { year: 2025, company: "Acme", holidayStartMonth: 1, core: 20, bought: 0, carried: 0 },
      { year: 2026, company: "Acme", holidayStartMonth: 1, core: 25, bought: 0, carried: 0 },
    ],
    entries: [
      {
        id: "e2025",
        startDate: "2025-03-10",
        endDate: "2025-03-13",
        status: LeaveStatus.Approved,
        type: LeaveType.Holiday,
      },
    ],
  };

  it("shows a 'Leave window:' label", () => {
    render(<SummaryCard user={alice} bankHolidays={[]} isOwnProfile={true} />);
    expect(screen.getByText(/leave window:/i)).toBeInTheDocument();
  });

  it("does not show the select when there is only one allowance", () => {
    render(<SummaryCard user={alice} bankHolidays={[]} isOwnProfile={true} />);
    expect(screen.queryByRole("combobox", { name: /select leave window/i })).toBeNull();
  });

  it("shows the select when there are multiple allowances", () => {
    render(<SummaryCard user={multiWindowUser} bankHolidays={[]} isOwnProfile={true} />);
    expect(screen.getByRole("combobox", { name: /select leave window/i })).toBeInTheDocument();
  });

  it("the select defaults to the active year", () => {
    render(<SummaryCard user={multiWindowUser} bankHolidays={[]} isOwnProfile={true} />);
    const select = screen.getByRole("combobox", { name: /select leave window/i });
    // Active year is 2026 (today = 2026-03-15)
    expect((select as HTMLSelectElement).value).toBe("2026");
  });

  it("switching the window updates the summary totals", async () => {
    const user = setup();
    const { container } = render(
      <SummaryCard user={multiWindowUser} bankHolidays={[]} isOwnProfile={true} />
    );
    const select = screen.getByRole("combobox", { name: /select leave window/i });
    // Switch to 2025
    await user.selectOptions(select, ["2025"]);
    // 2025 allowance: core=20, no entries in 2026 window → remaining=20 before 2025 entry
    // 2025 has 1 approved entry (Mon 10 – Thu 13 = 4 days), so remaining = 20 - 4 = 16
    const svg = container.querySelector("svg");
    expect(svg?.textContent).toContain("16");
  });

  it("switching the window updates the breakdown rows", async () => {
    const user = setup();
    render(<SummaryCard user={multiWindowUser} bankHolidays={[]} isOwnProfile={true} />);
    const select = screen.getByRole("combobox", { name: /select leave window/i });
    await user.selectOptions(select, ["2025"]);
    await user.click(screen.getByRole("button", { name: /view breakdown/i }));
    // 2025 core days = 20
    const coreRow = screen.getByText("Core Days").closest("div");
    expect(coreRow?.textContent).toContain("20");
  });

  it("resets to the active window when the user changes", () => {
    const { rerender } = render(
      <SummaryCard user={multiWindowUser} bankHolidays={[]} isOwnProfile={true} />
    );
    // Re-render with a different user (single allowance) — selectedYear resets
    const differentUser: PublicUser = {
      ...alice,
      id: "u2",
      yearAllowances: [
        { year: 2026, company: "Other", holidayStartMonth: 1, core: 30, bought: 0, carried: 0 },
      ],
    };
    rerender(<SummaryCard user={differentUser} bankHolidays={[]} isOwnProfile={true} />);
    // The new user has only one allowance → no select, shows 30 remaining
    const svg = document.querySelector("svg");
    expect(svg?.textContent).toContain("30");
  });
});
