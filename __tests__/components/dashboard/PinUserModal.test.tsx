import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import PinUserModal from "@/components/dashboard/PinUserModal";
import type { PublicUser } from "@/types";

const alice: PublicUser = {
  id: "u1",
  profile: {
    firstName: "Alice",
    lastName: "Smith",
    company: "Acme",
    email: "alice@example.com",
    nonWorkingDays: [0, 6],
    holidayStartMonth: 1,
    pinnedUserIds: [],
  },
  yearAllowances: [{ year: 2026, core: 25, bought: 0, carried: 0 }],
  entries: [],
};

const bob: PublicUser = {
  id: "u2",
  profile: {
    firstName: "Bob",
    lastName: "Jones",
    company: "Acme",
    email: "bob@example.com",
    nonWorkingDays: [0, 6],
    holidayStartMonth: 1,
    pinnedUserIds: [],
  },
  yearAllowances: [{ year: 2026, core: 25, bought: 0, carried: 0 }],
  entries: [],
};

describe("PinUserModal — rendering", () => {
  it("renders the heading", () => {
    render(
      <PinUserModal
        otherUsers={[alice, bob]}
        pinnedUserIds={[]}
        onClose={jest.fn()}
        onPin={jest.fn()}
      />
    );
    expect(screen.getByRole("heading", { name: "Search for a User" })).toBeInTheDocument();
  });

  it("renders the email input", () => {
    render(
      <PinUserModal
        otherUsers={[alice, bob]}
        pinnedUserIds={[]}
        onClose={jest.fn()}
        onPin={jest.fn()}
      />
    );
    expect(screen.getByLabelText("Email address")).toBeInTheDocument();
  });

  it("renders the Search & Pin and Close buttons", () => {
    render(
      <PinUserModal
        otherUsers={[alice, bob]}
        pinnedUserIds={[]}
        onClose={jest.fn()}
        onPin={jest.fn()}
      />
    );
    expect(screen.getByRole("button", { name: /search/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /close/i })).toBeInTheDocument();
  });
});

describe("PinUserModal — search", () => {
  it("shows error when searching with an empty email", async () => {
    render(
      <PinUserModal
        otherUsers={[alice, bob]}
        pinnedUserIds={[]}
        onClose={jest.fn()}
        onPin={jest.fn()}
      />
    );
    await userEvent.click(screen.getByRole("button", { name: /search/i }));
    expect(screen.getByText("Please enter an email address.")).toBeInTheDocument();
  });

  it("shows error when no user is found with the entered email", async () => {
    render(
      <PinUserModal
        otherUsers={[alice, bob]}
        pinnedUserIds={[]}
        onClose={jest.fn()}
        onPin={jest.fn()}
      />
    );
    await userEvent.type(screen.getByLabelText("Email address"), "nobody@example.com");
    await userEvent.click(screen.getByRole("button", { name: /search/i }));
    expect(screen.getByText("No user found with that email address.")).toBeInTheDocument();
  });

  it("calls onPin with the matched user's id", async () => {
    const onPin = jest.fn();
    render(
      <PinUserModal
        otherUsers={[alice, bob]}
        pinnedUserIds={[]}
        onClose={jest.fn()}
        onPin={onPin}
      />
    );
    await userEvent.type(screen.getByLabelText("Email address"), "alice@example.com");
    await userEvent.click(screen.getByRole("button", { name: /search/i }));
    expect(onPin).toHaveBeenCalledWith("u1");
  });

  it("shows success message after pinning", async () => {
    render(
      <PinUserModal
        otherUsers={[alice, bob]}
        pinnedUserIds={[]}
        onClose={jest.fn()}
        onPin={jest.fn()}
      />
    );
    await userEvent.type(screen.getByLabelText("Email address"), "alice@example.com");
    await userEvent.click(screen.getByRole("button", { name: /search/i }));
    expect(screen.getByText(/Alice Smith has been pinned/i)).toBeInTheDocument();
  });

  it("shows error when the user is already pinned", async () => {
    render(
      <PinUserModal
        otherUsers={[alice, bob]}
        pinnedUserIds={["u1"]}
        onClose={jest.fn()}
        onPin={jest.fn()}
      />
    );
    await userEvent.type(screen.getByLabelText("Email address"), "alice@example.com");
    await userEvent.click(screen.getByRole("button", { name: /search/i }));
    expect(screen.getByText(/already pinned/i)).toBeInTheDocument();
  });

  it("shows error when the pinned limit is reached", async () => {
    render(
      <PinUserModal
        otherUsers={[alice, bob]}
        pinnedUserIds={["u3", "u4", "u5"]}
        onClose={jest.fn()}
        onPin={jest.fn()}
      />
    );
    await userEvent.type(screen.getByLabelText("Email address"), "alice@example.com");
    await userEvent.click(screen.getByRole("button", { name: /search/i }));
    expect(screen.getByText(/maximum of 3/i)).toBeInTheDocument();
  });

  it("is case-insensitive when matching email", async () => {
    const onPin = jest.fn();
    render(
      <PinUserModal
        otherUsers={[alice, bob]}
        pinnedUserIds={[]}
        onClose={jest.fn()}
        onPin={onPin}
      />
    );
    await userEvent.type(screen.getByLabelText("Email address"), "ALICE@EXAMPLE.COM");
    await userEvent.click(screen.getByRole("button", { name: /search/i }));
    expect(onPin).toHaveBeenCalledWith("u1");
  });

  it("triggers search on Enter key press", async () => {
    const onPin = jest.fn();
    render(
      <PinUserModal
        otherUsers={[alice, bob]}
        pinnedUserIds={[]}
        onClose={jest.fn()}
        onPin={onPin}
      />
    );
    await userEvent.type(screen.getByLabelText("Email address"), "bob@example.com{Enter}");
    expect(onPin).toHaveBeenCalledWith("u2");
  });
});

describe("PinUserModal — close", () => {
  it("calls onClose when the Close button is clicked", async () => {
    const onClose = jest.fn();
    render(
      <PinUserModal
        otherUsers={[alice, bob]}
        pinnedUserIds={[]}
        onClose={onClose}
        onPin={jest.fn()}
      />
    );
    await userEvent.click(screen.getByRole("button", { name: /close/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
