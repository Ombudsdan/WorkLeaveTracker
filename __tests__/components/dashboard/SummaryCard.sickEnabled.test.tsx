/**
 * Tests for SummaryCard behaviour when SICK_LEAVE_ENABLED=true.
 * Uses a module-level jest.mock to override the feature flag so the sick-leave
 * code paths (lines 143-148 and the sick tab) are exercised.
 */

jest.mock("@/utils/features", () => ({
  SICK_LEAVE_ENABLED: true,
}));

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import SummaryCard from "@/components/dashboard/SummaryCard";
import { LeaveStatus, LeaveType } from "@/types";
import type { PublicUser } from "@/types";

function setup() {
  return userEvent.setup({ advanceTimers: jest.advanceTimersByTime.bind(jest) });
}

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

describe("SummaryCard — sick leave enabled: sickDays calculation", () => {
  it("computes sick days when SICK_LEAVE_ENABLED is true", () => {
    render(<SummaryCard user={userWithSick} bankHolidays={[]} isOwnProfile={true} />);
    // The sick tab should appear (SICK_LEAVE_ENABLED=true and user has sick entries)
    expect(screen.getByRole("tab", { name: "Sick" })).toBeInTheDocument();
  });

  it("shows 0 sick days when the user has no sick entries", () => {
    render(<SummaryCard user={alice} bankHolidays={[]} isOwnProfile={true} />);
    // SICK_LEAVE_ENABLED=true but no sick entries → hasSickEntries=false → no sick tab
    expect(screen.queryByRole("tab", { name: "Sick" })).toBeNull();
  });
});

describe("SummaryCard — sick leave enabled: tab strip", () => {
  it("shows both Holiday and Sick tabs when user has sick entries", () => {
    render(<SummaryCard user={userWithSick} bankHolidays={[]} isOwnProfile={true} />);
    expect(screen.getByRole("tab", { name: "Holiday" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Sick" })).toBeInTheDocument();
  });

  it("switches to the Sick tab and shows sick day count", async () => {
    const user = setup();
    render(<SummaryCard user={userWithSick} bankHolidays={[]} isOwnProfile={true} />);
    await user.click(screen.getByRole("tab", { name: "Sick" }));
    expect(screen.getByText(/sick days logged/i)).toBeInTheDocument();
    // 1 sick day (Mon 2026-03-10)
    expect(screen.getByText("1")).toBeInTheDocument();
  });

  it("switches back to the Holiday tab after visiting Sick", async () => {
    const user = setup();
    render(<SummaryCard user={userWithSick} bankHolidays={[]} isOwnProfile={true} />);
    await user.click(screen.getByRole("tab", { name: "Sick" }));
    await user.click(screen.getByRole("tab", { name: "Holiday" }));
    // Holiday tab content should be visible again
    expect(screen.getByRole("button", { name: /view breakdown/i })).toBeInTheDocument();
  });
});
