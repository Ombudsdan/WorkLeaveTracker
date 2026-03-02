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
    expect(screen.getByText("20 days")).toBeInTheDocument();
  });
});

describe("SummaryCard — dual-ring donut", () => {
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
