import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { FormValidationProvider } from "@/contexts/FormValidationContext";
import SetupWizardStep from "@/components/organisms/SetupWizardStep";
import { BankHolidayHandling } from "@/types";

function setup() {
  return userEvent.setup();
}

function renderStep(props: React.ComponentProps<typeof SetupWizardStep>) {
  return render(
    <FormValidationProvider>
      <SetupWizardStep {...props} />
    </FormValidationProvider>
  );
}

const defaultProps: React.ComponentProps<typeof SetupWizardStep> = {
  workingDays: [1, 2, 3, 4, 5],
  onWorkingDaysChange: jest.fn(),
  company: "Acme",
  onCompanyChange: jest.fn(),
  companies: ["Acme"],
  holidayStartMonth: 1,
  onHolidayStartMonthChange: jest.fn(),
  coreDays: 25,
  onCoreDaysChange: jest.fn(),
  boughtDays: 3,
  onBoughtDaysChange: jest.fn(),
  carriedDays: 2,
  onCarriedDaysChange: jest.fn(),
  bankHolidayHandling: BankHolidayHandling.None,
  onBankHolidayHandlingChange: jest.fn(),
  currentYear: 2026,
  onSubmit: jest.fn(),
};

describe("SetupWizardStep — rendering", () => {
  it("renders the form container with data-testid", () => {
    renderStep(defaultProps);
    expect(screen.getByTestId("setup-wizard-step")).toBeInTheDocument();
  });

  it("renders the Working Days section heading", () => {
    renderStep(defaultProps);
    expect(screen.getByText("Working Days")).toBeInTheDocument();
  });

  it("renders the Leave Allowance heading with the current year", () => {
    renderStep(defaultProps);
    expect(screen.getByText(/Leave Allowance for 2026/)).toBeInTheDocument();
  });

  it("renders the allowance total", () => {
    renderStep(defaultProps);
    // 25 + 3 + 2 = 30
    const total = screen.getByTestId("allowance-total");
    expect(total).toHaveTextContent("30");
  });

  it("calculates allowance total as coreDays + boughtDays + carriedDays", () => {
    renderStep({ ...defaultProps, coreDays: 20, boughtDays: 5, carriedDays: 0 });
    expect(screen.getByTestId("allowance-total")).toHaveTextContent("25");
  });

  it("renders the holiday start month select", () => {
    renderStep(defaultProps);
    expect(screen.getByLabelText("Holiday Year Starts")).toBeInTheDocument();
  });

  it("renders the bank holiday handling select", () => {
    renderStep(defaultProps);
    expect(screen.getByLabelText("Bank Holidays")).toBeInTheDocument();
  });
});

describe("SetupWizardStep — submit button", () => {
  it("renders 'Save & Go to Dashboard' when saving is false", () => {
    renderStep({ ...defaultProps, saving: false });
    expect(screen.getByRole("button", { name: "Save & Go to Dashboard" })).toBeInTheDocument();
  });

  it("renders 'Save & Go to Dashboard' when saving prop is omitted", () => {
    renderStep(defaultProps);
    expect(screen.getByRole("button", { name: "Save & Go to Dashboard" })).toBeInTheDocument();
  });

  it("renders 'Saving…' when saving is true", () => {
    renderStep({ ...defaultProps, saving: true });
    expect(screen.getByRole("button", { name: "Saving…" })).toBeInTheDocument();
  });

  it("disables the submit button when saving is true", () => {
    renderStep({ ...defaultProps, saving: true });
    expect(screen.getByRole("button", { name: "Saving…" })).toBeDisabled();
  });

  it("does not disable the submit button when saving is false", () => {
    renderStep({ ...defaultProps, saving: false });
    expect(screen.getByRole("button", { name: "Save & Go to Dashboard" })).not.toBeDisabled();
  });
});

describe("SetupWizardStep — error", () => {
  it("renders the submitError message when provided", () => {
    renderStep({ ...defaultProps, submitError: "Could not save. Try again." });
    expect(screen.getByText("Could not save. Try again.")).toBeInTheDocument();
  });

  it("does not render an error when submitError is absent", () => {
    renderStep(defaultProps);
    expect(screen.queryByText("Could not save. Try again.")).not.toBeInTheDocument();
  });
});

describe("SetupWizardStep — interactions", () => {
  it("calls onHolidayStartMonthChange when the month select changes", async () => {
    const user = setup();
    const onHolidayStartMonthChange = jest.fn();
    renderStep({ ...defaultProps, onHolidayStartMonthChange });
    await user.selectOptions(screen.getByLabelText("Holiday Year Starts"), "4");
    expect(onHolidayStartMonthChange).toHaveBeenCalledWith(4);
  });

  it("calls onBankHolidayHandlingChange with Deduct when that option is selected", async () => {
    const user = setup();
    const onBankHolidayHandlingChange = jest.fn();
    renderStep({ ...defaultProps, onBankHolidayHandlingChange });
    await user.selectOptions(
      screen.getByLabelText("Bank Holidays"),
      BankHolidayHandling.Deduct
    );
    expect(onBankHolidayHandlingChange).toHaveBeenCalledWith(BankHolidayHandling.Deduct);
  });

  it("calls onSubmit when the form is submitted", async () => {
    const user = setup();
    const onSubmit = jest.fn((e) => e.preventDefault());
    renderStep({ ...defaultProps, onSubmit });
    await user.click(screen.getByRole("button", { name: "Save & Go to Dashboard" }));
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it("calls onCoreDaysChange when Core Days field changes", async () => {
    const user = setup();
    const onCoreDaysChange = jest.fn();
    renderStep({ ...defaultProps, onCoreDaysChange });
    const coreInput = screen.getByLabelText("Core Days");
    await user.clear(coreInput);
    await user.type(coreInput, "20");
    expect(onCoreDaysChange).toHaveBeenCalled();
  });

  it("calls onBoughtDaysChange when Days Bought field changes", async () => {
    const user = setup();
    const onBoughtDaysChange = jest.fn();
    renderStep({ ...defaultProps, onBoughtDaysChange });
    const boughtInput = screen.getByLabelText("Days Bought");
    await user.clear(boughtInput);
    await user.type(boughtInput, "5");
    expect(onBoughtDaysChange).toHaveBeenCalled();
  });

  it("calls onCarriedDaysChange when Days Carried Over field changes", async () => {
    const user = setup();
    const onCarriedDaysChange = jest.fn();
    renderStep({ ...defaultProps, onCarriedDaysChange });
    const carriedInput = screen.getByLabelText("Days Carried Over");
    await user.clear(carriedInput);
    await user.type(carriedInput, "1");
    expect(onCarriedDaysChange).toHaveBeenCalled();
  });
});
