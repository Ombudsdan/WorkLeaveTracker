/**
 * Integration-style tests for the DashboardPage component focusing on the
 * read-only navigation behaviour:
 *
 *  1. Own dashboard loads when no userId search param is present.
 *  2. A connection's dashboard loads immediately when userId is set (no manual
 *     browser refresh required).
 *  3. Navigating back to /dashboard (userId removed) clears read-only mode.
 *  4. Navigating from one connection's dashboard directly to another works
 *     without a page reload in between.
 */
import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import DashboardPage from "@/app/dashboard/page";
import type { PublicUser } from "@/types";

// ─── Mock next/navigation ─────────────────────────────────────────────────────
jest.mock("next/navigation", () => ({
  useSearchParams: jest.fn(),
  useRouter: jest.fn(),
}));

// ─── Mock next-auth/react ─────────────────────────────────────────────────────
jest.mock("next-auth/react", () => ({
  useSession: jest.fn(),
}));

// ─── Mock controllers ─────────────────────────────────────────────────────────
jest.mock("@/controllers/usersController", () => ({
  usersController: {
    fetchAll: jest.fn(),
    addYearAllowance: jest.fn(),
  },
}));

jest.mock("@/controllers/holidaysController", () => ({
  holidaysController: {
    fetchBankHolidays: jest.fn(),
  },
}));

jest.mock("@/controllers/entriesController", () => ({
  entriesController: {
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  },
}));

// ─── Stub heavy child components so these tests stay fast and focused ─────────
jest.mock("@/components/NavBar", () => function StubNavBar() { return <nav data-testid="navbar" />; });
jest.mock("@/components/LoadingSpinner", () => function StubLoadingSpinner() { return <div data-testid="loading-spinner" />; });
jest.mock("@/components/dashboard/MiniCalendar", () => () => null);
jest.mock("@/components/dashboard/MicroAnnualPlanner", () => () => null);
jest.mock("@/components/dashboard/SummaryCard", () => () => null);
jest.mock("@/components/dashboard/CalendarView", () => () => null);
jest.mock("@/components/dashboard/LeaveList", () => () => null);

// ─── Import mocks so we can configure them per-test ──────────────────────────
import { useSession } from "next-auth/react";
import { useSearchParams, useRouter } from "next/navigation";
import { usersController } from "@/controllers/usersController";
import { holidaysController } from "@/controllers/holidaysController";

const mockUseSession = useSession as jest.Mock;
const mockUseSearchParams = useSearchParams as jest.Mock;
const mockUseRouter = useRouter as jest.Mock;
const mockFetchAll = usersController.fetchAll as jest.Mock;
const mockFetchBankHolidays = holidaysController.fetchBankHolidays as jest.Mock;

// ─── Test data ────────────────────────────────────────────────────────────────

/** Returns a URLSearchParams-like object that yields userId on request. */
function makeSearchParams(userId: string | null) {
  return { get: (key: string) => (key === "userId" ? userId : null) };
}

const alice: PublicUser = {
  id: "u1",
  profile: {
    firstName: "Alice",
    lastName: "Smith",
    email: "alice@example.com",
    nonWorkingDays: [0, 6],
    pinnedUserIds: ["u2", "u3"],
    pendingPinRequestsReceived: [],
  },
  yearAllowances: [
    { year: 2026, company: "Acme", holidayStartMonth: 1, core: 25, bought: 0, carried: 0 },
  ],
  entries: [],
};

const bob: PublicUser = {
  id: "u2",
  profile: {
    firstName: "Bob",
    lastName: "Jones",
    email: "bob@example.com",
    nonWorkingDays: [0, 6],
    pinnedUserIds: ["u1"],
    pendingPinRequestsReceived: [],
  },
  yearAllowances: [
    { year: 2026, company: "Acme", holidayStartMonth: 1, core: 25, bought: 0, carried: 0 },
  ],
  entries: [],
};

const carol: PublicUser = {
  id: "u3",
  profile: {
    firstName: "Carol",
    lastName: "King",
    email: "carol@example.com",
    nonWorkingDays: [0, 6],
    pinnedUserIds: ["u1"],
    pendingPinRequestsReceived: [],
  },
  yearAllowances: [
    { year: 2026, company: "Acme", holidayStartMonth: 1, core: 25, bought: 0, carried: 0 },
  ],
  entries: [],
};

// ─── Test setup ───────────────────────────────────────────────────────────────

beforeEach(() => {
  mockUseSession.mockReturnValue({
    data: { user: { id: "u1", email: "alice@example.com" } },
    status: "authenticated",
  });
  mockUseRouter.mockReturnValue({ push: jest.fn(), replace: jest.fn() });
  mockFetchAll.mockResolvedValue([alice, bob, carol]);
  mockFetchBankHolidays.mockResolvedValue([]);
});

afterEach(() => {
  jest.clearAllMocks();
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Wait for the initial loading spinner to disappear (data fetch complete). */
async function waitForDashboardReady() {
  await waitFor(() => {
    expect(screen.queryByTestId("loading-spinner")).not.toBeInTheDocument();
  });
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("DashboardPage — read-only navigation", () => {
  it("shows own dashboard (no read-only banner) when no userId param is present", async () => {
    mockUseSearchParams.mockReturnValue(makeSearchParams(null));
    render(<DashboardPage />);

    await waitForDashboardReady();

    expect(screen.queryByTestId("readonly-banner")).not.toBeInTheDocument();
  });

  it("loads a connection's dashboard without a page refresh when userId param is set", async () => {
    mockUseSearchParams.mockReturnValue(makeSearchParams("u2"));
    render(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByTestId("readonly-banner")).toBeInTheDocument();
    });

    expect(screen.getByTestId("readonly-banner")).toHaveTextContent("Bob Jones");
  });

  it("clears read-only mode immediately when navigating back to own dashboard (no userId)", async () => {
    // Start on Bob's dashboard
    mockUseSearchParams.mockReturnValue(makeSearchParams("u2"));
    const { rerender } = render(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByTestId("readonly-banner")).toBeInTheDocument();
    });
    expect(screen.getByTestId("readonly-banner")).toHaveTextContent("Bob Jones");

    // Simulate "Back to my Dashboard" — URL changes to /dashboard with no userId
    mockUseSearchParams.mockReturnValue(makeSearchParams(null));
    rerender(<DashboardPage />);

    await waitForDashboardReady();

    expect(screen.queryByTestId("readonly-banner")).not.toBeInTheDocument();
  });

  it("switches to a different connection's dashboard without requiring a page reload", async () => {
    // Start on Bob's dashboard
    mockUseSearchParams.mockReturnValue(makeSearchParams("u2"));
    const { rerender } = render(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByTestId("readonly-banner")).toHaveTextContent("Bob Jones");
    });

    // Navigate directly to Carol's dashboard (different connection)
    mockUseSearchParams.mockReturnValue(makeSearchParams("u3"));
    rerender(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByTestId("readonly-banner")).toHaveTextContent("Carol King");
    });

    // Bob's name should no longer appear in the banner
    expect(screen.getByTestId("readonly-banner")).not.toHaveTextContent("Bob Jones");
  });
});
