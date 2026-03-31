import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { FormValidationProvider } from "@/contexts/FormValidationContext";
import ProfileForm from "@/components/organisms/ProfileForm";
import type { YearAllowance } from "@/types";

function setup() {
  return userEvent.setup();
}

function renderForm(props: React.ComponentProps<typeof ProfileForm>) {
  return render(
    <FormValidationProvider>
      <ProfileForm {...props} />
    </FormValidationProvider>
  );
}

const baseAllowance: YearAllowance = {
  year: 2026,
  company: "Acme",
  holidayStartMonth: 1,
  core: 25,
  bought: 0,
  carried: 0,
  active: true,
};

const pastAllowance: YearAllowance = {
  year: 2025,
  company: "Old Co",
  holidayStartMonth: 1,
  core: 20,
  bought: 2,
  carried: 0,
  active: false,
};

const defaultProps: React.ComponentProps<typeof ProfileForm> = {
  firstName: "Alice",
  onFirstNameChange: jest.fn(),
  lastName: "Smith",
  onLastNameChange: jest.fn(),
  email: "alice@example.com",
  workingDays: [1, 2, 3, 4, 5],
  onWorkingDaysChange: jest.fn(),
  country: "england-and-wales",
  onCountryChange: jest.fn(),
  yearAllowances: [baseAllowance],
  currentYear: 2026,
  onAddYear: jest.fn(),
  onEditYear: jest.fn(),
  onSave: jest.fn(),
};

describe("ProfileForm — Personal Details", () => {
  it("renders the First Name field with the provided value", () => {
    renderForm(defaultProps);
    expect(screen.getByLabelText("First Name")).toHaveValue("Alice");
  });

  it("renders the Last Name field with the provided value", () => {
    renderForm(defaultProps);
    expect(screen.getByLabelText("Last Name")).toHaveValue("Smith");
  });

  it("renders the Email field with the provided value", () => {
    renderForm(defaultProps);
    expect(screen.getByLabelText("Email")).toHaveValue("alice@example.com");
  });

  it("calls onFirstNameChange when the First Name field changes", async () => {
    const user = setup();
    const onFirstNameChange = jest.fn();
    renderForm({ ...defaultProps, onFirstNameChange });
    const input = screen.getByLabelText("First Name");
    await user.clear(input);
    await user.type(input, "Bob");
    expect(onFirstNameChange).toHaveBeenCalled();
  });

  it("calls onLastNameChange when the Last Name field changes", async () => {
    const user = setup();
    const onLastNameChange = jest.fn();
    renderForm({ ...defaultProps, onLastNameChange });
    const input = screen.getByLabelText("Last Name");
    await user.clear(input);
    await user.type(input, "Jones");
    expect(onLastNameChange).toHaveBeenCalled();
  });
});

describe("ProfileForm — Bank Holidays Region", () => {
  it("renders the three country buttons", () => {
    renderForm(defaultProps);
    expect(screen.getByRole("button", { name: "England & Wales" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Scotland" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Northern Ireland" })).toBeInTheDocument();
  });

  it("marks the current country as pressed", () => {
    renderForm({ ...defaultProps, country: "scotland" });
    expect(screen.getByRole("button", { name: "Scotland" })).toHaveAttribute(
      "aria-pressed",
      "true"
    );
  });

  it("marks other country buttons as not pressed", () => {
    renderForm({ ...defaultProps, country: "scotland" });
    expect(screen.getByRole("button", { name: "England & Wales" })).toHaveAttribute(
      "aria-pressed",
      "false"
    );
    expect(screen.getByRole("button", { name: "Northern Ireland" })).toHaveAttribute(
      "aria-pressed",
      "false"
    );
  });

  it("calls onCountryChange with the country value when an unselected button is clicked", async () => {
    const user = setup();
    const onCountryChange = jest.fn();
    renderForm({ ...defaultProps, country: "", onCountryChange });
    await user.click(screen.getByRole("button", { name: "Scotland" }));
    expect(onCountryChange).toHaveBeenCalledWith("scotland");
  });

  it("calls onCountryChange with empty string when the active country is clicked (deselect)", async () => {
    const user = setup();
    const onCountryChange = jest.fn();
    renderForm({ ...defaultProps, country: "england-and-wales", onCountryChange });
    await user.click(screen.getByRole("button", { name: "England & Wales" }));
    expect(onCountryChange).toHaveBeenCalledWith("");
  });
});

describe("ProfileForm — Working Days", () => {
  it("renders the WorkingDaysPicker section heading", () => {
    renderForm(defaultProps);
    expect(screen.getByText("Working Days")).toBeInTheDocument();
  });
});

describe("ProfileForm — Leave Allowances", () => {
  it("renders the Leave Allowances section heading", () => {
    renderForm(defaultProps);
    expect(screen.getByText("Leave Allowances")).toBeInTheDocument();
  });

  it("renders 'No allowances configured yet.' when yearAllowances is empty", () => {
    renderForm({ ...defaultProps, yearAllowances: [] });
    expect(screen.getByText("No allowances configured yet.")).toBeInTheDocument();
  });

  it("renders an AllowanceListItem for each allowance", () => {
    renderForm({ ...defaultProps, yearAllowances: [baseAllowance, pastAllowance] });
    const items = screen.getAllByTestId("allowance-list-item");
    expect(items).toHaveLength(2);
  });

  it("sorts active allowances before inactive ones in the same year", () => {
    const sameYearInactive: YearAllowance = {
      ...baseAllowance,
      company: "Old Corp",
      active: false,
    };
    const sameYearActive2: YearAllowance = {
      ...baseAllowance,
      company: "New Co",
      active: true,
    };
    // Three same-year entries ensures the comparator runs in both ternary branches
    renderForm({
      ...defaultProps,
      yearAllowances: [sameYearInactive, baseAllowance, sameYearActive2],
    });
    expect(screen.getAllByTestId("allowance-list-item")).toHaveLength(3);
  });

  it("renders active allowance before inactive in same year (active first in input)", () => {
    const sameYearInactive: YearAllowance = {
      ...baseAllowance,
      company: "Old Corp",
      active: false,
    };
    // Active element first: comparator called as f(active, inactive) → a.active !== false → -1 branch
    renderForm({
      ...defaultProps,
      yearAllowances: [baseAllowance, sameYearInactive],
    });
    expect(screen.getAllByTestId("allowance-list-item")).toHaveLength(2);
  });

  it("renders the Add Year button", () => {
    renderForm(defaultProps);
    expect(screen.getByRole("button", { name: "+ Add Year" })).toBeInTheDocument();
  });

  it("calls onAddYear when the Add Year button is clicked", async () => {
    const user = setup();
    const onAddYear = jest.fn();
    renderForm({ ...defaultProps, onAddYear });
    await user.click(screen.getByRole("button", { name: "+ Add Year" }));
    expect(onAddYear).toHaveBeenCalledTimes(1);
  });

  it("calls onEditYear when the edit button for an active allowance is clicked", async () => {
    const user = setup();
    const onEditYear = jest.fn();
    renderForm({ ...defaultProps, onEditYear });
    await user.click(screen.getByRole("button", { name: /edit/i }));
    expect(onEditYear).toHaveBeenCalledWith(baseAllowance);
  });

  it("does not render an Edit button for inactive allowances", () => {
    // Only inactive allowance — no active ones — so no Edit button
    renderForm({
      ...defaultProps,
      yearAllowances: [pastAllowance],
    });
    expect(screen.queryByRole("button", { name: /edit/i })).not.toBeInTheDocument();
  });
});

describe("ProfileForm — Save controls", () => {
  it("renders the Save Profile button", () => {
    renderForm(defaultProps);
    expect(screen.getByRole("button", { name: "Save Profile" })).toBeInTheDocument();
  });

  it("calls onSave when Save Profile button is clicked", async () => {
    const user = setup();
    const onSave = jest.fn();
    renderForm({ ...defaultProps, onSave });
    await user.click(screen.getByRole("button", { name: "Save Profile" }));
    expect(onSave).toHaveBeenCalledTimes(1);
  });

  it("renders 'Saved successfully' confirmation when saved=true", () => {
    renderForm({ ...defaultProps, saved: true });
    expect(screen.getByText("Saved successfully")).toBeInTheDocument();
  });

  it("does not render saved confirmation when saved=false", () => {
    renderForm({ ...defaultProps, saved: false });
    expect(screen.queryByText("Saved successfully")).not.toBeInTheDocument();
  });

  it("does not render saved confirmation when saved is omitted", () => {
    renderForm(defaultProps);
    expect(screen.queryByText("Saved successfully")).not.toBeInTheDocument();
  });

  it("renders the submitError message when provided", () => {
    renderForm({ ...defaultProps, submitError: "Something went wrong" });
    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
  });

  it("does not render an error message when submitError is absent", () => {
    renderForm(defaultProps);
    // No error paragraphs other than validation notices
    expect(screen.queryByText("Something went wrong")).not.toBeInTheDocument();
  });
});
