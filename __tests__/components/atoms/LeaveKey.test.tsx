import { render, screen } from "@testing-library/react";
import React from "react";
import {
  LeaveKey,
  LEAVE_KEY_APPROVED,
  LEAVE_KEY_REQUESTED,
  LEAVE_KEY_PLANNED,
  LEAVE_KEY_SICK,
  LEAVE_KEY_BANK_HOLIDAY,
  LEAVE_KEY_NON_WORKING,
  LEAVE_KEY_ITEMS_BASE,
} from "@/components/atoms/LeaveKey";

// ─── Swatch shape ─────────────────────────────────────────────────────────────

describe("LeaveKey — swatch shape", () => {
  it("renders swatches as w-3 h-3 rounded squares (matching the big CalendarView key)", () => {
    const { container } = render(<LeaveKey items={[LEAVE_KEY_APPROVED]} />);
    const swatch = container.querySelector(".w-3.h-3.rounded");
    expect(swatch).toBeInTheDocument();
    // Must NOT be a circle or any other size
    expect(swatch).not.toHaveClass("rounded-full");
    expect(swatch).not.toHaveClass("w-2");
    expect(swatch).not.toHaveClass("w-2\\.5");
  });

  it("every swatch carries both w-3 and h-3", () => {
    const { container } = render(<LeaveKey items={LEAVE_KEY_ITEMS_BASE} />);
    const swatches = container.querySelectorAll("[data-testid^='leave-key-swatch']");
    expect(swatches.length).toBe(4);
    swatches.forEach((s) => {
      expect(s).toHaveClass("w-3");
      expect(s).toHaveClass("h-3");
    });
  });
});

// ─── Colour classes ───────────────────────────────────────────────────────────

describe("LeaveKey — colour classes", () => {
  it("renders Approved swatch with bg-green-300", () => {
    const { container } = render(<LeaveKey items={[LEAVE_KEY_APPROVED]} />);
    expect(container.querySelector(".bg-green-300")).toBeInTheDocument();
  });

  it("renders Requested swatch with bg-orange-200", () => {
    const { container } = render(<LeaveKey items={[LEAVE_KEY_REQUESTED]} />);
    expect(container.querySelector(".bg-orange-200")).toBeInTheDocument();
  });

  it("renders Planned swatch with bg-yellow-200", () => {
    const { container } = render(<LeaveKey items={[LEAVE_KEY_PLANNED]} />);
    expect(container.querySelector(".bg-yellow-200")).toBeInTheDocument();
  });

  it("renders Sick swatch with bg-red-200", () => {
    const { container } = render(<LeaveKey items={[LEAVE_KEY_SICK]} />);
    expect(container.querySelector(".bg-red-200")).toBeInTheDocument();
  });

  it("renders Bank Holiday swatch with bg-purple-300", () => {
    const { container } = render(<LeaveKey items={[LEAVE_KEY_BANK_HOLIDAY]} />);
    expect(container.querySelector(".bg-purple-300")).toBeInTheDocument();
  });

  it("renders Non-Working swatch with bg-gray-100", () => {
    const { container } = render(<LeaveKey items={[LEAVE_KEY_NON_WORKING]} />);
    expect(container.querySelector(".bg-gray-100")).toBeInTheDocument();
  });
});

// ─── Labels ───────────────────────────────────────────────────────────────────

describe("LeaveKey — labels", () => {
  it("renders all four base item labels", () => {
    render(<LeaveKey items={LEAVE_KEY_ITEMS_BASE} />);
    expect(screen.getByText("Approved")).toBeInTheDocument();
    expect(screen.getByText("Requested")).toBeInTheDocument();
    expect(screen.getByText("Planned")).toBeInTheDocument();
    expect(screen.getByText("Bank Holiday")).toBeInTheDocument();
  });

  it("renders the Bank Holiday label (singular, not plural)", () => {
    render(<LeaveKey items={[LEAVE_KEY_BANK_HOLIDAY]} />);
    expect(screen.getByText("Bank Holiday")).toBeInTheDocument();
    expect(screen.queryByText("Bank Holidays")).not.toBeInTheDocument();
  });
});

// ─── className forwarding ─────────────────────────────────────────────────────

describe("LeaveKey — className", () => {
  it("applies an extra className to the wrapper", () => {
    const { container } = render(<LeaveKey items={[LEAVE_KEY_APPROVED]} className="mt-4" />);
    expect(container.querySelector("[data-testid='leave-key']")).toHaveClass("mt-4");
  });

  it("renders without crashing when no className is passed", () => {
    const { container } = render(<LeaveKey items={[LEAVE_KEY_APPROVED]} />);
    expect(container.querySelector("[data-testid='leave-key']")).toBeInTheDocument();
  });
});

// ─── Cross-component consistency ─────────────────────────────────────────────
//
// Each chart-like view in the app must produce identical swatch DOM —
// w-3 h-3 rounded — so the keys look the same everywhere.
// These tests import each component and assert the leave-key container is
// present and uses the same swatch dimensions.

import CalendarView from "@/components/dashboard/CalendarView";
import MiniCalendar from "@/components/dashboard/MiniCalendar";
import MicroAnnualPlanner from "@/components/dashboard/MicroAnnualPlanner";
import SharedCalendarView from "@/components/connections/SharedCalendarView";
import AnnualPlannerView from "@/components/annual-planner/AnnualPlannerView";
import { LeaveStatus, LeaveType } from "@/types";
import type { PublicUser, BankHolidayEntry } from "@/types";

// Fix today so tests are deterministic
beforeEach(() => {
  jest.useFakeTimers();
  jest.setSystemTime(new Date("2026-03-15"));
});
afterEach(() => {
  jest.useRealTimers();
});

const baseUser: PublicUser = {
  id: "u1",
  profile: {
    firstName: "Alice",
    lastName: "Smith",
    email: "alice@example.com",
    nonWorkingDays: [0, 6], // Sun + Sat
  },
  yearAllowances: [
    { year: 2026, company: "Acme", holidayStartMonth: 1, core: 25, bought: 0, carried: 0 },
  ],
  entries: [],
};

/**
 * User with leave entries in the current month (March 2026) — used by
 * dynamic-key tests so that Approved/Requested/Planned swatches appear.
 */
const richUser: PublicUser = {
  ...baseUser,
  entries: [
    {
      id: "e1",
      startDate: "2026-03-09",
      endDate: "2026-03-09",
      status: LeaveStatus.Approved,
      type: LeaveType.Holiday,
    },
    {
      id: "e2",
      startDate: "2026-03-10",
      endDate: "2026-03-10",
      status: LeaveStatus.Requested,
      type: LeaveType.Holiday,
    },
    {
      id: "e3",
      startDate: "2026-03-11",
      endDate: "2026-03-11",
      status: LeaveStatus.Planned,
      type: LeaveType.Holiday,
    },
  ],
};

/** Bank holiday on a working day in March 2026 (Tuesday 17 Mar) */
const marchBH: BankHolidayEntry[] = [{ date: "2026-03-17", title: "Working Day BH" }];

function getSwatches(container: HTMLElement) {
  return container.querySelectorAll("[data-testid^='leave-key-swatch']");
}

describe("Cross-component key consistency", () => {
  it("CalendarView renders a leave-key with w-3 h-3 rounded swatches", () => {
    const { container } = render(<CalendarView user={baseUser} bankHolidays={[]} />);
    const key = container.querySelector("[data-testid='leave-key']");
    expect(key).toBeInTheDocument();
    const swatches = getSwatches(container);
    expect(swatches.length).toBeGreaterThan(0);
    swatches.forEach((s) => {
      expect(s).toHaveClass("w-3");
      expect(s).toHaveClass("h-3");
      expect(s).toHaveClass("rounded");
    });
  });

  it("MiniCalendar renders a leave-key with w-3 h-3 rounded swatches", () => {
    const { container } = render(<MiniCalendar user={baseUser} bankHolidays={[]} />);
    const key = container.querySelector("[data-testid='leave-key']");
    expect(key).toBeInTheDocument();
    const swatches = getSwatches(container);
    expect(swatches.length).toBeGreaterThan(0);
    swatches.forEach((s) => {
      expect(s).toHaveClass("w-3");
      expect(s).toHaveClass("h-3");
      expect(s).toHaveClass("rounded");
    });
  });

  it("MicroAnnualPlanner renders a leave-key with w-3 h-3 rounded swatches", () => {
    const { container } = render(<MicroAnnualPlanner user={baseUser} bankHolidays={[]} />);
    const key = container.querySelector("[data-testid='leave-key']");
    expect(key).toBeInTheDocument();
    const swatches = getSwatches(container);
    expect(swatches.length).toBeGreaterThan(0);
    swatches.forEach((s) => {
      expect(s).toHaveClass("w-3");
      expect(s).toHaveClass("h-3");
      expect(s).toHaveClass("rounded");
    });
  });

  it("SharedCalendarView renders a leave-key with w-3 h-3 rounded swatches (with leave data)", () => {
    // SharedCalendarView uses a dynamic key — need data in current month to get swatches
    const { container } = render(
      <SharedCalendarView currentUser={richUser} pinnedUsers={[]} bankHolidays={marchBH} />
    );
    const key = container.querySelector("[data-testid='leave-key']");
    expect(key).toBeInTheDocument();
    const swatches = getSwatches(container);
    expect(swatches.length).toBeGreaterThan(0);
    swatches.forEach((s) => {
      expect(s).toHaveClass("w-3");
      expect(s).toHaveClass("h-3");
      expect(s).toHaveClass("rounded");
    });
  });

  it("AnnualPlannerView renders a leave-key with w-3 h-3 rounded swatches (with leave data)", () => {
    // AnnualPlannerView uses a dynamic key — need data to get swatches
    const { container } = render(<AnnualPlannerView user={richUser} bankHolidays={marchBH} />);
    const key = container.querySelector("[data-testid='leave-key']");
    expect(key).toBeInTheDocument();
    const swatches = getSwatches(container);
    expect(swatches.length).toBeGreaterThan(0);
    swatches.forEach((s) => {
      expect(s).toHaveClass("w-3");
      expect(s).toHaveClass("h-3");
      expect(s).toHaveClass("rounded");
    });
  });

  it("all five views render the same swatch classes for Approved/Requested/Planned/Bank Holiday when data is present", () => {
    // CalendarView, MiniCalendar, MicroAnnualPlanner use static keys → always show all 4.
    // SharedCalendarView and AnnualPlannerView use dynamic keys → need data for all items.
    const views = [
      render(<CalendarView user={baseUser} bankHolidays={[]} />).container,
      render(<MiniCalendar user={baseUser} bankHolidays={[]} />).container,
      render(<MicroAnnualPlanner user={baseUser} bankHolidays={[]} />).container,
      render(<SharedCalendarView currentUser={richUser} pinnedUsers={[]} bankHolidays={marchBH} />)
        .container,
      render(<AnnualPlannerView user={richUser} bankHolidays={marchBH} />).container,
    ];

    const baseClasses = ["bg-green-300", "bg-orange-200", "bg-yellow-200", "bg-purple-300"];
    views.forEach((container) => {
      baseClasses.forEach((cls) => {
        expect(container.querySelector(`.${cls}`)).toBeInTheDocument();
      });
    });
  });

  it("AnnualPlannerView shows Bank Holiday (singular) with bg-purple-300, not bg-gray-400", () => {
    // Need a working-day bank holiday to trigger the swatch
    const { container } = render(<AnnualPlannerView user={baseUser} bankHolidays={marchBH} />);
    expect(screen.getAllByText("Bank Holiday").length).toBeGreaterThan(0);
    expect(container.querySelector(".bg-purple-300")).toBeInTheDocument();
    expect(container.querySelector(".bg-gray-400")).not.toBeInTheDocument();
  });
});
