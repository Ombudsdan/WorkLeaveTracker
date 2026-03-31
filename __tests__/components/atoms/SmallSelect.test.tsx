import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import SmallSelect from "@/components/atoms/SmallSelect";

const OPTIONS = [
  { value: "month", label: "Month" },
  { value: "year", label: "Year" },
];

describe("SmallSelect — rendering", () => {
  it("renders a <select> element", () => {
    render(
      <SmallSelect
        value="month"
        onChange={jest.fn()}
        options={OPTIONS}
        ariaLabel="Calendar view mode"
      />
    );
    expect(screen.getByRole("combobox")).toBeInTheDocument();
  });

  it("renders all provided options", () => {
    render(
      <SmallSelect
        value="month"
        onChange={jest.fn()}
        options={OPTIONS}
        ariaLabel="Calendar view mode"
      />
    );
    expect(screen.getByRole("option", { name: "Month" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Year" })).toBeInTheDocument();
  });

  it("shows the currently selected value", () => {
    render(
      <SmallSelect
        value="year"
        onChange={jest.fn()}
        options={OPTIONS}
        ariaLabel="Calendar view mode"
      />
    );
    expect(screen.getByRole("combobox")).toHaveValue("year");
  });
});

describe("SmallSelect — accessibility", () => {
  it("applies aria-label to the select element", () => {
    render(
      <SmallSelect
        value="month"
        onChange={jest.fn()}
        options={OPTIONS}
        ariaLabel="Calendar view mode"
      />
    );
    expect(screen.getByRole("combobox", { name: "Calendar view mode" })).toBeInTheDocument();
  });

  it("forwards an id to the underlying select", () => {
    render(
      <SmallSelect
        id="my-select"
        value="month"
        onChange={jest.fn()}
        options={OPTIONS}
        ariaLabel="Label"
      />
    );
    expect(screen.getByRole("combobox")).toHaveAttribute("id", "my-select");
  });
});

describe("SmallSelect — interaction", () => {
  it("calls onChange with the new value when selection changes", async () => {
    const handleChange = jest.fn();
    render(
      <SmallSelect
        value="month"
        onChange={handleChange}
        options={OPTIONS}
        ariaLabel="Calendar view mode"
      />
    );
    await userEvent.selectOptions(screen.getByRole("combobox"), "year");
    expect(handleChange).toHaveBeenCalledWith("year");
  });

  it("calls onChange only once per selection change", async () => {
    const handleChange = jest.fn();
    render(
      <SmallSelect
        value="month"
        onChange={handleChange}
        options={OPTIONS}
        ariaLabel="Calendar view mode"
      />
    );
    await userEvent.selectOptions(screen.getByRole("combobox"), "year");
    expect(handleChange).toHaveBeenCalledTimes(1);
  });
});

describe("SmallSelect — styling", () => {
  it("applies compact text-xs class", () => {
    render(<SmallSelect value="month" onChange={jest.fn()} options={OPTIONS} ariaLabel="Label" />);
    expect(screen.getByRole("combobox")).toHaveClass("text-xs");
  });

  it("merges an additional className", () => {
    render(
      <SmallSelect
        value="month"
        onChange={jest.fn()}
        options={OPTIONS}
        ariaLabel="Label"
        className="ml-2"
      />
    );
    expect(screen.getByRole("combobox")).toHaveClass("ml-2");
  });
});
