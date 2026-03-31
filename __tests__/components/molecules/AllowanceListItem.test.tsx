import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import AllowanceListItem from "@/components/molecules/AllowanceListItem";
import type { YearAllowance } from "@/types";

function setup() {
  return userEvent.setup();
}

const activeAllowance: YearAllowance = {
  year: 2026,
  company: "Acme Corp",
  holidayStartMonth: 1,
  core: 25,
  bought: 0,
  carried: 0,
  active: true,
};

const pastAllowance: YearAllowance = {
  year: 2024,
  company: "Old Co",
  holidayStartMonth: 1,
  core: 20,
  bought: 2,
  carried: 1,
};

const inactiveAllowance: YearAllowance = {
  year: 2025,
  company: "Left Co",
  holidayStartMonth: 1,
  core: 25,
  bought: 0,
  carried: 0,
  active: false,
};

describe("AllowanceListItem — rendering", () => {
  it("renders the item container with data-testid", () => {
    const { getByTestId } = render(
      <AllowanceListItem allowance={activeAllowance} currentYear={2026} />
    );
    expect(getByTestId("allowance-list-item")).toBeInTheDocument();
  });

  it("renders the year", () => {
    render(<AllowanceListItem allowance={activeAllowance} currentYear={2026} />);
    expect(screen.getByText(/2026/)).toBeInTheDocument();
  });

  it("renders the company name when provided", () => {
    render(<AllowanceListItem allowance={activeAllowance} currentYear={2026} />);
    expect(screen.getByText(/Acme Corp/)).toBeInTheDocument();
  });

  it("does not render a company label when company is empty string", () => {
    const noCompany: YearAllowance = { ...activeAllowance, company: "" };
    const { getByTestId } = render(<AllowanceListItem allowance={noCompany} currentYear={2026} />);
    // Company span should not exist
    const item = getByTestId("allowance-list-item");
    expect(item.querySelector("span.opacity-70")).not.toBeInTheDocument();
  });
});

describe("AllowanceListItem — current year (active)", () => {
  it("applies indigo highlight classes for the current year", () => {
    const { getByTestId } = render(
      <AllowanceListItem allowance={activeAllowance} currentYear={2026} />
    );
    expect(getByTestId("allowance-list-item")).toHaveClass("bg-indigo-50", "border-indigo-200");
  });

  it("renders a CheckCircle icon for the current active year", () => {
    const { container } = render(
      <AllowanceListItem allowance={activeAllowance} currentYear={2026} />
    );
    // CheckCircle renders as SVG; Circle also renders as SVG — distinguish by class
    const svgs = container.querySelectorAll("svg");
    expect(svgs.length).toBeGreaterThan(0);
    // The item should have indigo color applied to the icon
    const icon = container.querySelector(".text-indigo-600");
    expect(icon).toBeInTheDocument();
  });
});

describe("AllowanceListItem — past year (non-active, non-inactive)", () => {
  it("applies grey classes for a past year that is not the current year", () => {
    const { getByTestId } = render(
      <AllowanceListItem allowance={pastAllowance} currentYear={2026} />
    );
    expect(getByTestId("allowance-list-item")).toHaveClass(
      "bg-gray-50",
      "border-gray-200",
      "text-gray-600"
    );
  });

  it("renders a Circle icon (not CheckCircle) for a non-current year", () => {
    const { container } = render(
      <AllowanceListItem allowance={pastAllowance} currentYear={2026} />
    );
    // No indigo-600 icon
    expect(container.querySelector(".text-indigo-600")).not.toBeInTheDocument();
    expect(container.querySelector(".text-gray-300")).toBeInTheDocument();
  });
});

describe("AllowanceListItem — inactive (ended)", () => {
  it("applies muted opacity classes for inactive allowances", () => {
    const { getByTestId } = render(
      <AllowanceListItem allowance={inactiveAllowance} currentYear={2026} />
    );
    const item = getByTestId("allowance-list-item");
    expect(item).toHaveClass("opacity-60", "text-gray-400");
  });

  it("renders the '(ended)' label for inactive allowances", () => {
    render(<AllowanceListItem allowance={inactiveAllowance} currentYear={2026} />);
    expect(screen.getByText("(ended)")).toBeInTheDocument();
  });

  it("does not render an Edit button for inactive allowances", () => {
    render(
      <AllowanceListItem allowance={inactiveAllowance} currentYear={2026} onEdit={jest.fn()} />
    );
    expect(screen.queryByRole("button", { name: "Edit" })).not.toBeInTheDocument();
  });
});

describe("AllowanceListItem — Edit button", () => {
  it("renders an Edit button for active allowances when onEdit is provided", () => {
    render(<AllowanceListItem allowance={activeAllowance} currentYear={2026} onEdit={jest.fn()} />);
    expect(screen.getByRole("button", { name: "Edit" })).toBeInTheDocument();
  });

  it("does not render an Edit button when onEdit is not provided", () => {
    render(<AllowanceListItem allowance={activeAllowance} currentYear={2026} />);
    expect(screen.queryByRole("button", { name: "Edit" })).not.toBeInTheDocument();
  });

  it("calls onEdit with the allowance when Edit is clicked", async () => {
    const user = setup();
    const onEdit = jest.fn();
    render(<AllowanceListItem allowance={activeAllowance} currentYear={2026} onEdit={onEdit} />);
    await user.click(screen.getByRole("button", { name: "Edit" }));
    expect(onEdit).toHaveBeenCalledWith(activeAllowance);
  });

  it("renders Edit button for a past non-inactive allowance when onEdit is provided", () => {
    render(<AllowanceListItem allowance={pastAllowance} currentYear={2026} onEdit={jest.fn()} />);
    expect(screen.getByRole("button", { name: "Edit" })).toBeInTheDocument();
  });
});
