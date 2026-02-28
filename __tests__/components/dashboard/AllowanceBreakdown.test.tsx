import { render, screen } from "@testing-library/react";
import AllowanceBreakdown from "@/components/dashboard/AllowanceBreakdown";

describe("AllowanceBreakdown", () => {
  const allowance = { core: 25, bought: 3, carried: 2 };

  it("renders the section heading", () => {
    render(<AllowanceBreakdown allowance={allowance} />);
    expect(screen.getByText("Allowance Breakdown")).toBeInTheDocument();
  });

  it("displays the correct core days", () => {
    render(<AllowanceBreakdown allowance={allowance} />);
    expect(screen.getByText("Core Days")).toBeInTheDocument();
    expect(screen.getByText("25")).toBeInTheDocument();
  });

  it("displays bought days with a leading +", () => {
    render(<AllowanceBreakdown allowance={allowance} />);
    expect(screen.getByText("+3")).toBeInTheDocument();
  });

  it("displays carried days with a leading +", () => {
    render(<AllowanceBreakdown allowance={allowance} />);
    expect(screen.getByText("+2")).toBeInTheDocument();
  });

  it("displays the computed total (core + bought + carried)", () => {
    render(<AllowanceBreakdown allowance={allowance} />);
    // Total = 25 + 3 + 2 = 30
    expect(screen.getByText("30")).toBeInTheDocument();
  });

  it("displays zero bought days as '+0'", () => {
    render(<AllowanceBreakdown allowance={{ core: 25, bought: 0, carried: 0 }} />);
    // Two '+0' items (bought + carried)
    const zeroes = screen.getAllByText("+0");
    expect(zeroes).toHaveLength(2);
  });
});
