import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import LeaveCard from "@/components/molecules/LeaveCard";
import { LeaveStatus, LeaveType } from "@/types";
import type { LeaveEntry, BankHolidayEntry } from "@/types";

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

function bh(date: string): BankHolidayEntry {
  return { date, title: "Bank Holiday" };
}

const nonWorkingDays = [0, 6]; // Sat/Sun

const approvedEntry: LeaveEntry = {
  id: "e1",
  startDate: "2026-03-16",
  endDate: "2026-03-20",
  status: LeaveStatus.Approved,
  type: LeaveType.Holiday,
  notes: "Family trip",
};

describe("LeaveCard — basic rendering", () => {
  it("renders the entry notes", () => {
    render(
      <LeaveCard
        entry={approvedEntry}
        nonWorkingDays={nonWorkingDays}
        bankHolidays={[]}
        isOwnProfile={false}
        onEdit={jest.fn()}
        onDelete={jest.fn()}
      />
    );
    expect(screen.getByText(/Family trip/)).toBeInTheDocument();
  });

  it("renders the status label", () => {
    render(
      <LeaveCard
        entry={approvedEntry}
        nonWorkingDays={nonWorkingDays}
        bankHolidays={[]}
        isOwnProfile={false}
        onEdit={jest.fn()}
        onDelete={jest.fn()}
      />
    );
    expect(screen.getByText("Approved")).toBeInTheDocument();
  });

  it("renders the date range", () => {
    render(
      <LeaveCard
        entry={approvedEntry}
        nonWorkingDays={nonWorkingDays}
        bankHolidays={[]}
        isOwnProfile={false}
        onEdit={jest.fn()}
        onDelete={jest.fn()}
      />
    );
    expect(screen.getByText(/16 Mar/)).toBeInTheDocument();
    expect(screen.getByText(/20 Mar/)).toBeInTheDocument();
  });

  it("renders 'Sick' label for sick leave entries", () => {
    const sickEntry: LeaveEntry = {
      ...approvedEntry,
      type: LeaveType.Sick,
      status: LeaveStatus.Approved,
    };
    render(
      <LeaveCard
        entry={sickEntry}
        nonWorkingDays={nonWorkingDays}
        bankHolidays={[]}
        isOwnProfile={false}
        onEdit={jest.fn()}
        onDelete={jest.fn()}
      />
    );
    expect(screen.getByText("Sick")).toBeInTheDocument();
  });

  it("falls back to '–' when notes is undefined", () => {
    const noNotes: LeaveEntry = { ...approvedEntry, notes: undefined };
    render(
      <LeaveCard
        entry={noNotes}
        nonWorkingDays={nonWorkingDays}
        bankHolidays={[]}
        isOwnProfile={false}
        onEdit={jest.fn()}
        onDelete={jest.fn()}
      />
    );
    expect(screen.getByText("–")).toBeInTheDocument();
  });
});

describe("LeaveCard — edit/delete actions", () => {
  it("shows Edit and Delete buttons when isOwnProfile=true", () => {
    render(
      <LeaveCard
        entry={approvedEntry}
        nonWorkingDays={nonWorkingDays}
        bankHolidays={[]}
        isOwnProfile={true}
        onEdit={jest.fn()}
        onDelete={jest.fn()}
      />
    );
    expect(screen.getByRole("button", { name: /edit/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /delete/i })).toBeInTheDocument();
  });

  it("hides Edit and Delete buttons when isOwnProfile=false", () => {
    render(
      <LeaveCard
        entry={approvedEntry}
        nonWorkingDays={nonWorkingDays}
        bankHolidays={[]}
        isOwnProfile={false}
        onEdit={jest.fn()}
        onDelete={jest.fn()}
      />
    );
    expect(screen.queryByRole("button", { name: /edit/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /delete/i })).toBeNull();
  });

  it("calls onEdit with the entry when Edit is clicked", async () => {
    const user = setup();
    const onEdit = jest.fn();
    render(
      <LeaveCard
        entry={approvedEntry}
        nonWorkingDays={nonWorkingDays}
        bankHolidays={[]}
        isOwnProfile={true}
        onEdit={onEdit}
        onDelete={jest.fn()}
      />
    );
    await user.click(screen.getByRole("button", { name: /edit/i }));
    expect(onEdit).toHaveBeenCalledWith(approvedEntry);
  });

  it("calls onDelete with the entry id when Delete is clicked", async () => {
    const user = setup();
    const onDelete = jest.fn();
    render(
      <LeaveCard
        entry={approvedEntry}
        nonWorkingDays={nonWorkingDays}
        bankHolidays={[]}
        isOwnProfile={true}
        onEdit={jest.fn()}
        onDelete={onDelete}
      />
    );
    await user.click(screen.getByRole("button", { name: /delete/i }));
    expect(onDelete).toHaveBeenCalledWith(approvedEntry.id);
  });
});

describe("LeaveCard — colour classes", () => {
  it("applies green card classes for Approved holiday leave", () => {
    const { container } = render(
      <LeaveCard
        entry={approvedEntry}
        nonWorkingDays={nonWorkingDays}
        bankHolidays={[]}
        isOwnProfile={false}
        onEdit={jest.fn()}
        onDelete={jest.fn()}
      />
    );
    expect(container.firstChild).toHaveClass("bg-green-100", "border-green-300");
  });

  it("applies red card classes for sick leave", () => {
    const sickEntry: LeaveEntry = {
      ...approvedEntry,
      type: LeaveType.Sick,
    };
    const { container } = render(
      <LeaveCard
        entry={sickEntry}
        nonWorkingDays={nonWorkingDays}
        bankHolidays={[]}
        isOwnProfile={false}
        onEdit={jest.fn()}
        onDelete={jest.fn()}
      />
    );
    expect(container.firstChild).toHaveClass("bg-red-100", "border-red-300");
  });
});
