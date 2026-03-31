/**
 * Tests for CalendarView behaviour when SICK_LEAVE_ENABLED=true.
 * Exercises the sickKeys branch (const sickKeys = SICK_LEAVE_ENABLED ? [LEAVE_KEY_SICK] : []).
 */

jest.mock("@/utils/features", () => ({
  SICK_LEAVE_ENABLED: true,
}));

import { render, screen } from "@testing-library/react";
import CalendarView from "@/components/organisms/CalendarView";
import type { PublicUser } from "@/types";

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

describe("CalendarView — SICK_LEAVE_ENABLED=true shows Sick key in legend", () => {
  it("renders the Sick legend key item when sick leave is enabled", () => {
    render(<CalendarView user={alice} bankHolidays={[]} />);
    expect(screen.getByText("Sick")).toBeInTheDocument();
  });
});
