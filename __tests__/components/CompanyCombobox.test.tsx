import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import CompanyCombobox from "@/components/CompanyCombobox";

function setup() {
  return userEvent.setup();
}

describe("CompanyCombobox — rendering", () => {
  it("renders the label", () => {
    render(<CompanyCombobox id="co" label="Company" value="" onChange={jest.fn()} />);
    // Label text includes "(optional)", use partial match
    expect(screen.getByLabelText(/^Company/)).toBeInTheDocument();
  });

  it("renders the text input", () => {
    render(<CompanyCombobox id="co" label="Company" value="" onChange={jest.fn()} />);
    expect(screen.getByRole("combobox")).toBeInTheDocument();
  });

  it("shows '(optional)' suffix by default (optional=true)", () => {
    render(<CompanyCombobox id="co" label="Company" value="" onChange={jest.fn()} />);
    expect(screen.getByText("(optional)")).toBeInTheDocument();
  });

  it("hides '(optional)' suffix when optional=false", () => {
    render(
      <CompanyCombobox id="co" label="Company" value="" onChange={jest.fn()} optional={false} />
    );
    expect(screen.queryByText("(optional)")).toBeNull();
  });

  it("renders the placeholder text", () => {
    render(<CompanyCombobox id="co" label="Company" value="" onChange={jest.fn()} />);
    expect(screen.getByPlaceholderText("e.g. Acme Ltd")).toBeInTheDocument();
  });

  it("does NOT render a datalist when suggestions is empty", () => {
    const { container } = render(
      <CompanyCombobox id="co" label="Company" value="" onChange={jest.fn()} suggestions={[]} />
    );
    expect(container.querySelector("datalist")).toBeNull();
  });

  it("renders a datalist when suggestions are provided", () => {
    const { container } = render(
      <CompanyCombobox
        id="co"
        label="Company"
        value=""
        onChange={jest.fn()}
        suggestions={["Acme Ltd", "Globex"]}
      />
    );
    expect(container.querySelector("datalist")).toBeInTheDocument();
  });

  it("renders an option for each unique suggestion", () => {
    const { container } = render(
      <CompanyCombobox
        id="co"
        label="Company"
        value=""
        onChange={jest.fn()}
        suggestions={["Acme Ltd", "Globex"]}
      />
    );
    const options = container.querySelectorAll("option");
    expect(options).toHaveLength(2);
  });

  it("deduplicates suggestions", () => {
    const { container } = render(
      <CompanyCombobox
        id="co"
        label="Company"
        value=""
        onChange={jest.fn()}
        suggestions={["Acme Ltd", "Acme Ltd", "Globex"]}
      />
    );
    const options = container.querySelectorAll("option");
    expect(options).toHaveLength(2);
  });

  it("filters out falsy values from suggestions", () => {
    const { container } = render(
      <CompanyCombobox
        id="co"
        label="Company"
        value=""
        onChange={jest.fn()}
        suggestions={["Acme Ltd", "", "Globex"]}
      />
    );
    const options = container.querySelectorAll("option");
    expect(options).toHaveLength(2);
  });
});

describe("CompanyCombobox — value and onChange", () => {
  it("displays the current value in the input", () => {
    render(<CompanyCombobox id="co" label="Company" value="Current Co" onChange={jest.fn()} />);
    expect(screen.getByDisplayValue("Current Co")).toBeInTheDocument();
  });

  it("calls onChange when the user types", async () => {
    const onChange = jest.fn();
    const user = setup();
    render(<CompanyCombobox id="co" label="Company" value="" onChange={onChange} />);
    await user.type(screen.getByRole("combobox"), "A");
    // onChange is called with the character typed
    expect(onChange).toHaveBeenCalledWith("A");
  });
});
