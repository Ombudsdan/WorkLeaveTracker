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

  it("shows the total allowance", () => {
    render(<SummaryCard user={alice} bankHolidays={[]} isOwnProfile={true} />);
    // "25 days" can appear for both Total Allowance and Remaining; getAllByText handles this
    expect(screen.getAllByText("25 days").length).toBeGreaterThanOrEqual(1);
  });

  it("shows 0% used when there are no entries", () => {
    render(<SummaryCard user={alice} bankHolidays={[]} isOwnProfile={true} />);
    expect(screen.getByText("0% used")).toBeInTheDocument();
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
    // "5 days" appears for the Approved row
    expect(screen.getAllByText("5 days").length).toBeGreaterThan(0);
  });

  it("shows the correct remaining days", () => {
    render(<SummaryCard user={userWithEntries} bankHolidays={[]} isOwnProfile={true} />);
    expect(screen.getByText("20 days")).toBeInTheDocument();
  });

  it("shows the used percentage", () => {
    render(<SummaryCard user={userWithEntries} bankHolidays={[]} isOwnProfile={true} />);
    expect(screen.getByText("20% used")).toBeInTheDocument();
  });
});

describe("SummaryCard — progress bar width", () => {
  it("renders 0% width when no days used", () => {
    const { container } = render(
      <SummaryCard user={alice} bankHolidays={[]} isOwnProfile={true} />
    );
    const bar = container.querySelector(".bg-indigo-500") as HTMLElement;
    expect(bar).toBeInTheDocument();
    expect(bar.style.width).toBe("0%");
  });

  it("caps width at 100% even when days exceed allowance", () => {
    const over: PublicUser = {
      ...alice,
      yearAllowances: [
        { year: 2026, company: "Acme", holidayStartMonth: 1, core: 1, bought: 0, carried: 0 },
      ],
      entries: [
        {
          id: "e2",
          startDate: "2026-03-09",
          endDate: "2026-03-20",
          status: LeaveStatus.Approved,
          type: LeaveType.Holiday,
        },
      ],
    };
    const { container } = render(<SummaryCard user={over} bankHolidays={[]} isOwnProfile={true} />);
    const bar = container.querySelector(".bg-indigo-500") as HTMLElement;
    expect(bar.style.width).toBe("100%");
  });

  it("shows 0% when total allowance is zero (avoid division by zero)", () => {
    const zero: PublicUser = {
      ...alice,
      yearAllowances: [
        { year: 2026, company: "Acme", holidayStartMonth: 1, core: 0, bought: 0, carried: 0 },
      ],
    };
    render(<SummaryCard user={zero} bankHolidays={[]} isOwnProfile={true} />);
    // Should show "0% used" not NaN
    expect(screen.getByText("0% used")).toBeInTheDocument();
  });
});

describe("SummaryCard — no year allowances (legacy/missing data)", () => {
  it("shows 0% used when user has no year allowances", () => {
    render(
      <SummaryCard user={{ ...alice, yearAllowances: [] }} bankHolidays={[]} isOwnProfile={true} />
    );
    expect(screen.getByText("0% used")).toBeInTheDocument();
  });
});

describe("SummaryCard — allowance breakdown popover", () => {
  it("does not show the breakdown panel initially", () => {
    render(<SummaryCard user={alice} bankHolidays={[]} isOwnProfile={true} />);
    expect(screen.queryByText("Allowance Breakdown")).toBeNull();
  });

  it("shows the breakdown panel after clicking 'Total Allowance'", async () => {
    const user = setup();
    render(<SummaryCard user={alice} bankHolidays={[]} isOwnProfile={true} />);
    await user.click(screen.getByRole("button", { name: /total allowance/i }));
    expect(screen.getByText("Allowance Breakdown")).toBeInTheDocument();
  });

  it("shows Core Days and Total in the breakdown", async () => {
    const user = setup();
    render(<SummaryCard user={alice} bankHolidays={[]} isOwnProfile={true} />);
    await user.click(screen.getByRole("button", { name: /total allowance/i }));
    expect(screen.getByText("Core Days")).toBeInTheDocument();
    // At least one "+0" (bought or carried shown in breakdown)
    expect(screen.getAllByText("+0").length).toBeGreaterThanOrEqual(1);
  });

  it("closes the breakdown panel when the close button is clicked", async () => {
    const user = setup();
    render(<SummaryCard user={alice} bankHolidays={[]} isOwnProfile={true} />);
    await user.click(screen.getByRole("button", { name: /total allowance/i }));
    expect(screen.getByText("Allowance Breakdown")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Close breakdown" }));
    expect(screen.queryByText("Allowance Breakdown")).toBeNull();
  });

  it("renders the SVG donut chart when breakdown is open", async () => {
    const user = setup();
    const { container } = render(
      <SummaryCard user={alice} bankHolidays={[]} isOwnProfile={true} />
    );
    await user.click(screen.getByRole("button", { name: /total allowance/i }));
    expect(container.querySelector("svg")).toBeInTheDocument();
  });
});
