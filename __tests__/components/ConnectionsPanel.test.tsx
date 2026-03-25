import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ConnectionsPanel from "@/components/ConnectionsPanel";
import type { PublicUser } from "@/types";
import { usersController } from "@/controllers/usersController";

jest.mock("@/controllers/usersController", () => ({
  usersController: {
    respondToPinRequest: jest.fn(),
    disconnect: jest.fn(),
    revokeConnection: jest.fn(),
    sendPinRequest: jest.fn(),
    fetchAll: jest.fn(),
  },
}));

function setup() {
  return userEvent.setup();
}

const alice: PublicUser = {
  id: "u1",
  profile: {
    firstName: "Alice",
    lastName: "Smith",
    email: "alice@example.com",
    nonWorkingDays: [0, 6],
    pinnedUserIds: [],
    pendingPinRequestsSent: [],
    pendingPinRequestsReceived: [],
    revokedConnections: [],
  },
  yearAllowances: [],
  entries: [],
};

const bob: PublicUser = {
  id: "u2",
  profile: {
    firstName: "Bob",
    lastName: "Jones",
    email: "bob@example.com",
    nonWorkingDays: [0, 6],
    pinnedUserIds: ["u1"],
    pendingPinRequestsSent: [],
    pendingPinRequestsReceived: [],
    revokedConnections: [],
  },
  yearAllowances: [],
  entries: [],
};

describe("ConnectionsPanel — basic rendering", () => {
  it("renders the Connections heading", () => {
    render(
      <ConnectionsPanel
        currentUser={alice}
        allUsers={[alice, bob]}
        onUserChange={jest.fn()}
        onAllUsersChange={jest.fn()}
      />
    );
    expect(screen.getByText("Connections")).toBeInTheDocument();
  });

  it("handles profile with no optional connection fields (null coalescing fallbacks)", () => {
    // Profile without pinnedUserIds, sent/received requests, or revokedConnections
    const minimalAlice: PublicUser = {
      ...alice,
      profile: {
        firstName: "Alice",
        lastName: "Smith",
        email: "alice@example.com",
        nonWorkingDays: [0, 6],
        // No pinnedUserIds, pendingPinRequestsSent, pendingPinRequestsReceived, revokedConnections
      },
    };
    // Charlie has no pinnedUserIds - covers the (u.profile.pinnedUserIds ?? []) branch in followers filter
    const charlieNoPin: PublicUser = {
      id: "u3",
      profile: {
        firstName: "Charlie",
        lastName: "Brown",
        email: "charlie@example.com",
        nonWorkingDays: [],
        // no pinnedUserIds
      },
      yearAllowances: [],
      entries: [],
    };
    // Should render without error even when optional arrays are absent
    render(
      <ConnectionsPanel
        currentUser={minimalAlice}
        allUsers={[minimalAlice, charlieNoPin]}
        onUserChange={jest.fn()}
        onAllUsersChange={jest.fn()}
      />
    );
    expect(screen.getByText("Connections")).toBeInTheDocument();
    expect(screen.getByText("No active connections yet.")).toBeInTheDocument();
  });

  it("renders the Add Connection button", () => {
    render(
      <ConnectionsPanel
        currentUser={alice}
        allUsers={[alice, bob]}
        onUserChange={jest.fn()}
        onAllUsersChange={jest.fn()}
      />
    );
    expect(screen.getByRole("button", { name: /add connection/i })).toBeInTheDocument();
  });

  it("disables Add Connection when 3 connections are already pinned", () => {
    const fullAlice: PublicUser = {
      ...alice,
      profile: {
        ...alice.profile,
        pinnedUserIds: ["u2", "u3", "u4"],
      },
    };
    render(
      <ConnectionsPanel
        currentUser={fullAlice}
        allUsers={[alice]}
        onUserChange={jest.fn()}
        onAllUsersChange={jest.fn()}
      />
    );
    expect(screen.getByRole("button", { name: /add connection/i })).toBeDisabled();
  });

  it("shows 'No active connections yet.' when no connections and no followers", () => {
    render(
      <ConnectionsPanel
        currentUser={alice}
        allUsers={[alice]}
        onUserChange={jest.fn()}
        onAllUsersChange={jest.fn()}
      />
    );
    expect(screen.getByText("No active connections yet.")).toBeInTheDocument();
  });

  it("shows connected users in My Connections list", () => {
    const aliceWithBob: PublicUser = {
      ...alice,
      profile: { ...alice.profile, pinnedUserIds: ["u2"] },
    };
    render(
      <ConnectionsPanel
        currentUser={aliceWithBob}
        allUsers={[aliceWithBob, bob]}
        onUserChange={jest.fn()}
        onAllUsersChange={jest.fn()}
      />
    );
    expect(screen.getByText(/Bob Jones/i)).toBeInTheDocument();
  });

  it("shows followers in My Connections list", () => {
    render(
      <ConnectionsPanel
        currentUser={alice}
        allUsers={[alice, bob]} // Bob has alice in his pinnedUserIds
        onUserChange={jest.fn()}
        onAllUsersChange={jest.fn()}
      />
    );
    expect(screen.getByText(/Bob Jones/i)).toBeInTheDocument();
  });
});

describe("ConnectionsPanel — pending requests", () => {
  it("shows pending requests section when there are incoming requests", () => {
    const aliceWithRequest: PublicUser = {
      ...alice,
      profile: {
        ...alice.profile,
        pendingPinRequestsReceived: ["u2"],
      },
    };
    render(
      <ConnectionsPanel
        currentUser={aliceWithRequest}
        allUsers={[aliceWithRequest, bob]}
        onUserChange={jest.fn()}
        onAllUsersChange={jest.fn()}
      />
    );
    expect(screen.getByText(/pending requests/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /accept request from bob/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /decline request from bob/i })).toBeInTheDocument();
  });

  it("shows awaiting approval section when requests are sent", () => {
    const aliceWithSent: PublicUser = {
      ...alice,
      profile: { ...alice.profile, pendingPinRequestsSent: ["u2"] },
    };
    render(
      <ConnectionsPanel
        currentUser={aliceWithSent}
        allUsers={[aliceWithSent, bob]}
        onUserChange={jest.fn()}
        onAllUsersChange={jest.fn()}
      />
    );
    expect(screen.getByText(/awaiting approval/i)).toBeInTheDocument();
    expect(screen.getByText("Pending")).toBeInTheDocument();
  });
});

describe("ConnectionsPanel — interactions", () => {
  it("calls respondToPinRequest(accept) when Accept is clicked", async () => {
    const user = setup();
    (usersController.respondToPinRequest as jest.Mock).mockResolvedValue({ ok: true });
    // Return alice in the result so refreshUsers finds her and calls onUserChange
    const updatedAlice: PublicUser = { ...alice, profile: { ...alice.profile } };
    (usersController.fetchAll as jest.Mock).mockResolvedValue([updatedAlice]);

    const onUserChange = jest.fn();
    const aliceWithRequest: PublicUser = {
      ...alice,
      profile: { ...alice.profile, pendingPinRequestsReceived: ["u2"] },
    };
    render(
      <ConnectionsPanel
        currentUser={aliceWithRequest}
        allUsers={[aliceWithRequest, bob]}
        onUserChange={onUserChange}
        onAllUsersChange={jest.fn()}
      />
    );
    await user.click(screen.getByRole("button", { name: /accept request from bob/i }));
    expect(usersController.respondToPinRequest).toHaveBeenCalledWith("u2", true);
    // refreshUsers should find alice and call onUserChange
    expect(onUserChange).toHaveBeenCalledWith(updatedAlice);
  });

  it("calls respondToPinRequest(decline) when Decline is clicked", async () => {
    const user = setup();
    (usersController.respondToPinRequest as jest.Mock).mockResolvedValue({ ok: true });
    (usersController.fetchAll as jest.Mock).mockResolvedValue([]);

    const aliceWithRequest: PublicUser = {
      ...alice,
      profile: { ...alice.profile, pendingPinRequestsReceived: ["u2"] },
    };
    render(
      <ConnectionsPanel
        currentUser={aliceWithRequest}
        allUsers={[aliceWithRequest, bob]}
        onUserChange={jest.fn()}
        onAllUsersChange={jest.fn()}
      />
    );
    await user.click(screen.getByRole("button", { name: /decline request from bob/i }));
    expect(usersController.respondToPinRequest).toHaveBeenCalledWith("u2", false);
  });

  it("shows an error message when accept fails", async () => {
    const user = setup();
    (usersController.respondToPinRequest as jest.Mock).mockResolvedValue({
      ok: false,
      error: "Server error",
    });

    const aliceWithRequest: PublicUser = {
      ...alice,
      profile: { ...alice.profile, pendingPinRequestsReceived: ["u2"] },
    };
    render(
      <ConnectionsPanel
        currentUser={aliceWithRequest}
        allUsers={[aliceWithRequest, bob]}
        onUserChange={jest.fn()}
        onAllUsersChange={jest.fn()}
      />
    );
    await user.click(screen.getByRole("button", { name: /accept request from bob/i }));
    expect(screen.getByText("Server error")).toBeInTheDocument();
  });

  it("shows a default error message when accept fails with no error string", async () => {
    const user = setup();
    (usersController.respondToPinRequest as jest.Mock).mockResolvedValue({ ok: false });

    const aliceWithRequest: PublicUser = {
      ...alice,
      profile: { ...alice.profile, pendingPinRequestsReceived: ["u2"] },
    };
    render(
      <ConnectionsPanel
        currentUser={aliceWithRequest}
        allUsers={[aliceWithRequest, bob]}
        onUserChange={jest.fn()}
        onAllUsersChange={jest.fn()}
      />
    );
    await user.click(screen.getByRole("button", { name: /accept request from bob/i }));
    expect(screen.getByText("Failed to accept.")).toBeInTheDocument();
  });

  it("calls disconnect when Remove connection is clicked", async () => {
    const user = setup();
    (usersController.disconnect as jest.Mock).mockResolvedValue({ ok: true });
    (usersController.fetchAll as jest.Mock).mockResolvedValue([]);

    const aliceWithBob: PublicUser = {
      ...alice,
      profile: { ...alice.profile, pinnedUserIds: ["u2"] },
    };
    render(
      <ConnectionsPanel
        currentUser={aliceWithBob}
        allUsers={[aliceWithBob, bob]}
        onUserChange={jest.fn()}
        onAllUsersChange={jest.fn()}
      />
    );
    await user.click(screen.getByRole("button", { name: /remove/i }));
    expect(usersController.disconnect).toHaveBeenCalledWith("u2");
  });

  it("shows error when Remove fails", async () => {
    const user = setup();
    (usersController.disconnect as jest.Mock).mockResolvedValue({
      ok: false,
      error: "Failed to disconnect",
    });

    const aliceWithBob: PublicUser = {
      ...alice,
      profile: { ...alice.profile, pinnedUserIds: ["u2"] },
    };
    render(
      <ConnectionsPanel
        currentUser={aliceWithBob}
        allUsers={[aliceWithBob, bob]}
        onUserChange={jest.fn()}
        onAllUsersChange={jest.fn()}
      />
    );
    await user.click(screen.getByRole("button", { name: /remove/i }));
    expect(screen.getByText("Failed to disconnect")).toBeInTheDocument();
  });

  it("calls revokeConnection when Revoke is clicked", async () => {
    const user = setup();
    (usersController.revokeConnection as jest.Mock).mockResolvedValue({ ok: true });
    (usersController.fetchAll as jest.Mock).mockResolvedValue([]);

    render(
      <ConnectionsPanel
        currentUser={alice}
        allUsers={[alice, bob]} // bob follows alice
        onUserChange={jest.fn()}
        onAllUsersChange={jest.fn()}
      />
    );
    await user.click(screen.getByRole("button", { name: /revoke bob/i }));
    expect(usersController.revokeConnection).toHaveBeenCalledWith("u2");
  });

  it("shows error when revokeConnection fails", async () => {
    const user = setup();
    (usersController.revokeConnection as jest.Mock).mockResolvedValue({
      ok: false,
      error: "Revoke error",
    });

    render(
      <ConnectionsPanel
        currentUser={alice}
        allUsers={[alice, bob]}
        onUserChange={jest.fn()}
        onAllUsersChange={jest.fn()}
      />
    );
    await user.click(screen.getByRole("button", { name: /revoke bob/i }));
    expect(screen.getByText("Revoke error")).toBeInTheDocument();
  });

  it("shows default error when revokeConnection fails with no error string", async () => {
    const user = setup();
    (usersController.revokeConnection as jest.Mock).mockResolvedValue({ ok: false });

    render(
      <ConnectionsPanel
        currentUser={alice}
        allUsers={[alice, bob]}
        onUserChange={jest.fn()}
        onAllUsersChange={jest.fn()}
      />
    );
    await user.click(screen.getByRole("button", { name: /revoke bob/i }));
    expect(screen.getByText("Failed to revoke connection.")).toBeInTheDocument();
  });

  it("shows error message when decline fails", async () => {
    const user = setup();
    (usersController.respondToPinRequest as jest.Mock).mockResolvedValue({
      ok: false,
      error: "Decline error",
    });

    const aliceWithRequest: PublicUser = {
      ...alice,
      profile: { ...alice.profile, pendingPinRequestsReceived: ["u2"] },
    };
    render(
      <ConnectionsPanel
        currentUser={aliceWithRequest}
        allUsers={[aliceWithRequest, bob]}
        onUserChange={jest.fn()}
        onAllUsersChange={jest.fn()}
      />
    );
    await user.click(screen.getByRole("button", { name: /decline request from bob/i }));
    expect(screen.getByText("Decline error")).toBeInTheDocument();
  });

  it("shows default error message when decline fails with no error string", async () => {
    const user = setup();
    (usersController.respondToPinRequest as jest.Mock).mockResolvedValue({ ok: false });

    const aliceWithRequest: PublicUser = {
      ...alice,
      profile: { ...alice.profile, pendingPinRequestsReceived: ["u2"] },
    };
    render(
      <ConnectionsPanel
        currentUser={aliceWithRequest}
        allUsers={[aliceWithRequest, bob]}
        onUserChange={jest.fn()}
        onAllUsersChange={jest.fn()}
      />
    );
    await user.click(screen.getByRole("button", { name: /decline request from bob/i }));
    expect(screen.getByText("Failed to decline.")).toBeInTheDocument();
  });
});

describe("ConnectionsPanel — revoked connections archive", () => {
  it("shows the archive section when there are revoked connections", () => {
    const aliceWithRevoked: PublicUser = {
      ...alice,
      profile: {
        ...alice.profile,
        revokedConnections: [{ userId: "u2", date: "2025-12-01T00:00:00.000Z" }],
      },
    };
    render(
      <ConnectionsPanel
        currentUser={aliceWithRevoked}
        allUsers={[aliceWithRevoked, bob]}
        onUserChange={jest.fn()}
        onAllUsersChange={jest.fn()}
      />
    );
    expect(screen.getByText("Archive")).toBeInTheDocument();
    expect(screen.getByText(/Connection removed on/i)).toBeInTheDocument();
  });

  it("shows 'Unknown user' for revoked connections whose user is not found in allUsers", () => {
    const aliceWithRevoked: PublicUser = {
      ...alice,
      profile: {
        ...alice.profile,
        revokedConnections: [{ userId: "unknown-id", date: "2025-12-01T00:00:00.000Z" }],
      },
    };
    render(
      <ConnectionsPanel
        currentUser={aliceWithRevoked}
        allUsers={[aliceWithRevoked]}
        onUserChange={jest.fn()}
        onAllUsersChange={jest.fn()}
      />
    );
    expect(screen.getByText("Unknown user")).toBeInTheDocument();
  });

  it("shows 'Pending' when a reconnect request has already been sent", () => {
    const aliceWithRevoked: PublicUser = {
      ...alice,
      profile: {
        ...alice.profile,
        revokedConnections: [{ userId: "u2", date: "2025-12-01T00:00:00.000Z" }],
        pendingPinRequestsSent: ["u2"],
      },
    };
    render(
      <ConnectionsPanel
        currentUser={aliceWithRevoked}
        allUsers={[aliceWithRevoked, bob]}
        onUserChange={jest.fn()}
        onAllUsersChange={jest.fn()}
      />
    );
    // Multiple "Pending" may appear (one in Awaiting Approval, one in Archive)
    expect(screen.getAllByText("Pending").length).toBeGreaterThanOrEqual(1);
  });

  it("hides the 'Request to reconnect' button when the user is already an active connection", () => {
    const aliceWithRevoked: PublicUser = {
      ...alice,
      profile: {
        ...alice.profile,
        // Bob is in revokedConnections but also actively connected
        revokedConnections: [{ userId: "u2", date: "2025-12-01T00:00:00.000Z" }],
        pinnedUserIds: ["u2"],
      },
    };
    render(
      <ConnectionsPanel
        currentUser={aliceWithRevoked}
        allUsers={[aliceWithRevoked, bob]}
        onUserChange={jest.fn()}
        onAllUsersChange={jest.fn()}
      />
    );
    // Reconnect button must not appear because Bob is already connected
    expect(
      screen.queryByRole("button", { name: /request to reconnect with bob/i })
    ).toBeNull();
    // Archive section is still shown
    expect(screen.getByText("Archive")).toBeInTheDocument();
  });

  it("calls sendPinRequest when 'Request to reconnect' is clicked", async () => {
    const user = setup();
    (usersController.sendPinRequest as jest.Mock).mockResolvedValue({ ok: true });

    const aliceWithRevoked: PublicUser = {
      ...alice,
      profile: {
        ...alice.profile,
        revokedConnections: [{ userId: "u2", date: "2025-12-01T00:00:00.000Z" }],
      },
    };
    const onUserChange = jest.fn();
    render(
      <ConnectionsPanel
        currentUser={aliceWithRevoked}
        allUsers={[aliceWithRevoked, bob]}
        onUserChange={onUserChange}
        onAllUsersChange={jest.fn()}
      />
    );
    await user.click(screen.getByRole("button", { name: /request to reconnect with bob/i }));
    expect(usersController.sendPinRequest).toHaveBeenCalledWith("u2");
    expect(onUserChange).toHaveBeenCalled();
  });

  it("does not crash when refreshUsers returns a non-array (error case)", async () => {
    const user = setup();
    (usersController.respondToPinRequest as jest.Mock).mockResolvedValue({ ok: true });
    (usersController.fetchAll as jest.Mock).mockResolvedValue({ error: "Server error" });

    const aliceWithRequest: PublicUser = {
      ...alice,
      profile: { ...alice.profile, pendingPinRequestsReceived: ["u2"] },
    };
    const onUserChange = jest.fn();
    render(
      <ConnectionsPanel
        currentUser={aliceWithRequest}
        allUsers={[aliceWithRequest, bob]}
        onUserChange={onUserChange}
        onAllUsersChange={jest.fn()}
      />
    );
    // Accept triggers refreshUsers; if fetchAll returns non-array, it should just return early
    await user.click(screen.getByRole("button", { name: /accept request from bob/i }));
    // onUserChange should NOT have been called (no valid user from non-array result)
    expect(onUserChange).not.toHaveBeenCalled();
  });

  it("does not update user when current user is not found in refreshUsers result", async () => {
    const user = setup();
    (usersController.respondToPinRequest as jest.Mock).mockResolvedValue({ ok: true });
    // fetchAll returns an array but alice is not in it
    (usersController.fetchAll as jest.Mock).mockResolvedValue([bob]);

    const aliceWithRequest: PublicUser = {
      ...alice,
      profile: { ...alice.profile, pendingPinRequestsReceived: ["u2"] },
    };
    const onUserChange = jest.fn();
    render(
      <ConnectionsPanel
        currentUser={aliceWithRequest}
        allUsers={[aliceWithRequest, bob]}
        onUserChange={onUserChange}
        onAllUsersChange={jest.fn()}
      />
    );
    await user.click(screen.getByRole("button", { name: /accept request from bob/i }));
    // onUserChange should NOT have been called (alice not found in result)
    expect(onUserChange).not.toHaveBeenCalled();
  });

  it("shows error when sendPinRequest fails on reconnect", async () => {
    const user = setup();
    (usersController.sendPinRequest as jest.Mock).mockResolvedValue({
      ok: false,
      error: "Send error",
    });

    const aliceWithRevoked: PublicUser = {
      ...alice,
      profile: {
        ...alice.profile,
        revokedConnections: [{ userId: "u2", date: "2025-12-01T00:00:00.000Z" }],
      },
    };
    render(
      <ConnectionsPanel
        currentUser={aliceWithRevoked}
        allUsers={[aliceWithRevoked, bob]}
        onUserChange={jest.fn()}
        onAllUsersChange={jest.fn()}
      />
    );
    await user.click(screen.getByRole("button", { name: /request to reconnect with bob/i }));
    expect(screen.getByText("Send error")).toBeInTheDocument();
  });

  it("shows default error when sendPinRequest fails with no error string", async () => {
    const user = setup();
    (usersController.sendPinRequest as jest.Mock).mockResolvedValue({ ok: false });

    const aliceWithRevoked: PublicUser = {
      ...alice,
      profile: {
        ...alice.profile,
        revokedConnections: [{ userId: "u2", date: "2025-12-01T00:00:00.000Z" }],
      },
    };
    render(
      <ConnectionsPanel
        currentUser={aliceWithRevoked}
        allUsers={[aliceWithRevoked, bob]}
        onUserChange={jest.fn()}
        onAllUsersChange={jest.fn()}
      />
    );
    await user.click(screen.getByRole("button", { name: /request to reconnect with bob/i }));
    expect(screen.getByText("Failed to send request.")).toBeInTheDocument();
  });
});

describe("ConnectionsPanel — What are connections modal", () => {
  it("opens the info modal when the info button is clicked", async () => {
    const user = setup();
    render(
      <ConnectionsPanel
        currentUser={alice}
        allUsers={[alice]}
        onUserChange={jest.fn()}
        onAllUsersChange={jest.fn()}
      />
    );
    await user.click(screen.getByRole("button", { name: /what are connections/i }));
    expect(screen.getByText("What are Connections?")).toBeInTheDocument();
  });

  it("closes the info modal when the Close button is clicked", async () => {
    const user = setup();
    render(
      <ConnectionsPanel
        currentUser={alice}
        allUsers={[alice]}
        onUserChange={jest.fn()}
        onAllUsersChange={jest.fn()}
      />
    );
    await user.click(screen.getByRole("button", { name: /what are connections/i }));
    await user.click(screen.getByRole("button", { name: /close/i }));
    expect(screen.queryByText("What are Connections?")).toBeNull();
  });
});

describe("ConnectionsPanel — PinUserModal", () => {
  it("opens PinUserModal when Add Connection is clicked", async () => {
    const user = setup();
    render(
      <ConnectionsPanel
        currentUser={alice}
        allUsers={[alice, bob]}
        onUserChange={jest.fn()}
        onAllUsersChange={jest.fn()}
      />
    );
    await user.click(screen.getByRole("button", { name: /add connection/i }));
    // PinUserModal renders a search input and cancel button
    expect(screen.getByRole("button", { name: /close|cancel/i })).toBeInTheDocument();
  });

  it("closes PinUserModal when the modal cancel/close button is clicked", async () => {
    const user = setup();
    render(
      <ConnectionsPanel
        currentUser={alice}
        allUsers={[alice, bob]}
        onUserChange={jest.fn()}
        onAllUsersChange={jest.fn()}
      />
    );
    await user.click(screen.getByRole("button", { name: /add connection/i }));
    // Close the modal
    await user.click(screen.getByRole("button", { name: /close|cancel/i }));
    // Modal should be gone — the email input should no longer be in the DOM
    expect(screen.queryByRole("textbox")).toBeNull();
  });

  it("calls onUserChange and closes modal when a request is sent via PinUserModal", async () => {
    const user = setup();
    (usersController.sendPinRequest as jest.Mock).mockResolvedValue({ ok: true });

    const onUserChange = jest.fn();
    render(
      <ConnectionsPanel
        currentUser={alice}
        allUsers={[alice, bob]}
        onUserChange={onUserChange}
        onAllUsersChange={jest.fn()}
      />
    );
    // Open modal
    await user.click(screen.getByRole("button", { name: /add connection/i }));
    // Type bob's email in the email field
    const emailInput = screen.getByRole("textbox");
    await user.type(emailInput, "bob@example.com");
    // Submit the form
    await user.click(screen.getByRole("button", { name: /send request/i }));
    // onUserChange should have been called (handleRequestSent updates user)
    expect(onUserChange).toHaveBeenCalled();
  });
});
