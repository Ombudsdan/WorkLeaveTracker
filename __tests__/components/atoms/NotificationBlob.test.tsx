import { render, screen } from "@testing-library/react";
import React from "react";
import NotificationBlob from "@/components/atoms/NotificationBlob";

describe("NotificationBlob — rendering", () => {
  it("renders the count when count > 0", () => {
    render(<NotificationBlob count={3} />);
    expect(screen.getByText("3")).toBeInTheDocument();
  });

  it("renders nothing when count is 0", () => {
    const { container } = render(<NotificationBlob count={0} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders nothing when count is negative", () => {
    const { container } = render(<NotificationBlob count={-1} />);
    expect(container.firstChild).toBeNull();
  });

  it("applies the correct default aria-label", () => {
    render(<NotificationBlob count={5} />);
    expect(screen.getByLabelText("5 notifications")).toBeInTheDocument();
  });

  it("uses a custom label in the aria-label", () => {
    render(<NotificationBlob count={2} label="pending requests" />);
    expect(screen.getByLabelText("2 pending requests")).toBeInTheDocument();
  });

  it("accepts and applies an extra className", () => {
    const { container } = render(<NotificationBlob count={1} className="ml-1" />);
    expect(container.firstChild).toHaveClass("ml-1");
  });
});
