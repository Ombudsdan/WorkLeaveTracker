import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import UserSelector from "@/components/dashboard/UserSelector";
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
  },
  allowance: { core: 25, bought: 0, carried: 0 },
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
  },
  allowance: { core: 25, bought: 0, carried: 0 },
  entries: [],
};

describe("UserSelector", () => {
  it("renders the 'My Calendar' button", () => {
    render(
      <UserSelector
        currentUser={alice}
        allUsers={[alice, bob]}
        viewingUserId={null}
        onSelectUser={jest.fn()}
      />
    );
    expect(screen.getByRole("button", { name: "My Calendar" })).toBeInTheDocument();
  });

  it("renders a button for each other user", () => {
    render(
      <UserSelector
        currentUser={alice}
        allUsers={[alice, bob]}
        viewingUserId={null}
        onSelectUser={jest.fn()}
      />
    );
    expect(screen.getByRole("button", { name: "Bob Jones" })).toBeInTheDocument();
  });

  it("does NOT render a button for the current user", () => {
    render(
      <UserSelector
        currentUser={alice}
        allUsers={[alice, bob]}
        viewingUserId={null}
        onSelectUser={jest.fn()}
      />
    );
    expect(screen.queryByRole("button", { name: "Alice Smith" })).toBeNull();
  });

  it("highlights 'My Calendar' with active class when viewingUserId is null", () => {
    render(
      <UserSelector
        currentUser={alice}
        allUsers={[alice, bob]}
        viewingUserId={null}
        onSelectUser={jest.fn()}
      />
    );
    expect(screen.getByRole("button", { name: "My Calendar" }).className).toContain(
      "bg-indigo-600"
    );
  });

  it("highlights the selected user's button when viewingUserId matches", () => {
    render(
      <UserSelector
        currentUser={alice}
        allUsers={[alice, bob]}
        viewingUserId="u2"
        onSelectUser={jest.fn()}
      />
    );
    expect(screen.getByRole("button", { name: "Bob Jones" }).className).toContain("bg-indigo-600");
    // 'My Calendar' should NOT be active
    expect(screen.getByRole("button", { name: "My Calendar" }).className).not.toContain(
      "bg-indigo-600"
    );
  });

  it("calls onSelectUser(null) when 'My Calendar' is clicked", async () => {
    const onSelectUser = jest.fn();
    render(
      <UserSelector
        currentUser={alice}
        allUsers={[alice, bob]}
        viewingUserId="u2"
        onSelectUser={onSelectUser}
      />
    );
    await userEvent.click(screen.getByRole("button", { name: "My Calendar" }));
    expect(onSelectUser).toHaveBeenCalledWith(null);
  });

  it("calls onSelectUser with the user's id when an other user button is clicked", async () => {
    const onSelectUser = jest.fn();
    render(
      <UserSelector
        currentUser={alice}
        allUsers={[alice, bob]}
        viewingUserId={null}
        onSelectUser={onSelectUser}
      />
    );
    await userEvent.click(screen.getByRole("button", { name: "Bob Jones" }));
    expect(onSelectUser).toHaveBeenCalledWith("u2");
  });

  it("renders no other-user buttons when the current user is the only user", () => {
    render(
      <UserSelector
        currentUser={alice}
        allUsers={[alice]}
        viewingUserId={null}
        onSelectUser={jest.fn()}
      />
    );
    // Only the "My Calendar" button
    expect(screen.getAllByRole("button")).toHaveLength(1);
  });
});
