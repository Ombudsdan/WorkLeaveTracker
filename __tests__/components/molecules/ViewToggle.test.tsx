import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import ViewToggle from "@/components/molecules/ViewToggle";

type MobileView = "list" | "calendar";

const defaultOptions: [{ value: MobileView; label: string }, { value: MobileView; label: string }] = [
  { value: "list", label: "Upcoming Leave" },
  { value: "calendar", label: "Calendar" },
];

function setup() {
  return userEvent.setup();
}

describe("ViewToggle — rendering", () => {
  it("renders both option buttons", () => {
    render(
      <ViewToggle options={defaultOptions} value="list" onChange={jest.fn()} />
    );
    expect(screen.getByRole("button", { name: "Upcoming Leave" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Calendar" })).toBeInTheDocument();
  });

  it("renders with the data-testid attribute", () => {
    const { getByTestId } = render(
      <ViewToggle options={defaultOptions} value="list" onChange={jest.fn()} />
    );
    expect(getByTestId("view-toggle")).toBeInTheDocument();
  });

  it("renders a group with aria-label 'View toggle'", () => {
    render(
      <ViewToggle options={defaultOptions} value="list" onChange={jest.fn()} />
    );
    expect(screen.getByRole("group", { name: "View toggle" })).toBeInTheDocument();
  });

  it("applies an extra className to the outer container when provided", () => {
    const { container } = render(
      <ViewToggle
        options={defaultOptions}
        value="list"
        onChange={jest.fn()}
        className="lg:hidden"
      />
    );
    expect(container.firstChild).toHaveClass("lg:hidden");
  });
});

describe("ViewToggle — active state", () => {
  it("marks the active option with aria-pressed=true", () => {
    render(
      <ViewToggle options={defaultOptions} value="list" onChange={jest.fn()} />
    );
    expect(screen.getByRole("button", { name: "Upcoming Leave" })).toHaveAttribute(
      "aria-pressed",
      "true"
    );
  });

  it("marks the inactive option with aria-pressed=false", () => {
    render(
      <ViewToggle options={defaultOptions} value="list" onChange={jest.fn()} />
    );
    expect(screen.getByRole("button", { name: "Calendar" })).toHaveAttribute(
      "aria-pressed",
      "false"
    );
  });

  it("applies indigo border to the active option", () => {
    render(
      <ViewToggle options={defaultOptions} value="calendar" onChange={jest.fn()} />
    );
    const calendarBtn = screen.getByRole("button", { name: "Calendar" });
    expect(calendarBtn).toHaveClass("border-indigo-500", "text-indigo-700");
  });

  it("applies transparent border to inactive options", () => {
    render(
      <ViewToggle options={defaultOptions} value="calendar" onChange={jest.fn()} />
    );
    const listBtn = screen.getByRole("button", { name: "Upcoming Leave" });
    expect(listBtn).toHaveClass("border-transparent", "text-gray-500");
  });
});

describe("ViewToggle — interaction", () => {
  it("calls onChange with the clicked option's value", async () => {
    const user = setup();
    const onChange = jest.fn();
    render(
      <ViewToggle options={defaultOptions} value="list" onChange={onChange} />
    );
    await user.click(screen.getByRole("button", { name: "Calendar" }));
    expect(onChange).toHaveBeenCalledWith("calendar");
  });

  it("calls onChange when the already-active option is clicked", async () => {
    const user = setup();
    const onChange = jest.fn();
    render(
      <ViewToggle options={defaultOptions} value="list" onChange={onChange} />
    );
    await user.click(screen.getByRole("button", { name: "Upcoming Leave" }));
    expect(onChange).toHaveBeenCalledWith("list");
  });
});
