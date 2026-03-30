import { render, screen } from "@testing-library/react";
import React from "react";
import Pill from "@/components/atoms/Pill";

describe("Pill — rendering", () => {
  it("renders the provided label text", () => {
    render(<Pill label="pending" />);
    expect(screen.getByText("pending")).toBeInTheDocument();
  });

  it("renders as an inline <span>", () => {
    const { container } = render(<Pill label="ended" />);
    expect(container.firstChild?.nodeName).toBe("SPAN");
  });
});

describe("Pill — variant colour classes", () => {
  it("applies default grey classes when no variant is specified", () => {
    const { container } = render(<Pill label="default" />);
    expect(container.firstChild).toHaveClass("bg-gray-100", "text-gray-700");
  });

  it("applies primary indigo classes for variant='primary'", () => {
    const { container } = render(<Pill label="primary" variant="primary" />);
    expect(container.firstChild).toHaveClass("bg-indigo-100", "text-indigo-700");
  });

  it("applies success green classes for variant='success'", () => {
    const { container } = render(<Pill label="success" variant="success" />);
    expect(container.firstChild).toHaveClass("bg-green-100", "text-green-700");
  });

  it("applies warning amber classes for variant='warning'", () => {
    const { container } = render(<Pill label="warning" variant="warning" />);
    expect(container.firstChild).toHaveClass("bg-amber-100", "text-amber-700");
  });

  it("applies danger red classes for variant='danger'", () => {
    const { container } = render(<Pill label="danger" variant="danger" />);
    expect(container.firstChild).toHaveClass("bg-red-100", "text-red-700");
  });

  it("applies muted classes for variant='muted'", () => {
    const { container } = render(<Pill label="ended" variant="muted" />);
    expect(container.firstChild).toHaveClass("bg-gray-50", "text-gray-400", "border");
  });
});

describe("Pill — base styling", () => {
  it("always contains a rounded-full class", () => {
    const { container } = render(<Pill label="x" />);
    expect(container.firstChild).toHaveClass("rounded-full");
  });

  it("merges an extra className onto the element", () => {
    const { container } = render(<Pill label="tag" className="mt-2" />);
    expect(container.firstChild).toHaveClass("mt-2");
  });
});
