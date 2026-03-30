import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import WorkingDaysPicker from "@/components/molecules/WorkingDaysPicker";

function setup() {
  return userEvent.setup();
}

describe("WorkingDaysPicker — rendering", () => {
  it("renders a button for each day of the week", () => {
    render(<WorkingDaysPicker value={[1, 2, 3, 4, 5]} onChange={jest.fn()} />);
    // Sun Mon Tue Wed Thu Fri Sat
    const buttons = screen.getAllByRole("button");
    expect(buttons).toHaveLength(7);
  });

  it("renders the picker container with data-testid", () => {
    const { getByTestId } = render(
      <WorkingDaysPicker value={[]} onChange={jest.fn()} />
    );
    expect(getByTestId("working-days-picker")).toBeInTheDocument();
  });

  it("renders the hint text when provided", () => {
    render(
      <WorkingDaysPicker value={[1]} onChange={jest.fn()} hint="Select the days you work" />
    );
    expect(screen.getByText("Select the days you work")).toBeInTheDocument();
  });

  it("does not render hint text when omitted", () => {
    const { container } = render(<WorkingDaysPicker value={[1]} onChange={jest.fn()} />);
    expect(container.querySelector("p")).not.toBeInTheDocument();
  });
});

describe("WorkingDaysPicker — selected state", () => {
  it("marks selected days with aria-pressed=true", () => {
    render(<WorkingDaysPicker value={[1, 3]} onChange={jest.fn()} />);
    const buttons = screen.getAllByRole("button");
    expect(buttons[1]).toHaveAttribute("aria-pressed", "true");  // Mon
    expect(buttons[3]).toHaveAttribute("aria-pressed", "true");  // Wed
  });

  it("marks unselected days with aria-pressed=false", () => {
    render(<WorkingDaysPicker value={[1]} onChange={jest.fn()} />);
    const buttons = screen.getAllByRole("button");
    expect(buttons[0]).toHaveAttribute("aria-pressed", "false"); // Sun
    expect(buttons[6]).toHaveAttribute("aria-pressed", "false"); // Sat
  });

  it("renders a Check icon inside selected day buttons", () => {
    const { container } = render(<WorkingDaysPicker value={[1]} onChange={jest.fn()} />);
    const buttons = container.querySelectorAll("button");
    // Monday (index 1) should contain an svg (the Check icon)
    expect(buttons[1].querySelector("svg")).toBeInTheDocument();
    // Sunday (index 0) should not contain an svg
    expect(buttons[0].querySelector("svg")).not.toBeInTheDocument();
  });

  it("applies green classes to selected days", () => {
    const { container } = render(<WorkingDaysPicker value={[2]} onChange={jest.fn()} />);
    const tueButton = container.querySelectorAll("button")[2];
    expect(tueButton).toHaveClass("bg-green-100", "text-green-700");
  });

  it("applies grey classes to unselected days", () => {
    const { container } = render(<WorkingDaysPicker value={[]} onChange={jest.fn()} />);
    const sunButton = container.querySelectorAll("button")[0];
    expect(sunButton).toHaveClass("bg-gray-100", "text-gray-400");
  });
});

describe("WorkingDaysPicker — toggle interaction", () => {
  it("calls onChange with the day added when an unselected day is clicked", async () => {
    const user = setup();
    const onChange = jest.fn();
    render(<WorkingDaysPicker value={[1, 2, 3, 4, 5]} onChange={onChange} />);
    // Click Saturday (index 6) — currently unselected
    const buttons = screen.getAllByRole("button");
    await user.click(buttons[6]);
    expect(onChange).toHaveBeenCalledWith([1, 2, 3, 4, 5, 6]);
  });

  it("calls onChange with the day removed when a selected day is clicked", async () => {
    const user = setup();
    const onChange = jest.fn();
    render(<WorkingDaysPicker value={[1, 2, 3, 4, 5]} onChange={onChange} />);
    // Click Monday (index 1) — currently selected
    const buttons = screen.getAllByRole("button");
    await user.click(buttons[1]);
    expect(onChange).toHaveBeenCalledWith([2, 3, 4, 5]);
  });

  it("calls onChange with a single day when adding to an empty selection", async () => {
    const user = setup();
    const onChange = jest.fn();
    render(<WorkingDaysPicker value={[]} onChange={onChange} />);
    const buttons = screen.getAllByRole("button");
    await user.click(buttons[3]); // Wednesday
    expect(onChange).toHaveBeenCalledWith([3]);
  });
});
