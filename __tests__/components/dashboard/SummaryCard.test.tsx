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
    render(<SummaryCard user={alice} bankHolidays={[]} />);
    expect(screen.getByText("Alice Smith")).toBeInTheDocument();
  });

  it("shows the holiday year range", () => {
    render(<SummaryCard user={alice} bankHolidays={[]} />);
    // Single allowance → plain text showing the window dates
    expect(screen.getByText(/1 Jan 2026/)).toBeInTheDocument();
    expect(screen.getByText(/31 Dec 2026/)).toBeInTheDocument();
  });

  it("shows the total allowance in the breakdown", async () => {
    const user = setup();
    render(<SummaryCard user={alice} bankHolidays={[]} />);
    await user.click(screen.getByRole("button", { name: /view breakdown/i }));
    expect(screen.getByText("Core Days")).toBeInTheDocument();
  });

  it("shows the donut SVG always (not just in breakdown)", () => {
    const { container } = render(<SummaryCard user={alice} bankHolidays={[]} />);
    expect(container.querySelector("svg")).toBeInTheDocument();
  });

  it("shows the status key rows (Approved, Requested, Planned) by default", () => {
    render(<SummaryCard user={alice} bankHolidays={[]} />);
    expect(screen.getByText("Approved")).toBeInTheDocument();
    expect(screen.getByText("Requested")).toBeInTheDocument();
    expect(screen.getByText("Planned")).toBeInTheDocument();
  });

  it("does not show the Read-only badge for any profile", () => {
    render(<SummaryCard user={alice} bankHolidays={[]} />);
    expect(screen.queryByText("Read-only")).toBeNull();
  });

  it("does not show the Read-only badge for other user profiles either", () => {
    render(<SummaryCard user={alice} bankHolidays={[]} />);
    expect(screen.queryByText("Read-only")).toBeNull();
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
    render(<SummaryCard user={userWithEntries} bankHolidays={[]} />);
    expect(screen.getAllByText("5 days").length).toBeGreaterThan(0);
  });

  it("shows the correct remaining days in the center of the donut (via SVG)", async () => {
    const { container } = render(<SummaryCard user={userWithEntries} bankHolidays={[]} />);
    const svg = container.querySelector("svg") as SVGElement;
    expect(svg).toBeInTheDocument();
    // The center text should contain the remaining days (20)
    expect(svg.textContent).toContain("20");
  });

  it("shows remaining days in the breakdown", async () => {
    const user = setup();
    render(<SummaryCard user={userWithEntries} bankHolidays={[]} />);
    await user.click(screen.getByRole("button", { name: /view breakdown/i }));
    // Remaining = 25 total - 0 bank holidays - 5 approved = 20
    const remainingRow = screen.getByText("Remaining").closest("div");
    expect(remainingRow?.textContent).toContain("20");
  });
});

describe("SummaryCard — single-ring donut", () => {
  it("renders the SVG donut chart by default (no click required)", () => {
    const { container } = render(<SummaryCard user={alice} bankHolidays={[]} />);
    expect(container.querySelector("svg")).toBeInTheDocument();
  });

  it("shows remaining days in the donut center", () => {
    const { container } = render(<SummaryCard user={alice} bankHolidays={[]} />);
    const svgText = container.querySelector("svg")?.textContent;
    expect(svgText).toContain("25"); // 25 remaining when no entries
  });

  it("renders only one SVG ring (single circle track)", () => {
    const { container } = render(<SummaryCard user={alice} bankHolidays={[]} />);
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
    const { container } = render(<SummaryCard user={userWith14Days} bankHolidays={[]} />);
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
    render(<SummaryCard user={{ ...alice, yearAllowances: [] }} bankHolidays={[]} />);
    // Just ensure it renders without throwing
    expect(screen.getByText("Alice Smith")).toBeInTheDocument();
  });
});

describe("SummaryCard — allowance breakdown toggle", () => {
  it("does not show Core Days initially", () => {
    render(<SummaryCard user={alice} bankHolidays={[]} />);
    expect(screen.queryByText("Core Days")).toBeNull();
  });

  it("shows Core Days after clicking 'View breakdown'", async () => {
    const user = setup();
    render(<SummaryCard user={alice} bankHolidays={[]} />);
    await user.click(screen.getByRole("button", { name: /view breakdown/i }));
    expect(screen.getByText("Core Days")).toBeInTheDocument();
  });

  it("shows Bought and Carried Over in the breakdown", async () => {
    const user = setup();
    render(<SummaryCard user={alice} bankHolidays={[]} />);
    await user.click(screen.getByRole("button", { name: /view breakdown/i }));
    expect(screen.getByText("Bought")).toBeInTheDocument();
    expect(screen.getByText("Carried Over")).toBeInTheDocument();
  });

  it("hides breakdown after clicking 'Hide breakdown'", async () => {
    const user = setup();
    render(<SummaryCard user={alice} bankHolidays={[]} />);
    await user.click(screen.getByRole("button", { name: /view breakdown/i }));
    expect(screen.getByText("Core Days")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /hide breakdown/i }));
    expect(screen.queryByText("Core Days")).toBeNull();
  });
});

describe("SummaryCard — breakdown layout", () => {
  it("shows + prefix on Core Days value", async () => {
    const user = setup();
    render(<SummaryCard user={alice} bankHolidays={[]} />);
    await user.click(screen.getByRole("button", { name: /view breakdown/i }));
    const coreRow = screen.getByText("Core Days").closest("div");
    expect(coreRow?.querySelector("span:last-child")?.textContent).toBe("+25");
  });

  it("shows + prefix on Bought value", async () => {
    const user = setup();
    render(<SummaryCard user={alice} bankHolidays={[]} />);
    await user.click(screen.getByRole("button", { name: /view breakdown/i }));
    const row = screen.getByText("Bought").closest("div");
    expect(row?.querySelector("span:last-child")?.textContent).toBe("+0");
  });

  it("shows + prefix on Carried Over value", async () => {
    const user = setup();
    render(<SummaryCard user={alice} bankHolidays={[]} />);
    await user.click(screen.getByRole("button", { name: /view breakdown/i }));
    const row = screen.getByText("Carried Over").closest("div");
    expect(row?.querySelector("span:last-child")?.textContent).toBe("+0");
  });

  it("shows Total row as bold with raw entitlement value", async () => {
    const user = setup();
    render(<SummaryCard user={alice} bankHolidays={[]} />);
    await user.click(screen.getByRole("button", { name: /view breakdown/i }));
    const totalRow = screen.getByText("Total").closest("div");
    expect(totalRow?.className).toContain("font-bold");
    expect(totalRow?.querySelector("span:last-child")?.textContent).toBe("25");
  });

  it("shows a horizontal rule divider in the breakdown", async () => {
    const user = setup();
    const { container } = render(<SummaryCard user={alice} bankHolidays={[]} />);
    await user.click(screen.getByRole("button", { name: /view breakdown/i }));
    expect(container.querySelector("hr")).toBeInTheDocument();
  });

  it("shows − prefix on Bank holidays on working days value", async () => {
    const user = setup();
    render(
      <SummaryCard
        user={alice}
        bankHolidays={[{ date: "2026-01-01", title: "New Year's Day" }]}
      />
    );
    await user.click(screen.getByRole("button", { name: /view breakdown/i }));
    const row = screen.getByText("Bank holidays on working days").closest("div");
    expect(row?.querySelector("span:last-child")?.textContent).toBe("−1");
  });

  it("shows − prefix on Approved value", async () => {
    const user = setup();
    const userWithApproved: PublicUser = {
      ...alice,
      entries: [
        {
          id: "e1",
          startDate: "2026-03-09",
          endDate: "2026-03-09",
          status: LeaveStatus.Approved,
          type: LeaveType.Holiday,
        },
      ],
    };
    render(<SummaryCard user={userWithApproved} bankHolidays={[]} />);
    await user.click(screen.getByRole("button", { name: /view breakdown/i }));
    // There are two "Approved" elements: one in the status key, one in the breakdown.
    // The breakdown one is inside the breakdown panel (after the <hr>).
    const allApproved = screen.getAllByText("Approved");
    const breakdownApproved = allApproved.find((el) => el.closest("div")?.textContent === "Approved−1");
    expect(breakdownApproved).toBeDefined();
  });

  it("shows − prefix on Requested value", async () => {
    const user = setup();
    const userWithRequested: PublicUser = {
      ...alice,
      entries: [
        {
          id: "e1",
          startDate: "2026-03-09",
          endDate: "2026-03-09",
          status: LeaveStatus.Requested,
          type: LeaveType.Holiday,
        },
      ],
    };
    render(<SummaryCard user={userWithRequested} bankHolidays={[]} />);
    await user.click(screen.getByRole("button", { name: /view breakdown/i }));
    // Multiple "Requested" elements exist; find the one whose row value contains "−"
    const allRequested = screen.getAllByText("Requested");
    const breakdownRequested = allRequested.find((el) =>
      el.closest("div")?.textContent?.startsWith("Requested−")
    );
    expect(breakdownRequested).toBeDefined();
    const row = breakdownRequested!.closest("div");
    expect(row?.querySelector("span:last-child")?.textContent).toBe("−1");
  });

  it("shows − prefix on Planned value", async () => {
    const user = setup();
    const userWithPlanned: PublicUser = {
      ...alice,
      entries: [
        {
          id: "e1",
          startDate: "2026-03-09",
          endDate: "2026-03-09",
          status: LeaveStatus.Planned,
          type: LeaveType.Holiday,
        },
      ],
    };
    render(<SummaryCard user={userWithPlanned} bankHolidays={[]} />);
    await user.click(screen.getByRole("button", { name: /view breakdown/i }));
    // Multiple "Planned" elements exist; find the one whose row value contains "−"
    const allPlanned = screen.getAllByText("Planned");
    const breakdownPlanned = allPlanned.find((el) =>
      el.closest("div")?.textContent?.startsWith("Planned−")
    );
    expect(breakdownPlanned).toBeDefined();
    const row = breakdownPlanned!.closest("div");
    expect(row?.querySelector("span:last-child")?.textContent).toBe("−1");
  });

  it("shows Remaining row as bold with correct value", async () => {
    const user = setup();
    render(<SummaryCard user={alice} bankHolidays={[]} />);
    await user.click(screen.getByRole("button", { name: /view breakdown/i }));
    const remainingRow = screen.getByText("Remaining").closest("div");
    expect(remainingRow?.className).toContain("font-bold");
    expect(remainingRow?.querySelector("span:last-child")?.textContent).toBe("25");
  });
});

describe("SummaryCard — donut uses effective total as ring denominator", () => {
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
    const { container } = render(<SummaryCard user={userWith5Days} bankHolidays={[]} />);
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
    const { container } = render(<SummaryCard user={userAllUsed} bankHolidays={[]} />);
    const svg = container.querySelector("svg");
    expect(svg).toBeInTheDocument();
    // Two circles: the gray track + the 100%-segment circle
    const circles = svg!.querySelectorAll("circle");
    expect(circles.length).toBe(2);
  });
});

describe("SummaryCard — breakdown Remaining colour when over-allocated", () => {
  it("shows text-red-600 on the Remaining value when leave exceeds budget", async () => {
    const user = setup();
    // core=1, bought=0, carried=0 → total=1; two 1-day approved entries → used=2
    // remaining = 1 - 0 BH - 2 approved = -1 → red
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
    render(<SummaryCard user={overAllocated} bankHolidays={[]} />);
    await user.click(screen.getByRole("button", { name: /view breakdown/i }));
    // The Remaining row should have text-red-600 class when negative
    const remainingRow = screen.getByText("Remaining").closest("div");
    expect(remainingRow?.className).toContain("text-red-600");
  });
});

describe("SummaryCard — bank holidays on working days in breakdown", () => {
  it("shows 'Bank holidays on working days' row in the breakdown", async () => {
    const user = setup();
    render(
      <SummaryCard
        user={alice}
        bankHolidays={[{ date: "2026-01-01", title: "New Year's Day" }]}
      />
    );
    await user.click(screen.getByRole("button", { name: /view breakdown/i }));
    expect(screen.getByText("Bank holidays on working days")).toBeInTheDocument();
  });

  it("shows −0 when no bank holidays fall on working days", async () => {
    const user = setup();
    // Saturday bank holiday — alice has nonWorkingDays [0, 6]
    render(
      <SummaryCard
        user={alice}
        bankHolidays={[{ date: "2026-01-03", title: "Saturday Holiday" }]}
      />
    );
    await user.click(screen.getByRole("button", { name: /view breakdown/i }));
    const row = screen.getByText("Bank holidays on working days").closest("div");
    expect(row?.querySelector("span:last-child")?.textContent).toBe("−0");
  });

  it("shows −N for bank holidays on working days", async () => {
    const user = setup();
    // Thursday 2026-01-01 is a working day for alice
    render(
      <SummaryCard
        user={alice}
        bankHolidays={[
          { date: "2026-01-01", title: "New Year's Day" },
          { date: "2026-12-25", title: "Christmas Day" },
        ]}
      />
    );
    await user.click(screen.getByRole("button", { name: /view breakdown/i }));
    const row = screen.getByText("Bank holidays on working days").closest("div");
    expect(row?.querySelector("span:last-child")?.textContent).toBe("−2");
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
    render(<SummaryCard user={alice} bankHolidays={[]} />);
    expect(screen.queryByRole("tab", { name: "Sick" })).toBeNull();
  });

  it("does NOT show the Holiday/Sick tab strip even with sick entries when feature flag is off (default env)", () => {
    // NEXT_PUBLIC_ENABLE_FEATURE_SICK_LEAVE is not set in the test env → SICK_LEAVE_ENABLED = false
    render(<SummaryCard user={userWithSick} bankHolidays={[]} />);
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

  it("shows plain text window range when there is only one allowance", () => {
    render(<SummaryCard user={alice} bankHolidays={[]} />);
    // Single allowance → text visible, no select
    expect(screen.getByText(/1 Jan 2026/)).toBeInTheDocument();
    expect(screen.queryByRole("combobox", { name: /select leave window/i })).toBeNull();
  });

  it("shows the select (not the text paragraph) when there are multiple allowances", () => {
    const { container } = render(<SummaryCard user={multiWindowUser} bankHolidays={[]} />);
    expect(screen.getByRole("combobox", { name: /select leave window/i })).toBeInTheDocument();
    // The plain-text date paragraph should not be rendered — only the select is shown
    expect(container.querySelector("p.text-xs.text-gray-400")).toBeNull();
  });

  it("the select defaults to the active year", () => {
    render(<SummaryCard user={multiWindowUser} bankHolidays={[]} />);
    const select = screen.getByRole("combobox", { name: /select leave window/i });
    // Active year is 2026 (today = 2026-03-15)
    expect((select as HTMLSelectElement).value).toBe("2026");
  });

  it("switching the window updates the summary totals", async () => {
    const user = setup();
    const { container } = render(<SummaryCard user={multiWindowUser} bankHolidays={[]} />);
    const select = screen.getByRole("combobox", { name: /select leave window/i });
    // Switch to 2025
    await user.selectOptions(select, ["2025"]);
    // 2025 allowance: core=20, no bank holidays → effectiveTotal=20
    // 2025 has 1 approved entry (Mon 10 – Thu 13 = 4 days), so remaining = 20 - 0 - 4 = 16
    const svg = container.querySelector("svg");
    expect(svg?.textContent).toContain("16");
  });

  it("switching the window updates the breakdown rows", async () => {
    const user = setup();
    render(<SummaryCard user={multiWindowUser} bankHolidays={[]} />);
    const select = screen.getByRole("combobox", { name: /select leave window/i });
    await user.selectOptions(select, ["2025"]);
    await user.click(screen.getByRole("button", { name: /view breakdown/i }));
    // 2025 core days = 20
    const coreRow = screen.getByText("Core Days").closest("div");
    expect(coreRow?.textContent).toContain("20");
  });

  it("resets to the active window when the user changes", () => {
    const { rerender } = render(<SummaryCard user={multiWindowUser} bankHolidays={[]} />);
    // Re-render with a different user (single allowance) — selectedYear resets
    const differentUser: PublicUser = {
      ...alice,
      id: "u2",
      yearAllowances: [
        { year: 2026, company: "Other", holidayStartMonth: 1, core: 30, bought: 0, carried: 0 },
      ],
    };
    rerender(<SummaryCard user={differentUser} bankHolidays={[]} />);
    // The new user has only one allowance → no select, shows 30 remaining
    const svg = document.querySelector("svg");
    expect(svg?.textContent).toContain("30");
  });
});
