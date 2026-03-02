import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { FormValidationProvider, useFormValidation } from "@/contexts/FormValidationContext";
import DateRangePicker from "@/components/DateRangePicker";

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

/** Controlled wrapper with real state so onChange actually updates the displayed dates */
function ControlledPicker({
  initialStart = "",
  initialEnd = "",
}: {
  initialStart?: string;
  initialEnd?: string;
}) {
  const [start, setStart] = React.useState(initialStart);
  const [end, setEnd] = React.useState(initialEnd);
  return (
    <DateRangePicker
      id="test-range"
      startDate={start}
      endDate={end}
      onStartChange={setStart}
      onEndChange={setEnd}
    />
  );
}

function TriggerButton() {
  const { triggerAllValidations } = useFormValidation();
  return (
    <button type="button" onClick={() => triggerAllValidations()}>
      Validate
    </button>
  );
}

function renderInProvider(ui: React.ReactElement) {
  return render(<FormValidationProvider>{ui}</FormValidationProvider>);
}

// ---------------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------------
describe("DateRangePicker — rendering", () => {
  it("renders the current month and year", () => {
    renderInProvider(<ControlledPicker />);
    expect(screen.getByText(/March 2026/i)).toBeInTheDocument();
  });

  it("renders day-of-week headers", () => {
    renderInProvider(<ControlledPicker />);
    ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].forEach((day) => {
      expect(screen.getByText(day)).toBeInTheDocument();
    });
  });

  it("renders day buttons for every day in the month", () => {
    renderInProvider(<ControlledPicker />);
    // March 2026 has 31 days
    expect(screen.getByRole("button", { name: "2026-03-01" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "2026-03-31" })).toBeInTheDocument();
  });

  it("renders padding cells when the month does not start on Sunday", async () => {
    // April 2026 starts on Wednesday — there are 3 padding cells (Sun/Mon/Tue)
    jest.setSystemTime(new Date("2026-04-01"));
    const { container } = renderInProvider(<ControlledPicker />);
    expect(screen.getByText(/April 2026/i)).toBeInTheDocument();
    // Padding cells are empty <div>s — confirm the grid has more children than 30 days
    const grid = container.querySelector(".grid.grid-cols-7.gap-0\\.5");
    expect(grid).not.toBeNull();
    // Calendar always renders 42 cells (6 rows × 7 cols) for a stable height
    expect(grid!.children.length).toBe(42);
  });

  it("shows '—' for From and To when no dates are selected", () => {
    renderInProvider(<ControlledPicker />);
    const dashes = screen.getAllByText("—");
    expect(dashes.length).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// Date selection
// ---------------------------------------------------------------------------
describe("DateRangePicker — selecting dates", () => {
  it("shows the start date summary after clicking a day", async () => {
    const user = setup();
    renderInProvider(<ControlledPicker />);
    await user.click(screen.getByRole("button", { name: "2026-03-09" }));
    expect(screen.getByText("2026-03-09")).toBeInTheDocument();
  });

  it("shows the 'Now select an end date' hint after selecting only the start", async () => {
    const user = setup();
    renderInProvider(<ControlledPicker />);
    await user.click(screen.getByRole("button", { name: "2026-03-09" }));
    expect(screen.getByText("Now select an end date")).toBeInTheDocument();
  });

  it("shows both dates in the summary after selecting a range", async () => {
    const user = setup();
    renderInProvider(<ControlledPicker />);
    await user.click(screen.getByRole("button", { name: "2026-03-09" }));
    await user.click(screen.getByRole("button", { name: "2026-03-13" }));
    expect(screen.getByText("2026-03-09")).toBeInTheDocument();
    expect(screen.getByText("2026-03-13")).toBeInTheDocument();
  });

  it("resets to a new start when a third click is made after both dates are set", async () => {
    const user = setup();
    renderInProvider(<ControlledPicker />);
    await user.click(screen.getByRole("button", { name: "2026-03-09" }));
    await user.click(screen.getByRole("button", { name: "2026-03-13" }));
    // Third click starts a fresh selection
    await user.click(screen.getByRole("button", { name: "2026-03-20" }));
    expect(screen.getByText("2026-03-20")).toBeInTheDocument();
    // Hint shown again because end date cleared
    expect(screen.getByText("Now select an end date")).toBeInTheDocument();
  });

  it("treats a click before the start date (when picking end) as a new start", async () => {
    const user = setup();
    renderInProvider(<ControlledPicker />);
    await user.click(screen.getByRole("button", { name: "2026-03-13" }));
    // Dates before start are disabled — cannot be clicked
    expect(screen.getByRole("button", { name: "2026-03-01" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "2026-03-13" })).not.toBeDisabled();
  });

  it("disables days before the start while picking end", async () => {
    const user = setup();
    renderInProvider(<ControlledPicker />);
    await user.click(screen.getByRole("button", { name: "2026-03-15" }));
    expect(screen.getByRole("button", { name: "2026-03-01" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "2026-03-15" })).not.toBeDisabled();
  });
});

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------
describe("DateRangePicker — validation via triggerAllValidations", () => {
  it("shows 'Please select a start date' when no dates are selected", async () => {
    const user = setup();
    renderInProvider(
      <>
        <ControlledPicker />
        <TriggerButton />
      </>
    );
    await user.click(screen.getByRole("button", { name: "Validate" }));
    expect(screen.getByText("Please select a start date")).toBeInTheDocument();
  });

  it("shows 'Please select an end date' when only start is set", async () => {
    const user = setup();
    renderInProvider(
      <>
        <ControlledPicker />
        <TriggerButton />
      </>
    );
    await user.click(screen.getByRole("button", { name: "2026-03-09" }));
    await user.click(screen.getByRole("button", { name: "Validate" }));
    expect(screen.getByText("Please select an end date")).toBeInTheDocument();
  });

  it("shows end-before-start error when dates are inverted (e.g. pre-populated)", async () => {
    const user = setup();
    renderInProvider(
      <>
        {/* initialEnd is before initialStart */}
        <ControlledPicker initialStart="2026-03-15" initialEnd="2026-03-09" />
        <TriggerButton />
      </>
    );
    await user.click(screen.getByRole("button", { name: "Validate" }));
    expect(screen.getByText("End date must be on or after start date")).toBeInTheDocument();
  });

  it("clears any date error when triggerAllValidations is called with valid dates", async () => {
    const user = setup();
    renderInProvider(
      <>
        <ControlledPicker />
        <TriggerButton />
      </>
    );
    // First trigger an error
    await user.click(screen.getByRole("button", { name: "Validate" }));
    expect(screen.getByText("Please select a start date")).toBeInTheDocument();
    // Select valid start and end dates
    await user.click(screen.getByRole("button", { name: "2026-03-09" }));
    await user.click(screen.getByRole("button", { name: "2026-03-13" }));
    // Validate again — error should be gone
    await user.click(screen.getByRole("button", { name: "Validate" }));
    expect(screen.queryByText("Please select a start date")).toBeNull();
    expect(screen.queryByText("Please select an end date")).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Month navigation
// ---------------------------------------------------------------------------
describe("DateRangePicker — month navigation", () => {
  it("navigates to the previous month", async () => {
    const user = setup();
    renderInProvider(<ControlledPicker />);
    await user.click(screen.getByRole("button", { name: "Previous month" }));
    expect(screen.getByText(/February 2026/i)).toBeInTheDocument();
  });

  it("navigates to the next month", async () => {
    const user = setup();
    renderInProvider(<ControlledPicker />);
    await user.click(screen.getByRole("button", { name: "Next month" }));
    expect(screen.getByText(/April 2026/i)).toBeInTheDocument();
  });

  it("wraps from January to December (previous)", async () => {
    jest.setSystemTime(new Date("2026-01-15"));
    const user = setup();
    renderInProvider(<ControlledPicker />);
    await user.click(screen.getByRole("button", { name: "Previous month" }));
    expect(screen.getByText(/December 2025/i)).toBeInTheDocument();
  });

  it("wraps from December to January (next)", async () => {
    jest.setSystemTime(new Date("2026-12-01"));
    const user = setup();
    renderInProvider(<ControlledPicker />);
    await user.click(screen.getByRole("button", { name: "Next month" }));
    expect(screen.getByText(/January 2027/i)).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// startDate prop sync (month navigation)
// ---------------------------------------------------------------------------
describe("DateRangePicker — startDate prop syncs calendar month", () => {
  it("navigates to the month of an externally-supplied startDate", async () => {
    // Start with no date (shows March 2026).
    // ControlledPicker with initialStart pre-set to a July date should show July.
    renderInProvider(<ControlledPicker initialStart="2026-07-07" />);
    expect(screen.getByText(/July 2026/i)).toBeInTheDocument();
  });

  it("updates the displayed month when startDate prop changes to a different month", async () => {
    // We need a wrapper that can change the startDate prop after mount.
    function SyncTestPicker() {
      const [start, setStart] = React.useState("2026-03-09");
      const [end, setEnd] = React.useState("2026-03-13");
      return (
        <>
          <button
            type="button"
            onClick={() => {
              setStart("2026-07-07");
              setEnd("2026-07-11");
            }}
          >
            Jump to July
          </button>
          <DateRangePicker
            id="sync-test"
            startDate={start}
            endDate={end}
            onStartChange={setStart}
            onEndChange={setEnd}
          />
        </>
      );
    }
    const user = setup();
    renderInProvider(<SyncTestPicker />);
    // Initially shows March
    expect(screen.getByText(/March 2026/i)).toBeInTheDocument();
    // After changing startDate to July, the calendar should navigate to July
    await user.click(screen.getByRole("button", { name: "Jump to July" }));
    expect(screen.getByText(/July 2026/i)).toBeInTheDocument();
  });

  it("does not navigate when startDate changes but stays in the same month", async () => {
    function SameMonthPicker() {
      const [start, setStart] = React.useState("2026-03-09");
      const [end, setEnd] = React.useState("");
      return (
        <>
          <button type="button" onClick={() => setStart("2026-03-20")}>
            Same month
          </button>
          <DateRangePicker
            id="same-month"
            startDate={start}
            endDate={end}
            onStartChange={setStart}
            onEndChange={setEnd}
          />
        </>
      );
    }
    const user = setup();
    renderInProvider(<SameMonthPicker />);
    expect(screen.getByText(/March 2026/i)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Same month" }));
    // Still shows March
    expect(screen.getByText(/March 2026/i)).toBeInTheDocument();
  });
});

describe("DateRangePicker — malformed startDate prop is safely ignored", () => {
  it("does not crash and stays on current month when startDate changes to a malformed value", async () => {
    // Sets startDate to a 2-part value ("2026-03") with endDate already set so that
    // isPickingEnd=false and the guard at line 66 (parts.length !== 3) is reached.
    function MalformedPicker() {
      const [start, setStart] = React.useState("2026-03-09");
      const [end, setEnd] = React.useState("2026-03-13");
      return (
        <>
          <button type="button" onClick={() => setStart("2026-03")}>
            Set malformed
          </button>
          <DateRangePicker
            id="malformed"
            startDate={start}
            endDate={end}
            onStartChange={setStart}
            onEndChange={setEnd}
          />
        </>
      );
    }
    const user = setup();
    renderInProvider(<MalformedPicker />);
    // Initially showing March (initialised from startDate "2026-03-09")
    expect(screen.getByText(/March 2026/i)).toBeInTheDocument();
    // Change startDate to a partial date (2 parts) — guard at line 66 fires, no navigation
    await user.click(screen.getByRole("button", { name: "Set malformed" }));
    // Calendar should still show the same month
    expect(screen.getByText(/March 2026/i)).toBeInTheDocument();
  });
});
