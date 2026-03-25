import { render, screen } from "@testing-library/react";
import React from "react";
import StatusBadge from "@/components/atoms/StatusBadge";
import { LeaveStatus } from "@/types";

describe("StatusBadge — basic rendering", () => {
  it("renders 'Approved' label for Approved status", () => {
    render(<StatusBadge status={LeaveStatus.Approved} />);
    expect(screen.getByText("Approved")).toBeInTheDocument();
  });

  it("renders 'Requested' label for Requested status", () => {
    render(<StatusBadge status={LeaveStatus.Requested} />);
    expect(screen.getByText("Requested")).toBeInTheDocument();
  });

  it("renders 'Planned' label for Planned status", () => {
    render(<StatusBadge status={LeaveStatus.Planned} />);
    expect(screen.getByText("Planned")).toBeInTheDocument();
  });

  it("renders 'Sick' label when isSick=true regardless of status", () => {
    render(<StatusBadge status={LeaveStatus.Approved} isSick />);
    expect(screen.getByText("Sick")).toBeInTheDocument();
  });
});

describe("StatusBadge — colour classes", () => {
  it("applies green classes for Approved", () => {
    const { container } = render(<StatusBadge status={LeaveStatus.Approved} />);
    expect(container.firstChild).toHaveClass("bg-green-100", "text-green-800");
  });

  it("applies blue classes for Requested", () => {
    const { container } = render(<StatusBadge status={LeaveStatus.Requested} />);
    expect(container.firstChild).toHaveClass("bg-blue-100", "text-blue-800");
  });

  it("applies yellow classes for Planned", () => {
    const { container } = render(<StatusBadge status={LeaveStatus.Planned} />);
    expect(container.firstChild).toHaveClass("bg-yellow-100", "text-yellow-800");
  });

  it("applies red classes when isSick=true", () => {
    const { container } = render(<StatusBadge status={LeaveStatus.Approved} isSick />);
    expect(container.firstChild).toHaveClass("bg-red-100", "text-red-800");
  });

  it("accepts and applies an extra className", () => {
    const { container } = render(<StatusBadge status={LeaveStatus.Approved} className="mt-2" />);
    expect(container.firstChild).toHaveClass("mt-2");
  });
});
