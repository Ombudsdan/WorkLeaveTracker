import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { FormValidationProvider } from "@/contexts/FormValidationContext";
import YearAllowanceModal from "@/components/dashboard/YearAllowanceModal";
import { usersController } from "@/controllers/usersController";

// Mock fetchCompanies so the useEffect in YearAllowanceModalInner doesn't fail
jest.mock("@/controllers/usersController", () => ({
  usersController: {
    fetchCompanies: jest.fn().mockResolvedValue([]),
  },
}));

const mockFetchCompanies = usersController.fetchCompanies as jest.Mock;

function renderModal(ui: React.ReactElement) {
  return render(<FormValidationProvider>{ui}</FormValidationProvider>);
}

function setup() {
  return userEvent.setup({ advanceTimers: jest.advanceTimersByTime.bind(jest) });
}

beforeEach(() => {
  jest.useFakeTimers();
  jest.setSystemTime(new Date("2026-03-15"));
  mockFetchCompanies.mockResolvedValue([]);
});

afterEach(() => {
  jest.useRealTimers();
});

describe("YearAllowanceModal — rendering", () => {
  it("renders the 'Add Year Allowance' heading when no existing allowance", () => {
    renderModal(<YearAllowanceModal onClose={jest.fn()} onSave={jest.fn()} />);
    expect(screen.getByText("Add Year Allowance")).toBeInTheDocument();
  });

  it("renders the 'Edit Year Allowance' heading when existing allowance provided", () => {
    renderModal(
      <YearAllowanceModal
        existing={{
          year: 2026,
          company: "Acme",
          holidayStartMonth: 1,
          core: 25,
          bought: 0,
          carried: 0,
        }}
        onClose={jest.fn()}
        onSave={jest.fn()}
      />
    );
    expect(screen.getByText("Edit Year Allowance")).toBeInTheDocument();
  });

  it("pre-fills fields with existing values", () => {
    renderModal(
      <YearAllowanceModal
        existing={{
          year: 2025,
          company: "Acme",
          holidayStartMonth: 1,
          core: 20,
          bought: 3,
          carried: 2,
        }}
        onClose={jest.fn()}
        onSave={jest.fn()}
      />
    );
    expect(screen.getByDisplayValue("2025")).toBeInTheDocument();
    expect(screen.getByDisplayValue("20")).toBeInTheDocument();
    expect(screen.getByDisplayValue("3")).toBeInTheDocument();
    expect(screen.getByDisplayValue("2")).toBeInTheDocument();
  });

  it("uses initialYear when provided and no existing", () => {
    renderModal(<YearAllowanceModal initialYear={2027} onClose={jest.fn()} onSave={jest.fn()} />);
    expect(screen.getByDisplayValue("2027")).toBeInTheDocument();
  });
});

describe("YearAllowanceModal — interactions", () => {
  it("calls onClose when Cancel is clicked", async () => {
    const user = setup();
    const onClose = jest.fn();
    renderModal(<YearAllowanceModal onClose={onClose} onSave={jest.fn()} />);
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("does not call onSave when required fields are invalid", async () => {
    const user = setup();
    const onSave = jest.fn();
    renderModal(<YearAllowanceModal initialYear={2026} onClose={jest.fn()} onSave={onSave} />);
    // Clear the required Holiday Year field so validation fails
    const yearInput = screen.getByLabelText("Holiday Year");
    await user.clear(yearInput);
    await user.click(screen.getByRole("button", { name: "Save" }));
    expect(onSave).not.toHaveBeenCalled();
  });

  it("calls onSave with the correct values when Save is clicked", async () => {
    const user = setup();
    const onSave = jest.fn();
    renderModal(
      <YearAllowanceModal
        existing={{
          year: 2026,
          company: "Acme",
          holidayStartMonth: 1,
          core: 25,
          bought: 0,
          carried: 0,
        }}
        onClose={jest.fn()}
        onSave={onSave}
      />
    );
    await user.click(screen.getByRole("button", { name: "Save" }));
    expect(onSave).toHaveBeenCalledWith({
      year: 2026,
      company: "Acme",
      holidayStartMonth: 1,
      core: 25,
      bought: 0,
      carried: 0,
      bankHolidayHandling: "none",
      useHoursDisplay: false,
      coreHoursPerDay: undefined,
    });
  });

  it("updates the core days field value when core days are changed", async () => {
    const user = setup();
    renderModal(
      <YearAllowanceModal
        existing={{
          year: 2026,
          company: "Acme",
          holidayStartMonth: 1,
          core: 20,
          bought: 0,
          carried: 0,
        }}
        onClose={jest.fn()}
        onSave={jest.fn()}
      />
    );
    const coreInput = screen.getByLabelText("Core Days");
    await user.clear(coreInput);
    await user.type(coreInput, "30");
    // The input itself should reflect the new value
    expect((coreInput as HTMLInputElement).value).toBe("30");
  });

  it("calls onSave with updated values after editing fields", async () => {
    const user = setup();
    const onSave = jest.fn();
    renderModal(<YearAllowanceModal initialYear={2027} onClose={jest.fn()} onSave={onSave} />);
    const boughtInput = screen.getByLabelText("Days Bought");
    await user.clear(boughtInput);
    await user.type(boughtInput, "5");
    const carriedInput = screen.getByLabelText("Days Carried Over");
    await user.clear(carriedInput);
    await user.type(carriedInput, "3");
    await user.click(screen.getByRole("button", { name: "Save" }));
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ bought: 5, carried: 3 }));
  });

  it("calls onSave with updated year when year field is changed", async () => {
    const user = setup();
    const onSave = jest.fn();
    renderModal(<YearAllowanceModal initialYear={2026} onClose={jest.fn()} onSave={onSave} />);
    const yearInput = screen.getByLabelText("Holiday Year");
    await user.clear(yearInput);
    await user.type(yearInput, "2028");
    await user.click(screen.getByRole("button", { name: "Save" }));
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ year: 2028 }));
  });
});

it("calls onSave with the updated company when a new company name is entered", async () => {
  const user = setup();
  const onSave = jest.fn();
  renderModal(<YearAllowanceModal initialYear={2026} onClose={jest.fn()} onSave={onSave} />);
  // Type directly into the company text input (CompanyCombobox)
  const companyInput = screen.getByRole("combobox", { name: /^Company/i });
  await user.clear(companyInput);
  await user.type(companyInput, "NewCo");
  await user.click(screen.getByRole("button", { name: "Save" }));
  expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ company: "NewCo" }));
});

it("calls onSave with the updated holidayStartMonth when month is changed", async () => {
  const user = setup();
  const onSave = jest.fn();
  renderModal(<YearAllowanceModal initialYear={2026} onClose={jest.fn()} onSave={onSave} />);
  const monthSelect = screen.getByLabelText("Holiday Year Starts");
  await user.selectOptions(monthSelect, "4");
  await user.click(screen.getByRole("button", { name: "Save" }));
  expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ holidayStartMonth: 4 }));
});

it("merges companies fetched from the API into the company combobox suggestions", async () => {
  // Return a non-empty list so the setCompanies branch is exercised
  mockFetchCompanies.mockResolvedValue(["FetchedCo"]);
  const { container } = renderModal(
    <YearAllowanceModal initialYear={2026} onClose={jest.fn()} onSave={jest.fn()} />
  );
  // Wait for the useEffect to run and update the datalist
  await waitFor(() => {
    const options = container.querySelectorAll("datalist option");
    const values = Array.from(options).map((o) => (o as HTMLOptionElement).value);
    expect(values).toContain("FetchedCo");
  });
});

describe("YearAllowanceModal — bank holiday handling", () => {
  it("renders the Bank Holidays select with default option 'Do not use annual leave'", () => {
    renderModal(<YearAllowanceModal initialYear={2026} onClose={jest.fn()} onSave={jest.fn()} />);
    const select = screen.getByLabelText("Bank Holidays");
    expect(select).toBeInTheDocument();
    expect((select as HTMLSelectElement).value).toBe("none");
  });

  it("pre-fills Bank Holidays select from existing allowance", () => {
    renderModal(
      <YearAllowanceModal
        existing={{
          year: 2026,
          company: "Acme",
          holidayStartMonth: 1,
          core: 25,
          bought: 0,
          carried: 0,
          bankHolidayHandling: "deduct" as import("@/types").BankHolidayHandling,
        }}
        onClose={jest.fn()}
        onSave={jest.fn()}
      />
    );
    const select = screen.getByLabelText("Bank Holidays") as HTMLSelectElement;
    expect(select.value).toBe("deduct");
  });

  it("calls onSave with bankHolidayHandling=deduct when Deduct option is selected", async () => {
    const user = setup();
    const onSave = jest.fn();
    renderModal(<YearAllowanceModal initialYear={2026} onClose={jest.fn()} onSave={onSave} />);
    const select = screen.getByLabelText("Bank Holidays");
    await user.selectOptions(select, "deduct");
    await user.click(screen.getByRole("button", { name: "Save" }));
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ bankHolidayHandling: "deduct" }));
  });

  it("calls onSave with bankHolidayHandling=none (default) when option is not changed", async () => {
    const user = setup();
    const onSave = jest.fn();
    renderModal(<YearAllowanceModal initialYear={2026} onClose={jest.fn()} onSave={onSave} />);
    await user.click(screen.getByRole("button", { name: "Save" }));
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ bankHolidayHandling: "none" }));
  });
});

// ---------------------------------------------------------------------------
// YearAllowanceModal — overlap validation
// ---------------------------------------------------------------------------
describe("YearAllowanceModal — overlap validation", () => {
  const existingAllowance = {
    id: "ya-2025-1-acme",
    year: 2025,
    company: "Acme",
    holidayStartMonth: 1,
    startDate: "2025-01-01",
    endDate: "2025-12-31",
    core: 25,
    bought: 0,
    carried: 0,
    active: true as boolean | undefined,
  };

  it("prevents saving when the new allowance overlaps an existing one for the same company", async () => {
    const user = setup();
    const onSave = jest.fn();
    renderModal(
      <YearAllowanceModal
        initialYear={2025}
        existingAllowances={[existingAllowance]}
        onClose={jest.fn()}
        onSave={onSave}
      />
    );
    // Set company to "Acme" which already has a 2025 allowance
    const companyInput = screen.getByRole("combobox", { name: /^Company/i });
    await user.clear(companyInput);
    await user.type(companyInput, "Acme");
    await user.click(screen.getByRole("button", { name: "Save" }));
    expect(onSave).not.toHaveBeenCalled();
    expect(screen.getByText(/overlaps with an existing allowance/i)).toBeInTheDocument();
  });

  it("allows saving when the new allowance is for a different company", async () => {
    const user = setup();
    const onSave = jest.fn();
    renderModal(
      <YearAllowanceModal
        initialYear={2025}
        existingAllowances={[existingAllowance]}
        onClose={jest.fn()}
        onSave={onSave}
      />
    );
    // Different company — no overlap
    const companyInput = screen.getByRole("combobox", { name: /^Company/i });
    await user.clear(companyInput);
    await user.type(companyInput, "Globex");
    await user.click(screen.getByRole("button", { name: "Save" }));
    expect(onSave).toHaveBeenCalled();
  });

  it("allows saving when there are no existing allowances", async () => {
    const user = setup();
    const onSave = jest.fn();
    renderModal(
      <YearAllowanceModal
        initialYear={2025}
        existingAllowances={[]}
        onClose={jest.fn()}
        onSave={onSave}
      />
    );
    await user.click(screen.getByRole("button", { name: "Save" }));
    expect(onSave).toHaveBeenCalled();
  });

  it("skips inactive allowances when checking for overlaps", async () => {
    const user = setup();
    const onSave = jest.fn();
    const inactiveAllowance = { ...existingAllowance, active: false as boolean | undefined };
    renderModal(
      <YearAllowanceModal
        initialYear={2025}
        existingAllowances={[inactiveAllowance]}
        onClose={jest.fn()}
        onSave={onSave}
      />
    );
    const companyInput = screen.getByRole("combobox", { name: /^Company/i });
    await user.clear(companyInput);
    await user.type(companyInput, "Acme");
    await user.click(screen.getByRole("button", { name: "Save" }));
    // Inactive allowance should not block save
    expect(onSave).toHaveBeenCalled();
  });

  it("skips the allowance being edited when checking for overlaps", async () => {
    const user = setup();
    const onSave = jest.fn();
    renderModal(
      <YearAllowanceModal
        existing={existingAllowance}
        existingAllowances={[existingAllowance]}
        onClose={jest.fn()}
        onSave={onSave}
      />
    );
    // Editing the same allowance should not trigger an overlap error
    await user.click(screen.getByRole("button", { name: "Save" }));
    expect(onSave).toHaveBeenCalled();
  });

  it("falls back to computing dates from year/month when startDate/endDate are absent on an existing allowance", async () => {
    const user = setup();
    const onSave = jest.fn();
    const noDateAllowance = {
      year: 2025,
      company: "Acme",
      holidayStartMonth: 1,
      core: 25,
      bought: 0,
      carried: 0,
    };
    renderModal(
      <YearAllowanceModal
        initialYear={2025}
        existingAllowances={[noDateAllowance]}
        onClose={jest.fn()}
        onSave={onSave}
      />
    );
    const companyInput = screen.getByRole("combobox", { name: /^Company/i });
    await user.clear(companyInput);
    await user.type(companyInput, "Acme");
    await user.click(screen.getByRole("button", { name: "Save" }));
    // Should detect overlap even without stored startDate/endDate
    expect(onSave).not.toHaveBeenCalled();
    expect(screen.getByText(/overlaps with an existing allowance/i)).toBeInTheDocument();
  });

  it("falls back to holidayStartMonth=1 when both dates and month are absent on an existing allowance", async () => {
    const user = setup();
    const onSave = jest.fn();
    // Legacy allowance with no startDate/endDate and no holidayStartMonth
    const legacyAllowance = {
      year: 2025,
      company: "Acme",
      core: 25,
      bought: 0,
      carried: 0,
    } as import("@/types").YearAllowance;
    renderModal(
      <YearAllowanceModal
        initialYear={2025}
        existingAllowances={[legacyAllowance]}
        onClose={jest.fn()}
        onSave={onSave}
      />
    );
    const companyInput = screen.getByRole("combobox", { name: /^Company/i });
    await user.clear(companyInput);
    await user.type(companyInput, "Acme");
    await user.click(screen.getByRole("button", { name: "Save" }));
    // Should detect overlap even without holidayStartMonth (defaults to 1)
    expect(onSave).not.toHaveBeenCalled();
    expect(screen.getByText(/overlaps with an existing allowance/i)).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// YearAllowanceModal — Hours / Days toggle
// ---------------------------------------------------------------------------
describe("YearAllowanceModal — Hours/Days toggle", () => {
  it("renders the Allowance Unit toggle with Days and Hours buttons", () => {
    renderModal(<YearAllowanceModal initialYear={2026} onClose={jest.fn()} onSave={jest.fn()} />);
    expect(screen.getByRole("button", { name: "Days" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Hours" })).toBeInTheDocument();
  });

  it("defaults to Days mode — Days button is pressed", () => {
    renderModal(<YearAllowanceModal initialYear={2026} onClose={jest.fn()} onSave={jest.fn()} />);
    expect(screen.getByRole("button", { name: "Days" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Hours" })).toHaveAttribute("aria-pressed", "false");
  });

  it("does not show Core Daily Hours field in Days mode", () => {
    renderModal(<YearAllowanceModal initialYear={2026} onClose={jest.fn()} onSave={jest.fn()} />);
    expect(screen.queryByLabelText("Core Daily Hours")).toBeNull();
  });

  it("shows Core Daily Hours field when Hours mode is activated", async () => {
    const user = setup();
    renderModal(<YearAllowanceModal initialYear={2026} onClose={jest.fn()} onSave={jest.fn()} />);
    await user.click(screen.getByRole("button", { name: "Hours" }));
    expect(screen.getByLabelText("Core Daily Hours")).toBeInTheDocument();
  });

  it("shows 'Core Hours' label for the core allowance field in Hours mode", async () => {
    const user = setup();
    renderModal(<YearAllowanceModal initialYear={2026} onClose={jest.fn()} onSave={jest.fn()} />);
    await user.click(screen.getByRole("button", { name: "Hours" }));
    expect(screen.getByLabelText("Core Hours")).toBeInTheDocument();
  });

  it("shows 'Hours Bought' and 'Hours Carried Over' labels in Hours mode", async () => {
    const user = setup();
    renderModal(<YearAllowanceModal initialYear={2026} onClose={jest.fn()} onSave={jest.fn()} />);
    await user.click(screen.getByRole("button", { name: "Hours" }));
    expect(screen.getByLabelText("Hours Bought")).toBeInTheDocument();
    expect(screen.getByLabelText("Hours Carried Over")).toBeInTheDocument();
  });

  it("converts core days to hours when switching to Hours mode (25 days × 7.5 = 187.5)", async () => {
    const user = setup();
    renderModal(<YearAllowanceModal initialYear={2026} onClose={jest.fn()} onSave={jest.fn()} />);
    // Default core is 25 days; after switching to Hours mode it should be 187.5
    await user.click(screen.getByRole("button", { name: "Hours" }));
    const coreInput = screen.getByLabelText("Core Hours") as HTMLInputElement;
    expect(parseFloat(coreInput.value)).toBe(187.5);
  });

  it("converts hours back to days when switching back to Days mode", async () => {
    const user = setup();
    renderModal(<YearAllowanceModal initialYear={2026} onClose={jest.fn()} onSave={jest.fn()} />);
    await user.click(screen.getByRole("button", { name: "Hours" }));
    await user.click(screen.getByRole("button", { name: "Days" }));
    const coreInput = screen.getByLabelText("Core Days") as HTMLInputElement;
    expect(parseFloat(coreInput.value)).toBe(25);
  });

  it("saves core value converted to days when Hours mode is active", async () => {
    const user = setup();
    const onSave = jest.fn();
    renderModal(<YearAllowanceModal initialYear={2026} onClose={jest.fn()} onSave={onSave} />);
    await user.click(screen.getByRole("button", { name: "Hours" }));
    // Default conversion: 25 days × 7.5 = 187.5 hours; saving should store 25 days
    await user.click(screen.getByRole("button", { name: "Save" }));
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        core: 25,
        useHoursDisplay: true,
        coreHoursPerDay: 7.5,
      })
    );
  });

  it("stores useHoursDisplay=false and coreHoursPerDay=undefined in Days mode", async () => {
    const user = setup();
    const onSave = jest.fn();
    renderModal(<YearAllowanceModal initialYear={2026} onClose={jest.fn()} onSave={onSave} />);
    await user.click(screen.getByRole("button", { name: "Save" }));
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        useHoursDisplay: false,
        coreHoursPerDay: undefined,
      })
    );
  });

  it("restores Hours mode when existing allowance has useHoursDisplay=true", () => {
    renderModal(
      <YearAllowanceModal
        existing={{
          year: 2026,
          company: "Acme",
          holidayStartMonth: 1,
          core: 25,
          bought: 0,
          carried: 0,
          useHoursDisplay: true,
          coreHoursPerDay: 7.5,
        }}
        onClose={jest.fn()}
        onSave={jest.fn()}
      />
    );
    expect(screen.getByRole("button", { name: "Hours" })).toHaveAttribute("aria-pressed", "true");
    // Values should be pre-converted to hours
    const coreInput = screen.getByLabelText("Core Hours") as HTMLInputElement;
    expect(parseFloat(coreInput.value)).toBe(187.5);
  });

  it("does not re-convert when toggling to the same unit (no-op)", async () => {
    const user = setup();
    renderModal(<YearAllowanceModal initialYear={2026} onClose={jest.fn()} onSave={jest.fn()} />);
    // Clicking Days when already in Days mode should be a no-op
    await user.click(screen.getByRole("button", { name: "Days" }));
    const coreInput = screen.getByLabelText("Core Days") as HTMLInputElement;
    expect(parseFloat(coreInput.value)).toBe(25);
  });

  it("saves fractional days when a non-integer hours value is entered", async () => {
    const user = setup();
    const onSave = jest.fn();
    renderModal(<YearAllowanceModal initialYear={2026} onClose={jest.fn()} onSave={onSave} />);
    await user.click(screen.getByRole("button", { name: "Hours" }));
    const coreInput = screen.getByLabelText("Core Hours");
    await user.clear(coreInput);
    await user.type(coreInput, "190");
    await user.click(screen.getByRole("button", { name: "Save" }));
    // 190 / 7.5 ≈ 25.333...
    const savedCore = (onSave.mock.calls[0][0] as { core: number }).core;
    expect(savedCore).toBeCloseTo(190 / 7.5, 5);
  });

  it("re-scales field values when Core Daily Hours is changed", async () => {
    const user = setup();
    const onSave = jest.fn();
    renderModal(<YearAllowanceModal initialYear={2026} onClose={jest.fn()} onSave={onSave} />);
    await user.click(screen.getByRole("button", { name: "Hours" }));
    // Default: 25 days × 7.5 h/day = 187.5 h
    const cdhInput = screen.getByLabelText("Core Daily Hours");
    await user.clear(cdhInput);
    await user.type(cdhInput, "8");
    // coreHoursPerDay is now 8; the displayed hours haven't auto-scaled (187.5 → stays)
    // On save: 187.5 h / 8 h/day = 23.4375 days
    await user.click(screen.getByRole("button", { name: "Save" }));
    const savedCore = (onSave.mock.calls[0][0] as { core: number }).core;
    expect(savedCore).toBeCloseTo(187.5 / 8, 5);
  });
});
