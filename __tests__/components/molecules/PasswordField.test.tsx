import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React, { useState } from "react";
import { FormValidationProvider } from "@/contexts/FormValidationContext";
import PasswordField, { StandalonePasswordField } from "@/components/molecules/PasswordField";

function renderInProvider(ui: React.ReactElement) {
  return render(<FormValidationProvider>{ui}</FormValidationProvider>);
}

/** Wrapper that maintains real controlled state so validation fires on actual values */
function ControlledPasswordField(
  props: React.ComponentProps<typeof PasswordField> & { initialValue?: string }
) {
  const { initialValue, ...rest } = props;
  const [value, setValue] = useState(initialValue ?? (rest.value as string));
  return <PasswordField {...rest} value={value} onChange={setValue} />;
}

describe("PasswordField — rendering", () => {
  it("renders a labelled password input", () => {
    renderInProvider(
      <PasswordField id="password" label="Password" value="" onChange={jest.fn()} />
    );
    expect(screen.getByLabelText("Password")).toBeInTheDocument();
    expect(screen.getByLabelText("Password")).toHaveAttribute("type", "password");
  });

  it("renders as read-only when readOnly is true", () => {
    renderInProvider(<PasswordField id="password" label="Password" value="secret" readOnly />);
    expect(screen.getByLabelText("Password")).toHaveAttribute("readonly");
  });

  it("renders with the placeholder", () => {
    renderInProvider(
      <PasswordField
        id="password"
        label="Password"
        value=""
        onChange={jest.fn()}
        placeholder="Min. 8 characters"
      />
    );
    expect(screen.getByPlaceholderText("Min. 8 characters")).toBeInTheDocument();
  });

  it("displays the current value", () => {
    renderInProvider(
      <PasswordField id="password" label="Password" value="mysecret" onChange={jest.fn()} />
    );
    expect(screen.getByLabelText("Password")).toHaveValue("mysecret");
  });
});

describe("PasswordField — validation", () => {
  it("shows a required error when the field is emptied and required is true", async () => {
    renderInProvider(
      <ControlledPasswordField
        id="password"
        label="Password"
        initialValue="abc"
        value="abc"
        required
      />
    );
    await userEvent.clear(screen.getByLabelText("Password"));
    expect(screen.getByText("Password is required")).toBeInTheDocument();
  });

  it("shows a custom required message when required is a string", async () => {
    renderInProvider(
      <ControlledPasswordField
        id="password"
        label="Password"
        initialValue="abc"
        value="abc"
        required="Please enter your password"
      />
    );
    await userEvent.clear(screen.getByLabelText("Password"));
    expect(screen.getByText("Please enter your password")).toBeInTheDocument();
  });

  it("does not show an error when a value is provided", async () => {
    renderInProvider(
      <ControlledPasswordField id="password" label="Password" initialValue="" value="" required />
    );
    await userEvent.type(screen.getByLabelText("Password"), "mysecret");
    expect(screen.queryByText("Password is required")).toBeNull();
  });

  it("calls onChange with the new value when the user types", async () => {
    const handleChange = jest.fn();
    renderInProvider(
      <PasswordField id="password" label="Password" value="" onChange={handleChange} />
    );
    await userEvent.type(screen.getByLabelText("Password"), "a");
    expect(handleChange).toHaveBeenCalledWith("a");
  });
});

describe("StandalonePasswordField — isolated validation scope", () => {
  function ControlledStandalonePasswordField(
    props: Omit<React.ComponentProps<typeof StandalonePasswordField>, "onChange" | "value"> & {
      initialValue?: string;
    }
  ) {
    const [value, setValue] = useState(props.initialValue ?? "");
    return <StandalonePasswordField {...props} value={value} onChange={setValue} />;
  }

  it("renders without needing an outer FormValidationProvider", () => {
    render(
      <StandalonePasswordField id="password" label="Password" value="" onChange={jest.fn()} />
    );
    expect(screen.getByLabelText("Password")).toBeInTheDocument();
  });

  it("validates required independently after clearing the field", async () => {
    render(<ControlledStandalonePasswordField id="password" label="Password" required />);
    await userEvent.type(screen.getByLabelText("Password"), "abc");
    await userEvent.clear(screen.getByLabelText("Password"));
    expect(screen.getByText("Password is required")).toBeInTheDocument();
  });
});
