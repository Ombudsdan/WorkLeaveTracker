import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import CompanySelect from "@/components/CompanySelect";

function setup() {
  return userEvent.setup();
}

describe("CompanySelect — rendering", () => {
  it("renders the label", () => {
    render(<CompanySelect id="co" label="Company" value="" onChange={jest.fn()} />);
    expect(screen.getByLabelText(/company/i)).toBeInTheDocument();
  });

  it("renders the select element", () => {
    render(<CompanySelect id="co" label="Company" value="" onChange={jest.fn()} />);
    expect(screen.getByRole("combobox")).toBeInTheDocument();
  });

  it("renders known companies as options", () => {
    render(
      <CompanySelect
        id="co"
        label="Company"
        value=""
        onChange={jest.fn()}
        companies={["Acme Ltd", "Globex"]}
      />
    );
    expect(screen.getByRole("option", { name: "Acme Ltd" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Globex" })).toBeInTheDocument();
  });

  it("renders an 'Other / not listed' option", () => {
    render(<CompanySelect id="co" label="Company" value="" onChange={jest.fn()} />);
    expect(screen.getByRole("option", { name: /other/i })).toBeInTheDocument();
  });

  it("does NOT show the custom text input initially", () => {
    render(<CompanySelect id="co" label="Company" value="" onChange={jest.fn()} />);
    expect(screen.queryByLabelText("Custom company name")).toBeNull();
  });
});

describe("CompanySelect — selecting a known company", () => {
  it("calls onChange with the selected company name", async () => {
    const onChange = jest.fn();
    const user = setup();
    render(
      <CompanySelect
        id="co"
        label="Company"
        value=""
        onChange={onChange}
        companies={["Acme Ltd"]}
      />
    );
    await user.selectOptions(screen.getByRole("combobox"), "Acme Ltd");
    expect(onChange).toHaveBeenCalledWith("Acme Ltd");
  });
});

describe("CompanySelect — 'Other / not listed' flow", () => {
  it("reveals the custom text input when 'Other' is selected", async () => {
    const user = setup();
    render(<CompanySelect id="co" label="Company" value="" onChange={jest.fn()} />);
    await user.selectOptions(screen.getByRole("combobox"), "__other__");
    expect(screen.getByLabelText("Custom company name")).toBeInTheDocument();
  });

  it("calls onChange with the typed custom name", async () => {
    const onChange = jest.fn();
    const user = setup();
    render(<CompanySelect id="co" label="Company" value="" onChange={onChange} />);
    await user.selectOptions(screen.getByRole("combobox"), "__other__");
    await user.type(screen.getByLabelText("Custom company name"), "My Startup");
    expect(onChange).toHaveBeenLastCalledWith("My Startup");
  });
});

describe("CompanySelect — pre-filled with unknown value", () => {
  it("shows the custom input when value is not in the companies list", () => {
    render(
      <CompanySelect
        id="co"
        label="Company"
        value="Custom Corp"
        onChange={jest.fn()}
        companies={["Acme Ltd"]}
      />
    );
    // The text input should be visible with the custom value
    expect(screen.getByLabelText("Custom company name")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Custom Corp")).toBeInTheDocument();
  });
});

describe("CompanySelect — deduplication and sorting", () => {
  it("sorts options alphabetically", () => {
    render(
      <CompanySelect
        id="co"
        label="Company"
        value=""
        onChange={jest.fn()}
        companies={["Zebra Inc", "Alpha Co", "Acme Ltd"]}
      />
    );
    const options = screen
      .getAllByRole("option")
      .map((o) => o.textContent)
      .filter((t) => !t?.includes("—") && !t?.includes("Other"));
    expect(options).toEqual(["Acme Ltd", "Alpha Co", "Zebra Inc"]);
  });

  it("deduplicates companies", () => {
    render(
      <CompanySelect
        id="co"
        label="Company"
        value=""
        onChange={jest.fn()}
        companies={["Acme Ltd", "Acme Ltd", "Globex"]}
      />
    );
    const acmeOptions = screen.getAllByRole("option", { name: "Acme Ltd" });
    expect(acmeOptions).toHaveLength(1);
  });
});
