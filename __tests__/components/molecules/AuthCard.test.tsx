import { render, screen } from "@testing-library/react";
import React from "react";
import AuthCard from "@/components/molecules/AuthCard";

describe("AuthCard — rendering", () => {
  it("renders the title", () => {
    render(<AuthCard title="Work Leave Tracker"><p>form</p></AuthCard>);
    expect(screen.getByRole("heading", { name: "Work Leave Tracker" })).toBeInTheDocument();
  });

  it("renders children inside the card", () => {
    render(
      <AuthCard title="Sign In">
        <button>Sign In</button>
      </AuthCard>
    );
    expect(screen.getByRole("button", { name: "Sign In" })).toBeInTheDocument();
  });

  it("renders the gradient background container", () => {
    const { container } = render(
      <AuthCard title="Test"><p>content</p></AuthCard>
    );
    const outerDiv = container.firstChild as HTMLElement;
    expect(outerDiv).toHaveClass("min-h-screen", "bg-gradient-to-br");
  });

  it("renders the white card panel", () => {
    const { container } = render(
      <AuthCard title="Test"><p>content</p></AuthCard>
    );
    const card = container.querySelector(".bg-white.rounded-2xl");
    expect(card).toBeInTheDocument();
  });
});

describe("AuthCard — subtitle", () => {
  it("renders the subtitle when provided", () => {
    render(
      <AuthCard title="Sign In" subtitle="Sign in to manage your leave">
        <p>form</p>
      </AuthCard>
    );
    expect(screen.getByText("Sign in to manage your leave")).toBeInTheDocument();
  });

  it("does not render a subtitle element when omitted", () => {
    const { container } = render(
      <AuthCard title="Sign In"><p>form</p></AuthCard>
    );
    // No <p> subtitle below heading
    expect(container.querySelector(".text-gray-500.mb-6")).not.toBeInTheDocument();
  });
});

describe("AuthCard — footer", () => {
  it("renders footer content when provided", () => {
    render(
      <AuthCard title="Sign In" footer={<a href="/register">Register</a>}>
        <p>form</p>
      </AuthCard>
    );
    expect(screen.getByRole("link", { name: "Register" })).toBeInTheDocument();
  });

  it("does not render footer wrapper when omitted", () => {
    const { container } = render(
      <AuthCard title="Sign In"><p>form</p></AuthCard>
    );
    // No footer div
    expect(container.querySelector(".text-sm.text-center.mt-4")).not.toBeInTheDocument();
  });
});
