import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import ManageConnectionsDrawer from "@/components/organisms/ManageConnectionsDrawer";

function setup() {
  return userEvent.setup();
}

describe("ManageConnectionsDrawer — closed state", () => {
  it("renders nothing when isOpen is false", () => {
    const { container } = render(
      <ManageConnectionsDrawer isOpen={false} onClose={jest.fn()}>
        <span>Content</span>
      </ManageConnectionsDrawer>
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("does not render the backdrop when isOpen is false", () => {
    render(
      <ManageConnectionsDrawer isOpen={false} onClose={jest.fn()}>
        <span />
      </ManageConnectionsDrawer>
    );
    expect(screen.queryByTestId("drawer-backdrop")).not.toBeInTheDocument();
  });

  it("does not render the drawer panel when isOpen is false", () => {
    render(
      <ManageConnectionsDrawer isOpen={false} onClose={jest.fn()}>
        <span />
      </ManageConnectionsDrawer>
    );
    expect(screen.queryByTestId("manage-connections-drawer")).not.toBeInTheDocument();
  });
});

describe("ManageConnectionsDrawer — open state", () => {
  it("renders the backdrop when isOpen is true", () => {
    render(
      <ManageConnectionsDrawer isOpen onClose={jest.fn()}>
        <span />
      </ManageConnectionsDrawer>
    );
    expect(screen.getByTestId("drawer-backdrop")).toBeInTheDocument();
  });

  it("renders the drawer panel with role=dialog when isOpen is true", () => {
    render(
      <ManageConnectionsDrawer isOpen onClose={jest.fn()}>
        <span />
      </ManageConnectionsDrawer>
    );
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("renders the drawer panel with data-testid", () => {
    render(
      <ManageConnectionsDrawer isOpen onClose={jest.fn()}>
        <span />
      </ManageConnectionsDrawer>
    );
    expect(screen.getByTestId("manage-connections-drawer")).toBeInTheDocument();
  });

  it("renders children inside the drawer", () => {
    render(
      <ManageConnectionsDrawer isOpen onClose={jest.fn()}>
        <span>My content</span>
      </ManageConnectionsDrawer>
    );
    expect(screen.getByText("My content")).toBeInTheDocument();
  });
});

describe("ManageConnectionsDrawer — title", () => {
  it("renders the default title 'Manage Connections' when no title prop given", () => {
    render(
      <ManageConnectionsDrawer isOpen onClose={jest.fn()}>
        <span />
      </ManageConnectionsDrawer>
    );
    expect(screen.getByText("Manage Connections")).toBeInTheDocument();
  });

  it("renders a custom title when the title prop is provided", () => {
    render(
      <ManageConnectionsDrawer isOpen onClose={jest.fn()} title="Notifications">
        <span />
      </ManageConnectionsDrawer>
    );
    expect(screen.getByText("Notifications")).toBeInTheDocument();
  });
});

describe("ManageConnectionsDrawer — closing", () => {
  it("calls onClose when the backdrop is clicked", async () => {
    const user = setup();
    const onClose = jest.fn();
    render(
      <ManageConnectionsDrawer isOpen onClose={onClose}>
        <span />
      </ManageConnectionsDrawer>
    );
    await user.click(screen.getByTestId("drawer-backdrop"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("calls onClose when the close button is clicked", async () => {
    const user = setup();
    const onClose = jest.fn();
    render(
      <ManageConnectionsDrawer isOpen onClose={onClose}>
        <span />
      </ManageConnectionsDrawer>
    );
    await user.click(screen.getByRole("button", { name: "Close" }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
