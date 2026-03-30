import { render, screen } from "@testing-library/react";
import React from "react";
import { Eye } from "lucide-react";
import Alert from "@/components/atoms/Alert";

describe("Alert — rendering", () => {
  it("renders its children as the main message", () => {
    render(<Alert>Something went wrong</Alert>);
    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
  });

  it("renders complex child content with bold text", () => {
    render(
      <Alert>
        You are viewing <strong>Jane Doe</strong>
      </Alert>
    );
    expect(screen.getByText("Jane Doe")).toBeInTheDocument();
  });

  it("has role='alert' for screen reader announcements", () => {
    render(<Alert>Watch out</Alert>);
    expect(screen.getByRole("alert")).toBeInTheDocument();
  });
});

describe("Alert — variant colour classes", () => {
  it("applies warning amber classes by default", () => {
    render(<Alert>Warning</Alert>);
    expect(screen.getByRole("alert")).toHaveClass(
      "bg-amber-50",
      "border-amber-300",
      "text-amber-800"
    );
  });

  it("applies info blue classes for variant='info'", () => {
    render(<Alert variant="info">Info</Alert>);
    expect(screen.getByRole("alert")).toHaveClass("bg-blue-50", "border-blue-300", "text-blue-800");
  });

  it("applies danger red classes for variant='danger'", () => {
    render(<Alert variant="danger">Danger</Alert>);
    expect(screen.getByRole("alert")).toHaveClass("bg-red-50", "border-red-300", "text-red-800");
  });

  it("applies success green classes for variant='success'", () => {
    render(<Alert variant="success">Success</Alert>);
    expect(screen.getByRole("alert")).toHaveClass(
      "bg-green-50",
      "border-green-300",
      "text-green-800"
    );
  });
});

describe("Alert — optional icon slot", () => {
  it("renders the icon element when provided", () => {
    render(
      <Alert icon={<Eye size={16} data-testid="eye-icon" />}>Read-only view</Alert>
    );
    expect(screen.getByRole("alert").querySelector("svg")).toBeInTheDocument();
  });

  it("does not render an icon wrapper when icon is omitted", () => {
    const { container } = render(<Alert>No icon</Alert>);
    // Only two children: the message span (and conditionally action span)
    // The icon wrapper span has aria-hidden; confirm it's absent
    const spans = container.querySelectorAll('[aria-hidden="true"]');
    expect(spans).toHaveLength(0);
  });
});

describe("Alert — optional action slot", () => {
  it("renders an action node when provided", () => {
    render(
      <Alert action={<button>Configure now</button>}>Your allowance needs attention</Alert>
    );
    expect(screen.getByRole("button", { name: "Configure now" })).toBeInTheDocument();
  });

  it("does not render an action wrapper when action is omitted", () => {
    render(<Alert>Just a message</Alert>);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});

describe("Alert — extra className", () => {
  it("merges an extra className onto the alert container", () => {
    render(<Alert className="mb-4">Message</Alert>);
    expect(screen.getByRole("alert")).toHaveClass("mb-4");
  });
});
