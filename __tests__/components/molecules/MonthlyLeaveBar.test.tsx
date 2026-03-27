import { render, screen } from "@testing-library/react";
import React from "react";
import MonthlyLeaveBar from "@/components/molecules/MonthlyLeaveBar";

describe("MonthlyLeaveBar — basic rendering", () => {
  it("renders the month name", () => {
    render(
      <MonthlyLeaveBar
        monthName="January"
        approved={2}
        requested={1}
        planned={0}
        bankHolidays={1}
        maxDays={10}
      />
    );
    expect(screen.getByText("January")).toBeInTheDocument();
  });

  it("renders the data-testid container", () => {
    const { getByTestId } = render(
      <MonthlyLeaveBar
        monthName="March"
        approved={0}
        requested={0}
        planned={0}
        bankHolidays={0}
        maxDays={10}
      />
    );
    expect(getByTestId("monthly-leave-bar")).toBeInTheDocument();
  });

  it("renders the bar with the correct aria-label", () => {
    render(
      <MonthlyLeaveBar
        monthName="April"
        approved={3}
        requested={1}
        planned={2}
        bankHolidays={2}
        maxDays={10}
      />
    );
    expect(
      screen.getByRole("img", {
        name: /April: 3 approved, 1 requested, 2 planned, 2 bank holidays/i,
      })
    ).toBeInTheDocument();
  });
});

describe("MonthlyLeaveBar — total combined days label", () => {
  it("shows the total combined days when there are days to show", () => {
    render(
      <MonthlyLeaveBar
        monthName="May"
        approved={2}
        requested={1}
        planned={0}
        bankHolidays={1}
        maxDays={10}
      />
    );
    // 2 + 1 + 0 + 1 = 4
    expect(screen.getByText("4d")).toBeInTheDocument();
  });

  it("shows '–' when all values are zero", () => {
    render(
      <MonthlyLeaveBar
        monthName="June"
        approved={0}
        requested={0}
        planned={0}
        bankHolidays={0}
        maxDays={10}
      />
    );
    expect(screen.getByText("–")).toBeInTheDocument();
  });
});

describe("MonthlyLeaveBar — segments", () => {
  it("renders the approved (green) segment when approved > 0", () => {
    const { container } = render(
      <MonthlyLeaveBar
        monthName="July"
        approved={3}
        requested={0}
        planned={0}
        bankHolidays={0}
        maxDays={10}
      />
    );
    const greenDiv = container.querySelector(".bg-green-300");
    expect(greenDiv).toBeInTheDocument();
  });

  it("does not render the approved segment when approved is 0", () => {
    const { container } = render(
      <MonthlyLeaveBar
        monthName="August"
        approved={0}
        requested={2}
        planned={0}
        bankHolidays={0}
        maxDays={10}
      />
    );
    expect(container.querySelector(".bg-green-300")).not.toBeInTheDocument();
  });

  it("renders the requested (orange) segment when requested > 0", () => {
    const { container } = render(
      <MonthlyLeaveBar
        monthName="September"
        approved={0}
        requested={2}
        planned={0}
        bankHolidays={0}
        maxDays={10}
      />
    );
    expect(container.querySelector(".bg-orange-200")).toBeInTheDocument();
  });

  it("does not render the requested segment when requested is 0", () => {
    const { container } = render(
      <MonthlyLeaveBar
        monthName="October"
        approved={1}
        requested={0}
        planned={0}
        bankHolidays={0}
        maxDays={10}
      />
    );
    expect(container.querySelector(".bg-orange-200")).not.toBeInTheDocument();
  });

  it("renders the planned (yellow) segment when planned > 0", () => {
    const { container } = render(
      <MonthlyLeaveBar
        monthName="November"
        approved={0}
        requested={0}
        planned={3}
        bankHolidays={0}
        maxDays={10}
      />
    );
    expect(container.querySelector(".bg-yellow-200")).toBeInTheDocument();
  });

  it("does not render the planned segment when planned is 0", () => {
    const { container } = render(
      <MonthlyLeaveBar
        monthName="December"
        approved={1}
        requested={0}
        planned={0}
        bankHolidays={0}
        maxDays={10}
      />
    );
    expect(container.querySelector(".bg-yellow-200")).not.toBeInTheDocument();
  });

  it("renders the bank holidays (purple) segment when bankHolidays > 0", () => {
    const { container } = render(
      <MonthlyLeaveBar
        monthName="February"
        approved={0}
        requested={0}
        planned={0}
        bankHolidays={2}
        maxDays={10}
      />
    );
    expect(container.querySelector(".bg-purple-300")).toBeInTheDocument();
  });

  it("does not render the bank holidays segment when bankHolidays is 0", () => {
    const { container } = render(
      <MonthlyLeaveBar
        monthName="March"
        approved={1}
        requested={0}
        planned={0}
        bankHolidays={0}
        maxDays={10}
      />
    );
    expect(container.querySelector(".bg-purple-300")).not.toBeInTheDocument();
  });

  it("renders all four segments when all values are > 0", () => {
    const { container } = render(
      <MonthlyLeaveBar
        monthName="April"
        approved={2}
        requested={1}
        planned={1}
        bankHolidays={1}
        maxDays={10}
      />
    );
    expect(container.querySelector(".bg-green-300")).toBeInTheDocument();
    expect(container.querySelector(".bg-orange-200")).toBeInTheDocument();
    expect(container.querySelector(".bg-yellow-200")).toBeInTheDocument();
    expect(container.querySelector(".bg-purple-300")).toBeInTheDocument();
  });
});

describe("MonthlyLeaveBar — segment widths", () => {
  it("sets approved segment width proportional to chartScale", () => {
    // maxDays=10 → chartScale=10; approved=5 → 50%
    const { container } = render(
      <MonthlyLeaveBar
        monthName="May"
        approved={5}
        requested={0}
        planned={0}
        bankHolidays={0}
        maxDays={10}
      />
    );
    const greenDiv = container.querySelector(".bg-green-300") as HTMLElement;
    expect(greenDiv.style.width).toBe("50%");
  });

  it("clamps segment width to 100% when value exceeds chartScale", () => {
    // maxDays=10 → chartScale=10; approved=15 → clamped to 100%
    const { container } = render(
      <MonthlyLeaveBar
        monthName="June"
        approved={15}
        requested={0}
        planned={0}
        bankHolidays={0}
        maxDays={10}
      />
    );
    const greenDiv = container.querySelector(".bg-green-300") as HTMLElement;
    expect(greenDiv.style.width).toBe("100%");
  });
});

describe("MonthlyLeaveBar — chart scale (nearest 5, upwards)", () => {
  it("chartScale=5 for maxDays=1 (rounds up to 5)", () => {
    // chartScale = max(ceil(1/5)*5, 5) = max(5, 5) = 5 → 4 grid lines
    const { getAllByTestId } = render(
      <MonthlyLeaveBar
        monthName="Jan"
        approved={1}
        requested={0}
        planned={0}
        bankHolidays={0}
        maxDays={1}
      />
    );
    expect(getAllByTestId("chart-grid-line")).toHaveLength(4);
  });

  it("chartScale=5 for maxDays=5 → 4 grid lines", () => {
    // chartScale = max(ceil(5/5)*5, 5) = max(5, 5) = 5
    const { getAllByTestId } = render(
      <MonthlyLeaveBar
        monthName="Feb"
        approved={3}
        requested={0}
        planned={0}
        bankHolidays={0}
        maxDays={5}
      />
    );
    expect(getAllByTestId("chart-grid-line")).toHaveLength(4);
  });

  it("chartScale=10 for maxDays=6 (rounds up to 10) → 9 grid lines", () => {
    // chartScale = max(ceil(6/5)*5, 5) = max(10, 5) = 10
    const { getAllByTestId } = render(
      <MonthlyLeaveBar
        monthName="Mar"
        approved={6}
        requested={0}
        planned={0}
        bankHolidays={0}
        maxDays={6}
      />
    );
    expect(getAllByTestId("chart-grid-line")).toHaveLength(9);
  });

  it("chartScale=10 for maxDays=9 → 9 grid lines", () => {
    // chartScale = max(ceil(9/5)*5, 5) = max(10, 5) = 10
    const { getAllByTestId } = render(
      <MonthlyLeaveBar
        monthName="Apr"
        approved={5}
        requested={0}
        planned={0}
        bankHolidays={0}
        maxDays={9}
      />
    );
    expect(getAllByTestId("chart-grid-line")).toHaveLength(9);
  });

  it("chartScale=10 for maxDays=10 → 9 grid lines", () => {
    // chartScale = max(ceil(10/5)*5, 5) = max(10, 5) = 10
    const { getAllByTestId } = render(
      <MonthlyLeaveBar
        monthName="May"
        approved={5}
        requested={0}
        planned={0}
        bankHolidays={0}
        maxDays={10}
      />
    );
    expect(getAllByTestId("chart-grid-line")).toHaveLength(9);
  });

  it("chartScale=15 for maxDays=11 (rounds up to 15) → 14 grid lines", () => {
    // chartScale = max(ceil(11/5)*5, 5) = max(15, 5) = 15
    const { getAllByTestId } = render(
      <MonthlyLeaveBar
        monthName="Jun"
        approved={11}
        requested={0}
        planned={0}
        bankHolidays={0}
        maxDays={11}
      />
    );
    expect(getAllByTestId("chart-grid-line")).toHaveLength(14);
  });

  it("segment width uses chartScale denominator (maxDays=9 → chartScale=10)", () => {
    // approved=5, chartScale=10 → 50%
    const { container } = render(
      <MonthlyLeaveBar
        monthName="Jul"
        approved={5}
        requested={0}
        planned={0}
        bankHolidays={0}
        maxDays={9}
      />
    );
    const greenDiv = container.querySelector(".bg-green-300") as HTMLElement;
    expect(greenDiv.style.width).toBe("50%");
  });
});

describe("MonthlyLeaveBar — maxDays edge case", () => {
  it("does not crash when maxDays is 0 (uses chartScale=5 internally)", () => {
    const { getByTestId } = render(
      <MonthlyLeaveBar
        monthName="July"
        approved={2}
        requested={0}
        planned={0}
        bankHolidays={0}
        maxDays={0}
      />
    );
    expect(getByTestId("monthly-leave-bar")).toBeInTheDocument();
  });
});
