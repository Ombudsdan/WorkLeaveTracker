import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import AuthFormLayout from "@/components/organisms/AuthFormLayout";

function setup() {
  return userEvent.setup();
}

describe("AuthFormLayout — rendering", () => {
  it("renders the title", () => {
    render(
      <AuthFormLayout title="Sign In" onSubmit={jest.fn()}>
        <button type="submit">Submit</button>
      </AuthFormLayout>
    );
    expect(screen.getByText("Sign In")).toBeInTheDocument();
  });

  it("renders children inside the form", () => {
    render(
      <AuthFormLayout title="Sign In" onSubmit={jest.fn()}>
        <input aria-label="email" />
      </AuthFormLayout>
    );
    expect(screen.getByLabelText("email")).toBeInTheDocument();
  });

  it("renders the subtitle when provided", () => {
    render(
      <AuthFormLayout title="Register" subtitle="Create your account" onSubmit={jest.fn()}>
        <span />
      </AuthFormLayout>
    );
    expect(screen.getByText("Create your account")).toBeInTheDocument();
  });

  it("does not render a subtitle when omitted", () => {
    render(
      <AuthFormLayout title="Register" onSubmit={jest.fn()}>
        <span />
      </AuthFormLayout>
    );
    expect(screen.queryByText("Create your account")).not.toBeInTheDocument();
  });

  it("renders footer content when provided", () => {
    render(
      <AuthFormLayout
        title="Sign In"
        onSubmit={jest.fn()}
        footer={<a href="/register">Register</a>}
      >
        <span />
      </AuthFormLayout>
    );
    expect(screen.getByRole("link", { name: "Register" })).toBeInTheDocument();
  });

  it("does not render a footer when omitted", () => {
    render(
      <AuthFormLayout title="Sign In" onSubmit={jest.fn()}>
        <span />
      </AuthFormLayout>
    );
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });
});

describe("AuthFormLayout — error prop", () => {
  it("renders an alert paragraph when error is provided", () => {
    render(
      <AuthFormLayout title="Sign In" onSubmit={jest.fn()} error="Invalid credentials">
        <span />
      </AuthFormLayout>
    );
    const alert = screen.getByRole("alert");
    expect(alert).toBeInTheDocument();
    expect(alert).toHaveTextContent("Invalid credentials");
  });

  it("does not render an alert when error is absent", () => {
    render(
      <AuthFormLayout title="Sign In" onSubmit={jest.fn()}>
        <span />
      </AuthFormLayout>
    );
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("does not render an alert when error is an empty string", () => {
    render(
      <AuthFormLayout title="Sign In" onSubmit={jest.fn()} error="">
        <span />
      </AuthFormLayout>
    );
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});

describe("AuthFormLayout — form submission", () => {
  it("calls onSubmit when the form is submitted", async () => {
    const user = setup();
    const onSubmit = jest.fn((e) => e.preventDefault());
    render(
      <AuthFormLayout title="Sign In" onSubmit={onSubmit}>
        <button type="submit">Submit</button>
      </AuthFormLayout>
    );
    await user.click(screen.getByRole("button", { name: "Submit" }));
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });
});
