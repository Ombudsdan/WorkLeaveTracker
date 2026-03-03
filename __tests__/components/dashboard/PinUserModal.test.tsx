import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import PinUserModal from "@/components/dashboard/PinUserModal";
import type { PublicUser } from "@/types";
import { usersController } from "@/controllers/usersController";

// Mock the usersController so sendPinRequest doesn't make real HTTP calls
jest.mock("@/controllers/usersController", () => ({
  usersController: {
    sendPinRequest: jest.fn(),
  },
}));

const mockSendPinRequest = usersController.sendPinRequest as jest.Mock;

const alice: PublicUser = {
  id: "u1",
  profile: {
    firstName: "Alice",
    lastName: "Smith",
    email: "alice@example.com",
    nonWorkingDays: [0, 6],
    pinnedUserIds: [],
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

beforeEach(() => {
  mockSendPinRequest.mockResolvedValue({ ok: true });
});

afterEach(() => {
  jest.clearAllMocks();
});

describe("PinUserModal — rendering", () => {
  it("renders the heading", () => {
    render(<PinUserModal otherUsers={[alice, bob]} pinnedUserIds={[]} onClose={jest.fn()} />);
    expect(screen.getByRole("heading", { name: "Send Connection Request" })).toBeInTheDocument();
  });

  it("renders the email input", () => {
    render(<PinUserModal otherUsers={[alice, bob]} pinnedUserIds={[]} onClose={jest.fn()} />);
    expect(screen.getByLabelText("Email address")).toBeInTheDocument();
  });

  it("renders the Send Request and Close buttons", () => {
    render(<PinUserModal otherUsers={[alice, bob]} pinnedUserIds={[]} onClose={jest.fn()} />);
    expect(screen.getByRole("button", { name: /send request/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /close/i })).toBeInTheDocument();
  });
});

describe("PinUserModal — search", () => {
  it("shows error when searching with an empty email", async () => {
    render(<PinUserModal otherUsers={[alice, bob]} pinnedUserIds={[]} onClose={jest.fn()} />);
    await userEvent.click(screen.getByRole("button", { name: /send request/i }));
    expect(screen.getByText("Please enter an email address.")).toBeInTheDocument();
  });

  it("shows error when an invalid email format is entered", async () => {
    render(<PinUserModal otherUsers={[alice, bob]} pinnedUserIds={[]} onClose={jest.fn()} />);
    await userEvent.type(screen.getByLabelText("Email address"), "notanemail");
    await userEvent.click(screen.getByRole("button", { name: /send request/i }));
    expect(screen.getByText(/valid email address/i)).toBeInTheDocument();
  });

  it("shows error when no user is found with the entered email", async () => {
    render(<PinUserModal otherUsers={[alice, bob]} pinnedUserIds={[]} onClose={jest.fn()} />);
    await userEvent.type(screen.getByLabelText("Email address"), "nobody@example.com");
    await userEvent.click(screen.getByRole("button", { name: /send request/i }));
    expect(screen.getByText("No user found with that email address.")).toBeInTheDocument();
  });

  it("calls sendPinRequest with the matched user's id", async () => {
    render(<PinUserModal otherUsers={[alice, bob]} pinnedUserIds={[]} onClose={jest.fn()} />);
    await userEvent.type(screen.getByLabelText("Email address"), "alice@example.com");
    await userEvent.click(screen.getByRole("button", { name: /send request/i }));
    await waitFor(() => expect(mockSendPinRequest).toHaveBeenCalledWith("u1"));
  });

  it("calls onRequestSent after a successful request", async () => {
    const onRequestSent = jest.fn();
    render(
      <PinUserModal
        otherUsers={[alice, bob]}
        pinnedUserIds={[]}
        onClose={jest.fn()}
        onRequestSent={onRequestSent}
      />
    );
    await userEvent.type(screen.getByLabelText("Email address"), "alice@example.com");
    await userEvent.click(screen.getByRole("button", { name: /send request/i }));
    await waitFor(() => expect(onRequestSent).toHaveBeenCalledWith("u1"));
  });

  it("shows success message after request is sent", async () => {
    render(<PinUserModal otherUsers={[alice, bob]} pinnedUserIds={[]} onClose={jest.fn()} />);
    await userEvent.type(screen.getByLabelText("Email address"), "alice@example.com");
    await userEvent.click(screen.getByRole("button", { name: /send request/i }));
    await waitFor(() => expect(screen.getByText(/connection request sent/i)).toBeInTheDocument());
  });

  it("shows error when the user is already connected (pinnedUserIds)", async () => {
    render(<PinUserModal otherUsers={[alice, bob]} pinnedUserIds={["u1"]} onClose={jest.fn()} />);
    await userEvent.type(screen.getByLabelText("Email address"), "alice@example.com");
    await userEvent.click(screen.getByRole("button", { name: /send request/i }));
    expect(screen.getByText(/already connected/i)).toBeInTheDocument();
  });

  it("shows error when a request has already been sent", async () => {
    render(
      <PinUserModal
        otherUsers={[alice, bob]}
        pinnedUserIds={[]}
        pendingRequestsSent={["u1"]}
        onClose={jest.fn()}
      />
    );
    await userEvent.type(screen.getByLabelText("Email address"), "alice@example.com");
    await userEvent.click(screen.getByRole("button", { name: /send request/i }));
    expect(screen.getByText(/request has already been sent/i)).toBeInTheDocument();
  });

  it("shows error when the connection limit is reached", async () => {
    render(
      <PinUserModal
        otherUsers={[alice, bob]}
        pinnedUserIds={["u3", "u4", "u5"]}
        onClose={jest.fn()}
      />
    );
    await userEvent.type(screen.getByLabelText("Email address"), "alice@example.com");
    await userEvent.click(screen.getByRole("button", { name: /send request/i }));
    expect(screen.getByText(/maximum of 3/i)).toBeInTheDocument();
  });

  it("is case-insensitive when matching email", async () => {
    render(<PinUserModal otherUsers={[alice, bob]} pinnedUserIds={[]} onClose={jest.fn()} />);
    await userEvent.type(screen.getByLabelText("Email address"), "ALICE@EXAMPLE.COM");
    await userEvent.click(screen.getByRole("button", { name: /send request/i }));
    await waitFor(() => expect(mockSendPinRequest).toHaveBeenCalledWith("u1"));
  });

  it("shows an error message when sendPinRequest returns an error", async () => {
    mockSendPinRequest.mockResolvedValue({ ok: false, error: "Request already sent" });
    render(<PinUserModal otherUsers={[alice, bob]} pinnedUserIds={[]} onClose={jest.fn()} />);
    await userEvent.type(screen.getByLabelText("Email address"), "alice@example.com");
    await userEvent.click(screen.getByRole("button", { name: /send request/i }));
    await waitFor(() =>
      expect(screen.getByText(/request has already been sent/i)).toBeInTheDocument()
    );
  });

  it("shows 'already connected' when sendPinRequest returns 'Already connected'", async () => {
    mockSendPinRequest.mockResolvedValue({ ok: false, error: "Already connected" });
    render(<PinUserModal otherUsers={[alice, bob]} pinnedUserIds={[]} onClose={jest.fn()} />);
    await userEvent.type(screen.getByLabelText("Email address"), "alice@example.com");
    await userEvent.click(screen.getByRole("button", { name: /send request/i }));
    await waitFor(() =>
      expect(screen.getByText(/already connected/i)).toBeInTheDocument()
    );
  });

  it("shows a generic error when sendPinRequest returns an unrecognised error", async () => {
    mockSendPinRequest.mockResolvedValue({ ok: false, error: "Server error" });
    render(<PinUserModal otherUsers={[alice, bob]} pinnedUserIds={[]} onClose={jest.fn()} />);
    await userEvent.type(screen.getByLabelText("Email address"), "alice@example.com");
    await userEvent.click(screen.getByRole("button", { name: /send request/i }));
    await waitFor(() =>
      expect(screen.getByText("Server error")).toBeInTheDocument()
    );
  });

  it("shows fallback error text when sendPinRequest returns ok:false with no error field", async () => {
    mockSendPinRequest.mockResolvedValue({ ok: false });
    render(<PinUserModal otherUsers={[alice, bob]} pinnedUserIds={[]} onClose={jest.fn()} />);
    await userEvent.type(screen.getByLabelText("Email address"), "alice@example.com");
    await userEvent.click(screen.getByRole("button", { name: /send request/i }));
    await waitFor(() =>
      expect(screen.getByText(/failed to send request/i)).toBeInTheDocument()
    );
  });
});

describe("PinUserModal — close", () => {
  it("calls onClose when the Close button is clicked", async () => {
    const onClose = jest.fn();
    render(<PinUserModal otherUsers={[alice, bob]} pinnedUserIds={[]} onClose={onClose} />);
    await userEvent.click(screen.getByRole("button", { name: /close/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
