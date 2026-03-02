import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import UserSelector from "@/components/dashboard/UserSelector";
import type { PublicUser } from "@/types";

const alice: PublicUser = {
  id: "u1",
  profile: {
    firstName: "Alice",
    lastName: "Smith",
    email: "alice@example.com",
    nonWorkingDays: [0, 6],
    pinnedUserIds: ["u2"],
  },
  yearAllowances: [
    { year: 2026, company: "Acme", holidayStartMonth: 1, core: 25, bought: 0, carried: 0 },
  ],
  entries: [],
};

const bob: PublicUser = {
  id: "u2",
  profile: {
    firstName: "Bob",
    lastName: "Jones",
    email: "bob@example.com",
    nonWorkingDays: [0, 6],
    pinnedUserIds: [],
  },
  yearAllowances: [
    { year: 2026, company: "Acme", holidayStartMonth: 1, core: 25, bought: 0, carried: 0 },
  ],
  entries: [],
};

describe("UserSelector", () => {
  it("renders the 'My Calendar' tab", () => {
    render(
      <UserSelector
        currentUser={alice}
        allUsers={[alice, bob]}
        viewingUserId={null}
        onSelectUser={jest.fn()}
      />
    );
    expect(screen.getByRole("tab", { name: "My Calendar" })).toBeInTheDocument();
  });

  it("renders a tab for each pinned user", () => {
    render(
      <UserSelector
        currentUser={alice}
        allUsers={[alice, bob]}
        viewingUserId={null}
        onSelectUser={jest.fn()}
      />
    );
    expect(screen.getByRole("tab", { name: "Bob Jones" })).toBeInTheDocument();
  });

  it("does NOT render a tab for the current user", () => {
    render(
      <UserSelector
        currentUser={alice}
        allUsers={[alice, bob]}
        viewingUserId={null}
        onSelectUser={jest.fn()}
      />
    );
    expect(screen.queryByRole("tab", { name: "Alice Smith" })).toBeNull();
  });

  it("marks 'My Calendar' as selected (aria-selected=true) when viewingUserId is null", () => {
    render(
      <UserSelector
        currentUser={alice}
        allUsers={[alice, bob]}
        viewingUserId={null}
        onSelectUser={jest.fn()}
      />
    );
    expect(screen.getByRole("tab", { name: "My Calendar" })).toHaveAttribute(
      "aria-selected",
      "true"
    );
  });

  it("marks the selected user's tab as selected when viewingUserId matches", () => {
    render(
      <UserSelector
        currentUser={alice}
        allUsers={[alice, bob]}
        viewingUserId="u2"
        onSelectUser={jest.fn()}
      />
    );
    expect(screen.getByRole("tab", { name: "Bob Jones" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tab", { name: "My Calendar" })).toHaveAttribute(
      "aria-selected",
      "false"
    );
  });

  it("calls onSelectUser(null) when 'My Calendar' tab is clicked", async () => {
    const onSelectUser = jest.fn();
    render(
      <UserSelector
        currentUser={alice}
        allUsers={[alice, bob]}
        viewingUserId="u2"
        onSelectUser={onSelectUser}
      />
    );
    await userEvent.click(screen.getByRole("tab", { name: "My Calendar" }));
    expect(onSelectUser).toHaveBeenCalledWith(null);
  });

  it("calls onSelectUser with the user's id when a pinned user tab is clicked", async () => {
    const onSelectUser = jest.fn();
    render(
      <UserSelector
        currentUser={alice}
        allUsers={[alice, bob]}
        viewingUserId={null}
        onSelectUser={onSelectUser}
      />
    );
    await userEvent.click(screen.getByRole("tab", { name: "Bob Jones" }));
    expect(onSelectUser).toHaveBeenCalledWith("u2");
  });

  it("renders nothing when the current user has no pinned users", () => {
    const aliceNoPins: typeof alice = {
      ...alice,
      profile: { ...alice.profile, pinnedUserIds: [] },
    };
    const { container } = render(
      <UserSelector
        currentUser={aliceNoPins}
        allUsers={[aliceNoPins, bob]}
        viewingUserId={null}
        onSelectUser={jest.fn()}
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders nothing when pinnedUserIds is undefined", () => {
    const aliceUndefinedPins: typeof alice = {
      ...alice,
      profile: { ...alice.profile, pinnedUserIds: undefined },
    };
    const { container } = render(
      <UserSelector
        currentUser={aliceUndefinedPins}
        allUsers={[aliceUndefinedPins, bob]}
        viewingUserId={null}
        onSelectUser={jest.fn()}
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it("does NOT render a tab for a user that is not pinned", () => {
    const charlie: typeof bob = {
      ...bob,
      id: "u3",
      profile: {
        ...bob.profile,
        firstName: "Charlie",
        lastName: "Brown",
        email: "charlie@example.com",
      },
    };
    // alice only pins u2 (bob), not u3 (charlie)
    render(
      <UserSelector
        currentUser={alice}
        allUsers={[alice, bob, charlie]}
        viewingUserId={null}
        onSelectUser={jest.fn()}
      />
    );
    expect(screen.queryByRole("tab", { name: "Charlie Brown" })).toBeNull();
    expect(screen.getByRole("tab", { name: "Bob Jones" })).toBeInTheDocument();
  });

  it("renders a tablist with aria-label when pinned users exist", () => {
    render(
      <UserSelector
        currentUser={alice}
        allUsers={[alice, bob]}
        viewingUserId={null}
        onSelectUser={jest.fn()}
      />
    );
    expect(screen.getByRole("tablist")).toBeInTheDocument();
  });
});
