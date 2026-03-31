import { render, screen } from "@testing-library/react";
import React from "react";
import AvatarInitials from "@/components/atoms/AvatarInitials";

describe("AvatarInitials — initials derivation", () => {
  it("displays the first letter of each name in uppercase", () => {
    render(<AvatarInitials firstName="Jane" lastName="Doe" />);
    expect(screen.getByText("JD")).toBeInTheDocument();
  });

  it("uppercases a lower-case first character", () => {
    render(<AvatarInitials firstName="alice" lastName="brown" />);
    expect(screen.getByText("AB")).toBeInTheDocument();
  });

  it("handles single-character names", () => {
    render(<AvatarInitials firstName="A" lastName="Z" />);
    expect(screen.getByText("AZ")).toBeInTheDocument();
  });
});

describe("AvatarInitials — accessibility", () => {
  it("provides an aria-label of 'firstName lastName'", () => {
    render(<AvatarInitials firstName="Jane" lastName="Doe" />);
    expect(screen.getByLabelText("Jane Doe")).toBeInTheDocument();
  });

  it("updates aria-label when names change", () => {
    const { rerender } = render(<AvatarInitials firstName="Ana" lastName="Ruiz" />);
    expect(screen.getByLabelText("Ana Ruiz")).toBeInTheDocument();
    rerender(<AvatarInitials firstName="Tom" lastName="Smith" />);
    expect(screen.getByLabelText("Tom Smith")).toBeInTheDocument();
  });
});

describe("AvatarInitials — size variants", () => {
  it("applies xs container class for size='xs'", () => {
    const { container } = render(<AvatarInitials firstName="J" lastName="D" size="xs" />);
    expect(container.firstChild).toHaveClass("w-5", "h-5");
  });

  it("applies sm container class for size='sm' (default)", () => {
    const { container } = render(<AvatarInitials firstName="J" lastName="D" />);
    expect(container.firstChild).toHaveClass("w-7", "h-7");
  });

  it("applies md container class for size='md'", () => {
    const { container } = render(<AvatarInitials firstName="J" lastName="D" size="md" />);
    expect(container.firstChild).toHaveClass("w-9", "h-9");
  });

  it("applies lg container class for size='lg'", () => {
    const { container } = render(<AvatarInitials firstName="J" lastName="D" size="lg" />);
    expect(container.firstChild).toHaveClass("w-12", "h-12");
  });
});

describe("AvatarInitials — base styling", () => {
  it("always renders as a rounded-full element", () => {
    const { container } = render(<AvatarInitials firstName="J" lastName="D" />);
    expect(container.firstChild).toHaveClass("rounded-full");
  });

  it("applies indigo colour classes", () => {
    const { container } = render(<AvatarInitials firstName="J" lastName="D" />);
    expect(container.firstChild).toHaveClass("bg-indigo-100", "text-indigo-700");
  });

  it("merges an extra className", () => {
    const { container } = render(
      <AvatarInitials firstName="J" lastName="D" className="my-custom-class" />
    );
    expect(container.firstChild).toHaveClass("my-custom-class");
  });
});
