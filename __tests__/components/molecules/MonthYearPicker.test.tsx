import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import MonthYearPicker from "@/components/molecules/MonthYearPicker";

// Fix today so tests are deterministic (today = Sunday 15 March 2026)
beforeEach(() => {
  jest.useFakeTimers();
  jest.setSystemTime(new Date("2026-03-15"));
});

afterEach(() => {
  jest.useRealTimers();
});

function setup() {
  return userEvent.setup({ advanceTimers: jest.advanceTimersByTime.bind(jest) });
}

/** Default bounds covering 2025-2027 to allow free navigation in tests */
const defaultProps = {
  year: 2026,
  month: 2, // March (0-indexed)
  onChange: jest.fn(),
  minYear: 2025,
  minMonth: 0, // January
  maxYear: 2027,
  maxMonth: 11, // December
};

describe("MonthYearPicker — rendering", () => {
  it("renders a button with the current month and year", () => {
    render(<MonthYearPicker {...defaultProps} />);
    expect(
      screen.getByRole("button", { name: /March 2026.*open month-year picker/i })
    ).toBeInTheDocument();
  });

  it("does not show the picker dialog initially", () => {
    render(<MonthYearPicker {...defaultProps} />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("opens the picker dialog when the label button is clicked", async () => {
    const user = setup();
    render(<MonthYearPicker {...defaultProps} />);
    await user.click(screen.getByRole("button", { name: /March 2026.*open month-year picker/i }));
    expect(screen.getByRole("dialog", { name: "Month-year picker" })).toBeInTheDocument();
  });

  it("shows the current year in the picker header when opened", async () => {
    const user = setup();
    render(<MonthYearPicker {...defaultProps} />);
    await user.click(screen.getByRole("button", { name: /March 2026.*open month-year picker/i }));
    expect(screen.getByRole("dialog")).toHaveTextContent("2026");
  });

  it("renders all 12 month buttons in the picker", async () => {
    const user = setup();
    render(<MonthYearPicker {...defaultProps} />);
    await user.click(screen.getByRole("button", { name: /March 2026.*open month-year picker/i }));
    const monthLabels = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];
    monthLabels.forEach((name) => {
      expect(screen.getByText(name)).toBeInTheDocument();
    });
  });
});

describe("MonthYearPicker — open/close behaviour", () => {
  it("closes the picker when the label button is clicked again", async () => {
    const user = setup();
    render(<MonthYearPicker {...defaultProps} />);
    const trigger = screen.getByRole("button", { name: /March 2026.*open month-year picker/i });
    await user.click(trigger); // open
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    await user.click(trigger); // close
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("closes the picker when clicking outside the component", async () => {
    const user = setup();
    render(
      <div>
        <MonthYearPicker {...defaultProps} />
        <button>Outside</button>
      </div>
    );
    await user.click(screen.getByRole("button", { name: /March 2026.*open month-year picker/i }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Outside" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});

describe("MonthYearPicker — month selection", () => {
  it("calls onChange with the correct year and month when a month is selected", async () => {
    const onChange = jest.fn();
    const user = setup();
    render(<MonthYearPicker {...defaultProps} onChange={onChange} />);
    await user.click(screen.getByRole("button", { name: /March 2026.*open month-year picker/i }));
    await user.click(screen.getByRole("button", { name: "July 2026" }));
    expect(onChange).toHaveBeenCalledWith(2026, 6); // July = index 6
  });

  it("closes the picker after a month is selected", async () => {
    const user = setup();
    render(<MonthYearPicker {...defaultProps} />);
    await user.click(screen.getByRole("button", { name: /March 2026.*open month-year picker/i }));
    await user.click(screen.getByRole("button", { name: "July 2026" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("does not call onChange when clicking a disabled month button", async () => {
    const onChange = jest.fn();
    const user = setup();
    // Only May–December 2026 are valid
    render(
      <MonthYearPicker
        {...defaultProps}
        onChange={onChange}
        minYear={2026}
        minMonth={4} // May
        maxYear={2026}
        maxMonth={11}
      />
    );
    await user.click(screen.getByRole("button", { name: /March 2026.*open month-year picker/i }));
    // January is before May — should be disabled
    await user.click(screen.getByRole("button", { name: "January 2026" }));
    expect(onChange).not.toHaveBeenCalled();
  });
});

describe("MonthYearPicker — year navigation", () => {
  it("navigates to the previous year when Previous year is clicked", async () => {
    const user = setup();
    render(<MonthYearPicker {...defaultProps} />);
    await user.click(screen.getByRole("button", { name: /March 2026.*open month-year picker/i }));
    await user.click(screen.getByRole("button", { name: "Previous year" }));
    expect(screen.getByRole("dialog")).toHaveTextContent("2025");
  });

  it("navigates to the next year when Next year is clicked", async () => {
    const user = setup();
    render(<MonthYearPicker {...defaultProps} />);
    await user.click(screen.getByRole("button", { name: /March 2026.*open month-year picker/i }));
    await user.click(screen.getByRole("button", { name: "Next year" }));
    expect(screen.getByRole("dialog")).toHaveTextContent("2027");
  });

  it("disables the Previous year button at minYear", async () => {
    const user = setup();
    render(<MonthYearPicker {...defaultProps} minYear={2026} />);
    await user.click(screen.getByRole("button", { name: /March 2026.*open month-year picker/i }));
    expect(screen.getByRole("button", { name: "Previous year" })).toBeDisabled();
  });

  it("disables the Next year button at maxYear", async () => {
    const user = setup();
    render(<MonthYearPicker {...defaultProps} maxYear={2026} />);
    await user.click(screen.getByRole("button", { name: /March 2026.*open month-year picker/i }));
    expect(screen.getByRole("button", { name: "Next year" })).toBeDisabled();
  });

  it("calls onChange with the correct year after navigating to a different year", async () => {
    const onChange = jest.fn();
    const user = setup();
    render(<MonthYearPicker {...defaultProps} onChange={onChange} />);
    await user.click(screen.getByRole("button", { name: /March 2026.*open month-year picker/i }));
    await user.click(screen.getByRole("button", { name: "Next year" }));
    await user.click(screen.getByRole("button", { name: "June 2027" }));
    expect(onChange).toHaveBeenCalledWith(2027, 5); // June = index 5
  });
});

describe("MonthYearPicker — bounds enforcement", () => {
  it("disables months before the min bound in the min year", async () => {
    const user = setup();
    // minYear=2026, minMonth=3 (April) — only April+ in 2026 are valid
    render(
      <MonthYearPicker {...defaultProps} minYear={2026} minMonth={3} maxYear={2026} maxMonth={11} />
    );
    await user.click(screen.getByRole("button", { name: /March 2026.*open month-year picker/i }));
    // January, February, March are disabled
    expect(screen.getByRole("button", { name: "January 2026" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "February 2026" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "March 2026" })).toBeDisabled();
    // April is enabled
    expect(screen.getByRole("button", { name: "April 2026" })).not.toBeDisabled();
  });

  it("disables months after the max bound in the max year", async () => {
    const user = setup();
    render(
      <MonthYearPicker
        {...defaultProps}
        minYear={2026}
        minMonth={0}
        maxYear={2026}
        maxMonth={5} // June
      />
    );
    await user.click(screen.getByRole("button", { name: /March 2026.*open month-year picker/i }));
    // July, August, etc. are disabled
    expect(screen.getByRole("button", { name: "July 2026" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "December 2026" })).toBeDisabled();
    // June is enabled
    expect(screen.getByRole("button", { name: "June 2026" })).not.toBeDisabled();
  });
});

describe("MonthYearPicker — current month highlight", () => {
  it("applies the selected style to the currently-selected month", async () => {
    const user = setup();
    render(<MonthYearPicker {...defaultProps} />);
    await user.click(screen.getByRole("button", { name: /March 2026.*open month-year picker/i }));
    // March 2026 is both selected (prop.month=2) and today — it gets the selected style
    const marBtn = screen.getByRole("button", { name: "March 2026" });
    expect(marBtn.className).toMatch(/indigo-600/);
  });

  it("applies the current-month ring to today's month when not selected", async () => {
    // Today is March 2026, but we're viewing April 2026 → March gets the ring
    const user = setup();
    render(
      <MonthYearPicker
        {...defaultProps}
        month={3} // April is selected
      />
    );
    await user.click(screen.getByRole("button", { name: /April 2026.*open month-year picker/i }));
    // March 2026 is today's month but NOT selected → ring style
    const marBtn = screen.getByRole("button", { name: "March 2026" });
    expect(marBtn.className).toMatch(/indigo-50/);
    // April 2026 is selected
    const aprBtn = screen.getByRole("button", { name: "April 2026" });
    expect(aprBtn.className).toMatch(/indigo-600/);
  });

  it("does not apply current-month highlight when viewing a different year", async () => {
    const user = setup();
    render(<MonthYearPicker {...defaultProps} />);
    await user.click(screen.getByRole("button", { name: /March 2026.*open month-year picker/i }));
    // Navigate to 2027 — no month in 2027 is "today's month"
    await user.click(screen.getByRole("button", { name: "Next year" }));
    const mar2027Btn = screen.getByRole("button", { name: "March 2027" });
    expect(mar2027Btn.className).not.toMatch(/indigo-50/);
    expect(mar2027Btn.className).not.toMatch(/indigo-600/);
  });
});

describe("MonthYearPicker — picker resets to selected year on reopen", () => {
  it("resets picker year to the selected year when reopened", async () => {
    const user = setup();
    render(<MonthYearPicker {...defaultProps} />);
    const trigger = screen.getByRole("button", { name: /March 2026.*open month-year picker/i });
    // Open and navigate to 2027 without selecting
    await user.click(trigger);
    await user.click(screen.getByRole("button", { name: "Next year" }));
    expect(screen.getByRole("dialog")).toHaveTextContent("2027");
    // Close without selecting
    await user.click(trigger);
    // Reopen — should show 2026 again (the selected year)
    await user.click(trigger);
    expect(screen.getByRole("dialog")).toHaveTextContent("2026");
  });
});
