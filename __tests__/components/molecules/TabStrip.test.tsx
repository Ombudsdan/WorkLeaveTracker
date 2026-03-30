import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import TabStrip from "@/components/molecules/TabStrip";

type ProfileTab = "profile" | "past-leave";

const tabs = [
  { id: "profile" as ProfileTab, label: "Profile" },
  { id: "past-leave" as ProfileTab, label: "Past Leave" },
];

function setup() {
  return userEvent.setup();
}

describe("TabStrip — rendering", () => {
  it("renders a tablist container", () => {
    render(<TabStrip tabs={tabs} activeTab="profile" onChange={jest.fn()} />);
    expect(screen.getByRole("tablist")).toBeInTheDocument();
  });

  it("renders a tab button for each tab", () => {
    render(<TabStrip tabs={tabs} activeTab="profile" onChange={jest.fn()} />);
    expect(screen.getByRole("tab", { name: "Profile" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Past Leave" })).toBeInTheDocument();
  });

  it("applies an extra className to the outer container when provided", () => {
    const { container } = render(
      <TabStrip tabs={tabs} activeTab="profile" onChange={jest.fn()} className="mb-6" />
    );
    expect(container.firstChild).toHaveClass("mb-6");
  });
});

describe("TabStrip — active state", () => {
  it("marks the active tab with aria-selected=true", () => {
    render(<TabStrip tabs={tabs} activeTab="profile" onChange={jest.fn()} />);
    expect(screen.getByRole("tab", { name: "Profile" })).toHaveAttribute("aria-selected", "true");
  });

  it("marks inactive tabs with aria-selected=false", () => {
    render(<TabStrip tabs={tabs} activeTab="profile" onChange={jest.fn()} />);
    expect(screen.getByRole("tab", { name: "Past Leave" })).toHaveAttribute(
      "aria-selected",
      "false"
    );
  });

  it("applies active indigo classes to the selected tab", () => {
    render(<TabStrip tabs={tabs} activeTab="past-leave" onChange={jest.fn()} />);
    const pastLeaveTab = screen.getByRole("tab", { name: "Past Leave" });
    expect(pastLeaveTab).toHaveClass("border-indigo-600", "text-indigo-700", "bg-indigo-50");
  });

  it("applies muted classes to inactive tabs", () => {
    render(<TabStrip tabs={tabs} activeTab="profile" onChange={jest.fn()} />);
    const pastLeaveTab = screen.getByRole("tab", { name: "Past Leave" });
    expect(pastLeaveTab).toHaveClass("border-transparent", "text-gray-500");
  });
});

describe("TabStrip — interaction", () => {
  it("calls onChange with the clicked tab id", async () => {
    const user = setup();
    const onChange = jest.fn();
    render(<TabStrip tabs={tabs} activeTab="profile" onChange={onChange} />);
    await user.click(screen.getByRole("tab", { name: "Past Leave" }));
    expect(onChange).toHaveBeenCalledWith("past-leave");
  });

  it("calls onChange when the already-active tab is clicked", async () => {
    const user = setup();
    const onChange = jest.fn();
    render(<TabStrip tabs={tabs} activeTab="profile" onChange={onChange} />);
    await user.click(screen.getByRole("tab", { name: "Profile" }));
    expect(onChange).toHaveBeenCalledWith("profile");
  });
});
