import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import NavBar from "@/components/NavBar";
import { signOut as mockSignOutFn } from "next-auth/react";

// Mock next-auth/react
jest.mock("next-auth/react", () => ({
  useSession: jest.fn(),
  signOut: jest.fn(),
}));

// Mock next/link to avoid router issues in test environment
jest.mock("next/link", () => {
  const MockLink = ({
    href,
    children,
    className,
  }: {
    href: string;
    children: React.ReactNode;
    className?: string;
  }) => (
    <a href={href} className={className}>
      {children}
    </a>
  );
  MockLink.displayName = "Link";
  return MockLink;
});

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

  it("renders a Dashboard navigation link", () => {
    render(<NavBar activePage="dashboard" />);
    expect(screen.getByRole("link", { name: "Dashboard" })).toBeInTheDocument();
  });

  it("renders a Profile navigation link", () => {
    render(<NavBar activePage="dashboard" />);
    expect(screen.getByRole("link", { name: "Profile" })).toBeInTheDocument();
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
    expect(screen.getByText("Alice Smith")).toBeInTheDocument();
  });

  it("shows the Sign Out button", () => {
    render(<NavBar activePage="dashboard" />);
    expect(screen.getByRole("button", { name: "Sign Out" })).toBeInTheDocument();
  });

  it("calls signOut when the Sign Out button is clicked", async () => {
    render(<NavBar activePage="dashboard" />);
    await userEvent.click(screen.getByRole("button", { name: "Sign Out" }));
    expect(mockSignOutFn).toHaveBeenCalledWith({ callbackUrl: "/login" });
  });
});

describe("NavBar — activePage styling", () => {
  beforeEach(() => {
    mockUseSession.mockReturnValue({ data: null });
  });

  it("applies active (indigo) class to the Dashboard link when activePage='dashboard'", () => {
    render(<NavBar activePage="dashboard" />);
    const link = screen.getByRole("link", { name: "Dashboard" });
    expect(link.className).toContain("indigo");
  });

  it("applies inactive class to Profile link when activePage='dashboard'", () => {
    render(<NavBar activePage="dashboard" />);
    const link = screen.getByRole("link", { name: "Profile" });
    expect(link.className).not.toContain("font-semibold");
  });

  it("applies active (indigo) class to the Profile link when activePage='profile'", () => {
    render(<NavBar activePage="profile" />);
    const link = screen.getByRole("link", { name: "Profile" });
    expect(link.className).toContain("indigo");
  });

  it("applies inactive class to Dashboard link when activePage='profile'", () => {
    render(<NavBar activePage="profile" />);
    const link = screen.getByRole("link", { name: "Dashboard" });
    expect(link.className).not.toContain("font-semibold");
  });
});
