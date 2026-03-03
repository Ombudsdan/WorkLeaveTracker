import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { signOut as mockSignOutFn } from "next-auth/react";

jest.mock("next-auth/react", () => ({
  signOut: jest.fn(),
}));

import SessionExpiredScreen from "@/components/SessionExpiredScreen";

afterEach(() => {
  jest.clearAllMocks();
});

describe("SessionExpiredScreen — rendering", () => {
  it("renders the Session Expired heading", () => {
    render(<SessionExpiredScreen />);
    expect(screen.getByRole("heading", { name: /session expired/i })).toBeInTheDocument();
  });

  it("renders the expiry explanation message", () => {
    render(<SessionExpiredScreen />);
    expect(screen.getByText(/session has timed out/i)).toBeInTheDocument();
  });

  it("renders the Sign In button", () => {
    render(<SessionExpiredScreen />);
    expect(screen.getByRole("button", { name: /sign in/i })).toBeInTheDocument();
  });

  it("renders the lock emoji", () => {
    render(<SessionExpiredScreen />);
    expect(screen.getByText("🔒")).toBeInTheDocument();
  });
});

describe("SessionExpiredScreen — sign out behaviour", () => {
  it("calls signOut with callbackUrl='/login' when the Sign In button is clicked", async () => {
    render(<SessionExpiredScreen />);
    await userEvent.click(screen.getByRole("button", { name: /sign in/i }));
    expect(mockSignOutFn).toHaveBeenCalledWith({ callbackUrl: "/login" });
  });
});
