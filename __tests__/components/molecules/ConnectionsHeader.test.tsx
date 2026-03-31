import { render, screen } from "@testing-library/react";
import React from "react";
import ConnectionsHeader from "@/components/molecules/ConnectionsHeader";

describe("ConnectionsHeader — rendering", () => {
  it("renders the 'Connections' heading", () => {
    render(<ConnectionsHeader manageHref="/connections" />);
    expect(screen.getByText("Connections")).toBeInTheDocument();
  });

  it("renders the component with data-testid", () => {
    const { getByTestId } = render(<ConnectionsHeader manageHref="/connections" />);
    expect(getByTestId("connections-header")).toBeInTheDocument();
  });

  it("renders the 'Manage' link pointing to the provided href", () => {
    render(<ConnectionsHeader manageHref="/connections" />);
    const link = screen.getByRole("link", { name: /manage/i });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute("href", "/connections");
  });

  it("renders the Users icon inside the Manage link", () => {
    render(<ConnectionsHeader manageHref="/connections" />);
    const link = screen.getByRole("link", { name: /manage/i });
    expect(link.querySelector("svg")).toBeInTheDocument();
  });
});

describe("ConnectionsHeader — pending badge", () => {
  it("does not render a pending badge when pendingCount is 0 (default)", () => {
    const { queryByTestId } = render(<ConnectionsHeader manageHref="/connections" />);
    expect(queryByTestId("pending-badge")).not.toBeInTheDocument();
  });

  it("does not render a pending badge when pendingCount is explicitly 0", () => {
    const { queryByTestId } = render(
      <ConnectionsHeader manageHref="/connections" pendingCount={0} />
    );
    expect(queryByTestId("pending-badge")).not.toBeInTheDocument();
  });

  it("renders a pending badge when pendingCount > 0", () => {
    const { getByTestId } = render(
      <ConnectionsHeader manageHref="/connections" pendingCount={3} />
    );
    expect(getByTestId("pending-badge")).toBeInTheDocument();
  });

  it("renders the pending count in the badge", () => {
    render(<ConnectionsHeader manageHref="/connections" pendingCount={5} />);
    expect(screen.getByTestId("pending-badge")).toHaveTextContent("5 pending");
  });

  it("renders with count=1 pending", () => {
    render(<ConnectionsHeader manageHref="/connections" pendingCount={1} />);
    expect(screen.getByTestId("pending-badge")).toHaveTextContent("1 pending");
  });
});
