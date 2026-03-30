import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import PastLeaveExplorer from "@/components/organisms/PastLeaveExplorer";
import { LeaveStatus, LeaveType } from "@/types";
import type { YearAllowance, LeaveEntry } from "@/types";

function setup() {
  return userEvent.setup();
}

const period2024: YearAllowance = {
  year: 2024,
  company: "Acme",
  holidayStartMonth: 1,
  core: 25,
  bought: 0,
  carried: 0,
};

const period2023: YearAllowance = {
  year: 2023,
  company: "Old Corp",
  holidayStartMonth: 1,
  core: 20,
  bought: 0,
  carried: 0,
};

const periodApril: YearAllowance = {
  year: 2023,
  company: "April Co",
  holidayStartMonth: 4,
  core: 25,
  bought: 0,
  carried: 0,
};

const entry1: LeaveEntry = {
  id: "e1",
  startDate: "2024-05-01",
  endDate: "2024-05-03",
  status: LeaveStatus.Approved,
  type: LeaveType.Holiday,
};

const entry2: LeaveEntry = {
  id: "e2",
  startDate: "2024-08-12",
  endDate: "2024-08-14",
  status: LeaveStatus.Approved,
  type: LeaveType.Holiday,
};

const nonWorkingDays: number[] = [0, 6];

describe("PastLeaveExplorer — no periods", () => {
  it("renders a descriptive message when pastPeriods is empty", () => {
    render(
      <PastLeaveExplorer
        pastPeriods={[]}
        selectedPastPeriod=""
        onSelectPeriod={jest.fn()}
        pastLeaveEntries={[]}
        nonWorkingDays={nonWorkingDays}
        bankHolidays={[]}
      />
    );
    expect(
      screen.getByText("No past leave allowance periods found.")
    ).toBeInTheDocument();
  });

  it("does not render the explorer wrapper when pastPeriods is empty", () => {
    render(
      <PastLeaveExplorer
        pastPeriods={[]}
        selectedPastPeriod=""
        onSelectPeriod={jest.fn()}
        pastLeaveEntries={[]}
        nonWorkingDays={nonWorkingDays}
        bankHolidays={[]}
      />
    );
    expect(screen.queryByTestId("past-leave-explorer")).not.toBeInTheDocument();
  });
});

describe("PastLeaveExplorer — period chips", () => {
  it("renders the explorer container with data-testid", () => {
    render(
      <PastLeaveExplorer
        pastPeriods={[period2024]}
        selectedPastPeriod=""
        onSelectPeriod={jest.fn()}
        pastLeaveEntries={[]}
        nonWorkingDays={nonWorkingDays}
        bankHolidays={[]}
      />
    );
    expect(screen.getByTestId("past-leave-explorer")).toBeInTheDocument();
  });

  it("renders a chip for each past period (holidayStartMonth=1)", () => {
    render(
      <PastLeaveExplorer
        pastPeriods={[period2024, period2023]}
        selectedPastPeriod=""
        onSelectPeriod={jest.fn()}
        pastLeaveEntries={[]}
        nonWorkingDays={nonWorkingDays}
        bankHolidays={[]}
      />
    );
    expect(screen.getByRole("button", { name: "2024 — Acme" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "2023 — Old Corp" })).toBeInTheDocument();
  });

  it("renders a chip without company suffix when company is empty", () => {
    const noCompany: YearAllowance = { ...period2024, company: "" };
    render(
      <PastLeaveExplorer
        pastPeriods={[noCompany]}
        selectedPastPeriod=""
        onSelectPeriod={jest.fn()}
        pastLeaveEntries={[]}
        nonWorkingDays={nonWorkingDays}
        bankHolidays={[]}
      />
    );
    expect(screen.getByRole("button", { name: "2024" })).toBeInTheDocument();
  });

  it("renders a date-range label for periods with holidayStartMonth > 1", () => {
    render(
      <PastLeaveExplorer
        pastPeriods={[periodApril]}
        selectedPastPeriod=""
        onSelectPeriod={jest.fn()}
        pastLeaveEntries={[]}
        nonWorkingDays={nonWorkingDays}
        bankHolidays={[]}
      />
    );
    // Label includes Apr 2023 and Mar 2024 and the company name
    const chip = screen.getByRole("button", { name: /Apr 2023/i });
    expect(chip).toBeInTheDocument();
    expect(chip).toHaveTextContent("April Co");
  });

  it("renders a date-range label without company suffix when company is empty", () => {
    const noCompanyApril: YearAllowance = { ...periodApril, company: "" };
    render(
      <PastLeaveExplorer
        pastPeriods={[noCompanyApril]}
        selectedPastPeriod=""
        onSelectPeriod={jest.fn()}
        pastLeaveEntries={[]}
        nonWorkingDays={nonWorkingDays}
        bankHolidays={[]}
      />
    );
    const chip = screen.getByRole("button", { name: /Apr 2023/i });
    expect(chip).toBeInTheDocument();
    // Should NOT have a company suffix
    expect(chip.textContent).not.toContain(" — ");
  });

  it("marks the selected period chip as aria-pressed=true", () => {
    render(
      <PastLeaveExplorer
        pastPeriods={[period2024, period2023]}
        selectedPastPeriod="2024-Acme"
        onSelectPeriod={jest.fn()}
        pastLeaveEntries={[]}
        nonWorkingDays={nonWorkingDays}
        bankHolidays={[]}
      />
    );
    expect(screen.getByRole("button", { name: "2024 — Acme" })).toHaveAttribute(
      "aria-pressed",
      "true"
    );
  });

  it("marks unselected period chips as aria-pressed=false", () => {
    render(
      <PastLeaveExplorer
        pastPeriods={[period2024, period2023]}
        selectedPastPeriod="2024-Acme"
        onSelectPeriod={jest.fn()}
        pastLeaveEntries={[]}
        nonWorkingDays={nonWorkingDays}
        bankHolidays={[]}
      />
    );
    expect(screen.getByRole("button", { name: "2023 — Old Corp" })).toHaveAttribute(
      "aria-pressed",
      "false"
    );
  });

  it("calls onSelectPeriod with the period key when a chip is clicked", async () => {
    const user = setup();
    const onSelectPeriod = jest.fn();
    render(
      <PastLeaveExplorer
        pastPeriods={[period2024]}
        selectedPastPeriod=""
        onSelectPeriod={onSelectPeriod}
        pastLeaveEntries={[]}
        nonWorkingDays={nonWorkingDays}
        bankHolidays={[]}
      />
    );
    await user.click(screen.getByRole("button", { name: "2024 — Acme" }));
    expect(onSelectPeriod).toHaveBeenCalledWith("2024-Acme");
  });
});

describe("PastLeaveExplorer — no period selected", () => {
  it("does not render entries panel when no period is selected", () => {
    render(
      <PastLeaveExplorer
        pastPeriods={[period2024]}
        selectedPastPeriod=""
        onSelectPeriod={jest.fn()}
        pastLeaveEntries={[entry1]}
        nonWorkingDays={nonWorkingDays}
        bankHolidays={[]}
      />
    );
    expect(screen.queryByTestId("leave-entry-card")).not.toBeInTheDocument();
    expect(screen.queryByText("No leave entries for this period.")).not.toBeInTheDocument();
  });
});

describe("PastLeaveExplorer — period selected with no entries", () => {
  it("shows 'No leave entries for this period.' message", () => {
    render(
      <PastLeaveExplorer
        pastPeriods={[period2024]}
        selectedPastPeriod="2024-Acme"
        onSelectPeriod={jest.fn()}
        pastLeaveEntries={[]}
        nonWorkingDays={nonWorkingDays}
        bankHolidays={[]}
      />
    );
    expect(screen.getByText("No leave entries for this period.")).toBeInTheDocument();
  });
});

describe("PastLeaveExplorer — period selected with entries", () => {
  it("renders a LeaveEntryCard for each entry", () => {
    render(
      <PastLeaveExplorer
        pastPeriods={[period2024]}
        selectedPastPeriod="2024-Acme"
        onSelectPeriod={jest.fn()}
        pastLeaveEntries={[entry1, entry2]}
        nonWorkingDays={nonWorkingDays}
        bankHolidays={[]}
      />
    );
    const cards = screen.getAllByTestId("leave-entry-card");
    expect(cards).toHaveLength(2);
  });

  it("does not render the 'no entries' message when entries are present", () => {
    render(
      <PastLeaveExplorer
        pastPeriods={[period2024]}
        selectedPastPeriod="2024-Acme"
        onSelectPeriod={jest.fn()}
        pastLeaveEntries={[entry1]}
        nonWorkingDays={nonWorkingDays}
        bankHolidays={[]}
      />
    );
    expect(screen.queryByText("No leave entries for this period.")).not.toBeInTheDocument();
  });
});
