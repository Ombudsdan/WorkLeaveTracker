import { render, screen } from "@testing-library/react";
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

  it("shows the computed total", () => {
    renderModal(
      <YearAllowanceModal
        existing={{
          year: 2026,
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
    expect(screen.getByText(/25/)).toBeInTheDocument();
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
    });
  });

  it("updates the total when core days are changed", async () => {
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
    // Total should update to 30
    expect(screen.getByText(/30/)).toBeInTheDocument();
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
  // Select "Other / not listed" from the company dropdown
  const companySelect = screen.getByRole("combobox", { name: /company/i });
  await user.selectOptions(companySelect, "__other__");
  // Type into the revealed custom input
  const customInput = screen.getByLabelText("Custom company name");
  await user.type(customInput, "NewCo");
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
