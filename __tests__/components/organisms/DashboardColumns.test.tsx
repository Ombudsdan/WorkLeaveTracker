import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import DashboardColumns from "@/components/organisms/DashboardColumns";

function setup() {
  return userEvent.setup();
}

describe("DashboardColumns — slot rendering", () => {
  it("renders the container with data-testid", () => {
    render(
      <DashboardColumns
        mobileView="list"
        onMobileViewChange={jest.fn()}
        left={<span>Left</span>}
        center={<span>Center</span>}
        right={<span>Right</span>}
      />
    );
    expect(screen.getByTestId("dashboard-columns")).toBeInTheDocument();
  });

  it("renders left slot content", () => {
    render(
      <DashboardColumns
        mobileView="list"
        onMobileViewChange={jest.fn()}
        left={<span>Left Content</span>}
        center={<span />}
        right={<span />}
      />
    );
    expect(screen.getByText("Left Content")).toBeInTheDocument();
  });

  it("renders center slot content", () => {
    render(
      <DashboardColumns
        mobileView="list"
        onMobileViewChange={jest.fn()}
        left={<span />}
        center={<span>Center Content</span>}
        right={<span />}
      />
    );
    expect(screen.getByText("Center Content")).toBeInTheDocument();
  });

  it("renders right slot content", () => {
    render(
      <DashboardColumns
        mobileView="list"
        onMobileViewChange={jest.fn()}
        left={<span />}
        center={<span />}
        right={<span>Right Content</span>}
      />
    );
    expect(screen.getByText("Right Content")).toBeInTheDocument();
  });
});

describe("DashboardColumns — ViewToggle", () => {
  it("renders the ViewToggle with Upcoming Leave option", () => {
    render(
      <DashboardColumns
        mobileView="list"
        onMobileViewChange={jest.fn()}
        left={<span />}
        center={<span />}
        right={<span />}
      />
    );
    expect(screen.getByRole("button", { name: "Upcoming Leave" })).toBeInTheDocument();
  });

  it("renders the ViewToggle with Calendar option", () => {
    render(
      <DashboardColumns
        mobileView="list"
        onMobileViewChange={jest.fn()}
        left={<span />}
        center={<span />}
        right={<span />}
      />
    );
    expect(screen.getByRole("button", { name: "Calendar" })).toBeInTheDocument();
  });

  it("calls onMobileViewChange with 'calendar' when Calendar button is clicked", async () => {
    const user = setup();
    const onChange = jest.fn();
    render(
      <DashboardColumns
        mobileView="list"
        onMobileViewChange={onChange}
        left={<span />}
        center={<span />}
        right={<span />}
      />
    );
    await user.click(screen.getByRole("button", { name: "Calendar" }));
    expect(onChange).toHaveBeenCalledWith("calendar");
  });

  it("calls onMobileViewChange with 'list' when Upcoming Leave button is clicked", async () => {
    const user = setup();
    const onChange = jest.fn();
    render(
      <DashboardColumns
        mobileView="calendar"
        onMobileViewChange={onChange}
        left={<span />}
        center={<span />}
        right={<span />}
      />
    );
    await user.click(screen.getByRole("button", { name: "Upcoming Leave" }));
    expect(onChange).toHaveBeenCalledWith("list");
  });
});

describe("DashboardColumns — column visibility (mobileView='list')", () => {
  it("left-column has 'block' class when mobileView is list", () => {
    render(
      <DashboardColumns
        mobileView="list"
        onMobileViewChange={jest.fn()}
        left={<span />}
        center={<span />}
        right={<span />}
      />
    );
    expect(screen.getByTestId("left-column")).toHaveClass("block");
  });

  it("left-column does not have 'hidden' class when mobileView is list", () => {
    render(
      <DashboardColumns
        mobileView="list"
        onMobileViewChange={jest.fn()}
        left={<span />}
        center={<span />}
        right={<span />}
      />
    );
    expect(screen.getByTestId("left-column")).not.toHaveClass("hidden");
  });

  it("center-column has 'hidden' class when mobileView is list", () => {
    render(
      <DashboardColumns
        mobileView="list"
        onMobileViewChange={jest.fn()}
        left={<span />}
        center={<span />}
        right={<span />}
      />
    );
    expect(screen.getByTestId("center-column")).toHaveClass("hidden");
  });

  it("right-column has 'block' class when mobileView is list", () => {
    render(
      <DashboardColumns
        mobileView="list"
        onMobileViewChange={jest.fn()}
        left={<span />}
        center={<span />}
        right={<span />}
      />
    );
    expect(screen.getByTestId("right-column")).toHaveClass("block");
  });
});

describe("DashboardColumns — column visibility (mobileView='calendar')", () => {
  it("left-column has 'hidden' class when mobileView is calendar", () => {
    render(
      <DashboardColumns
        mobileView="calendar"
        onMobileViewChange={jest.fn()}
        left={<span />}
        center={<span />}
        right={<span />}
      />
    );
    expect(screen.getByTestId("left-column")).toHaveClass("hidden");
  });

  it("center-column has 'block' class when mobileView is calendar", () => {
    render(
      <DashboardColumns
        mobileView="calendar"
        onMobileViewChange={jest.fn()}
        left={<span />}
        center={<span />}
        right={<span />}
      />
    );
    expect(screen.getByTestId("center-column")).toHaveClass("block");
  });

  it("right-column has 'hidden' class when mobileView is calendar", () => {
    render(
      <DashboardColumns
        mobileView="calendar"
        onMobileViewChange={jest.fn()}
        left={<span />}
        center={<span />}
        right={<span />}
      />
    );
    expect(screen.getByTestId("right-column")).toHaveClass("hidden");
  });
});
