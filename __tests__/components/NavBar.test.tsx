import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import NavBar from "@/components/NavBar";
import { signOut as mockSignOutFn } from "next-auth/react";

// Mock next-auth/react
jest.mock("next-auth/react", () => ({
  useSession: jest.fn(),
  signOut: jest.fn(),
}));

import { useSession } from "next-auth/react";
import React from "react";

const mockUseSession = useSession as jest.Mock;

describe("NavBar — unauthenticated", () => {
  beforeEach(() => {
    mockUseSession.mockReturnValue({ data: null });
  });

  it("renders the app title", () => {
    render(<NavBar activePage="dashboard" />);
    expect(screen.getByText("Work Leave Tracker")).toBeInTheDocument();
  });

  it("renders the app title as a link to /dashboard", () => {
    render(<NavBar activePage="dashboard" />);
    const logoLink = screen.getByRole("link", { name: "Work Leave Tracker" });
    expect(logoLink).toBeInTheDocument();
    expect(logoLink).toHaveAttribute("href", "/dashboard");
  });

  it("renders a Dashboard navigation link", () => {
    render(<NavBar activePage="dashboard" />);
    // The link is in the desktop nav (hidden sm:flex), but it's still in the DOM
    expect(screen.getAllByRole("link", { name: "Dashboard" }).length).toBeGreaterThan(0);
  });

  it("renders a Profile navigation link", () => {
    render(<NavBar activePage="dashboard" />);
    // aria-label includes "Profile" — query by partial text
    const profileLinks = screen.getAllByRole("link", { name: /profile/i });
    expect(profileLinks.length).toBeGreaterThan(0);
  });

  it("does NOT render a Connections navigation link in the navbar", () => {
    render(<NavBar activePage="dashboard" />);
    // Connections has been moved to the profile page tabs; it should NOT be in the navbar
    expect(screen.queryByRole("link", { name: /connections/i })).toBeNull();
  });

  it("does not render Sign Out when there is no session", () => {
    render(<NavBar activePage="dashboard" />);
    expect(screen.queryByRole("button", { name: "Sign Out" })).toBeNull();
  });
});

describe("NavBar — authenticated", () => {
  beforeEach(() => {
    mockUseSession.mockReturnValue({
      data: { user: { name: "Alice Smith" } },
    });
  });

  it("shows the user's name", () => {
    render(<NavBar activePage="dashboard" />);
    expect(screen.getAllByText("Alice Smith").length).toBeGreaterThan(0);
  });

  it("shows the Sign Out button", () => {
    render(<NavBar activePage="dashboard" />);
    // Sign Out may appear in desktop nav and/or mobile menu
    expect(screen.getAllByRole("button", { name: "Sign Out" }).length).toBeGreaterThan(0);
  });

  it("calls signOut when the Sign Out button is clicked", async () => {
    render(<NavBar activePage="dashboard" />);
    await userEvent.click(screen.getAllByRole("button", { name: "Sign Out" })[0]);
    expect(mockSignOutFn).toHaveBeenCalledWith({ callbackUrl: "/login" });
  });
});

describe("NavBar — activePage styling", () => {
  beforeEach(() => {
    mockUseSession.mockReturnValue({ data: null });
  });

  it("applies active (indigo) class to the Dashboard link when activePage='dashboard'", () => {
    render(<NavBar activePage="dashboard" />);
    const links = screen.getAllByRole("link", { name: "Dashboard" });
    expect(links[0].className).toContain("indigo");
  });

  it("applies active (indigo) class to the Profile link when activePage='profile'", () => {
    render(<NavBar activePage="profile" />);
    const links = screen.getAllByRole("link", { name: /profile/i });
    expect(links[0].className).toContain("indigo");
  });

  it("applies inactive class to Dashboard link when activePage='profile'", () => {
    render(<NavBar activePage="profile" />);
    const links = screen.getAllByRole("link", { name: "Dashboard" });
    expect(links[0].className).not.toContain("font-semibold");
  });
});

describe("NavBar — mobile hamburger", () => {
  beforeEach(() => {
    mockUseSession.mockReturnValue({ data: null });
  });

  it("renders the hamburger toggle button", () => {
    render(<NavBar activePage="dashboard" />);
    expect(screen.getByRole("button", { name: "Toggle menu" })).toBeInTheDocument();
  });

  it("hamburger button starts closed (aria-expanded=false)", () => {
    render(<NavBar activePage="dashboard" />);
    expect(screen.getByRole("button", { name: "Toggle menu" })).toHaveAttribute(
      "aria-expanded",
      "false"
    );
  });

  it("opens the mobile menu when the hamburger button is clicked", async () => {
    render(<NavBar activePage="dashboard" />);
    const toggle = screen.getByRole("button", { name: "Toggle menu" });
    await userEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "true");
  });
});

describe("NavBar — mobile menu interactions", () => {
  beforeEach(() => {
    mockUseSession.mockReturnValue({
      data: { user: { name: "Alice Smith" } },
    });
  });

  it("closes the mobile menu when a link inside it is clicked", async () => {
    render(<NavBar activePage="dashboard" />);
    const toggle = screen.getByRole("button", { name: "Toggle menu" });
    // Open
    await userEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    // Click the Dashboard link inside mobile menu
    const mobileLinks = screen.getAllByRole("link", { name: "Dashboard" });
    // The second link is in the mobile menu (first is desktop nav)
    await userEvent.click(mobileLinks[mobileLinks.length - 1]);
    expect(toggle).toHaveAttribute("aria-expanded", "false");
  });

  it("shows user name and Sign Out inside the mobile menu when authenticated", async () => {
    render(<NavBar activePage="dashboard" />);
    await userEvent.click(screen.getByRole("button", { name: "Toggle menu" }));
    // Username appears in mobile menu (and also desktop nav)
    expect(screen.getAllByText("Alice Smith").length).toBeGreaterThanOrEqual(2);
  });

  it("calls signOut from the mobile menu Sign Out button", async () => {
    render(<NavBar activePage="dashboard" />);
    await userEvent.click(screen.getByRole("button", { name: "Toggle menu" }));
    // The mobile menu's Sign Out button is the second one rendered
    const signOutBtns = screen.getAllByRole("button", { name: "Sign Out" });
    await userEvent.click(signOutBtns[signOutBtns.length - 1]);
    expect(mockSignOutFn).toHaveBeenCalledWith({ callbackUrl: "/login" });
  });

  it("shows Profile link with badge in mobile menu when there are pending requests", async () => {
    render(<NavBar activePage="dashboard" pendingRequestCount={2} />);
    await userEvent.click(screen.getByRole("button", { name: "Toggle menu" }));
    // Badge should appear in both desktop and mobile nav
    expect(screen.getAllByText("2").length).toBeGreaterThanOrEqual(2);
  });

  it("applies inactive class to mobile Dashboard link when activePage='profile'", async () => {
    render(<NavBar activePage="profile" />);
    await userEvent.click(screen.getByRole("button", { name: "Toggle menu" }));
    const dashboardLinks = screen.getAllByRole("link", { name: "Dashboard" });
    // Mobile menu link (last one) should not have font-semibold
    expect(dashboardLinks[dashboardLinks.length - 1].className).not.toContain("font-semibold");
  });

  it("applies active class to mobile Profile link when activePage='profile'", async () => {
    render(<NavBar activePage="profile" />);
    await userEvent.click(screen.getByRole("button", { name: "Toggle menu" }));
    const profileLinks = screen.getAllByRole("link", { name: /profile/i });
    expect(profileLinks[profileLinks.length - 1].className).toContain("indigo");
  });
});

describe("NavBar — profile notification badge", () => {
  beforeEach(() => {
    mockUseSession.mockReturnValue({ data: null });
  });

  it("does not show a badge when pendingRequestCount is 0", () => {
    render(<NavBar activePage="dashboard" pendingRequestCount={0} />);
    expect(screen.queryByText("0")).toBeNull();
  });

  it("shows the badge count on the Profile link when pendingRequestCount > 0", () => {
    render(<NavBar activePage="dashboard" pendingRequestCount={3} />);
    expect(screen.getAllByText("3").length).toBeGreaterThan(0);
  });

  it("does not show the badge when pendingRequestCount is not provided", () => {
    render(<NavBar activePage="dashboard" />);
    expect(screen.queryByText(/^\d+$/)).toBeNull();
  });
});

describe("NavBar — annual-planner link", () => {
  beforeEach(() => {
    mockUseSession.mockReturnValue({ data: null });
  });

  it("renders an 'Annual Planner' navigation link in the desktop nav", () => {
    render(<NavBar activePage="dashboard" />);
    expect(screen.getAllByRole("link", { name: "Annual Planner" }).length).toBeGreaterThan(0);
  });

  it("applies active (indigo) class to the Annual Planner link when activePage='annual-planner'", () => {
    render(<NavBar activePage="annual-planner" />);
    const links = screen.getAllByRole("link", { name: "Annual Planner" });
    expect(links[0].className).toContain("indigo");
  });

  it("applies inactive class to the Annual Planner link when activePage='dashboard'", () => {
    render(<NavBar activePage="dashboard" />);
    const links = screen.getAllByRole("link", { name: "Annual Planner" });
    expect(links[0].className).not.toContain("font-semibold");
  });

  it("annual-planner link points to /annual-planner", () => {
    render(<NavBar activePage="dashboard" />);
    const links = screen.getAllByRole("link", { name: "Annual Planner" });
    expect(links[0]).toHaveAttribute("href", "/annual-planner");
  });

  it("applies inactive class to the Dashboard link when activePage='annual-planner'", () => {
    render(<NavBar activePage="annual-planner" />);
    const links = screen.getAllByRole("link", { name: "Dashboard" });
    expect(links[0].className).not.toContain("font-semibold");
  });
});

describe("NavBar — annual-planner in mobile menu", () => {
  beforeEach(() => {
    mockUseSession.mockReturnValue({ data: null });
  });

  it("shows Annual Planner link in mobile menu", async () => {
    render(<NavBar activePage="dashboard" />);
    await userEvent.click(screen.getByRole("button", { name: "Toggle menu" }));
    const links = screen.getAllByRole("link", { name: "Annual Planner" });
    expect(links.length).toBeGreaterThanOrEqual(2);
  });

  it("applies active class to Annual Planner in mobile menu when activePage='annual-planner'", async () => {
    render(<NavBar activePage="annual-planner" />);
    await userEvent.click(screen.getByRole("button", { name: "Toggle menu" }));
    const links = screen.getAllByRole("link", { name: "Annual Planner" });
    expect(links[links.length - 1].className).toContain("indigo");
  });
});
