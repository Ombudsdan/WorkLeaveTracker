import { usersController } from "@/controllers/usersController";
import type { PublicUser } from "@/types";

const mockUser: PublicUser = {
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

function mockFetch(body: unknown, ok = true, status = 200): void {
  global.fetch = jest.fn().mockResolvedValue({
    ok,
    status,
    json: jest.fn().mockResolvedValue(body),
  } as unknown as Response);
}

afterEach(() => {
  jest.restoreAllMocks();
});

describe("usersController.fetchAll", () => {
  it("calls GET /api/users and returns the parsed response", async () => {
    mockFetch([mockUser]);
    const result = await usersController.fetchAll();
    expect(fetch).toHaveBeenCalledWith("/api/users");
    expect(result).toEqual([mockUser]);
  });

  it("returns an empty array when the API returns an empty list", async () => {
    mockFetch([]);
    const result = await usersController.fetchAll();
    expect(result).toEqual([]);
  });
});

describe("usersController.updateProfile", () => {
  const profile = mockUser.profile;
  const allowance = mockUser.allowance;

  it("calls PATCH /api/users and returns true on success", async () => {
    mockFetch(null, true);
    const result = await usersController.updateProfile(profile, allowance);
    expect(fetch).toHaveBeenCalledWith(
      "/api/users",
      expect.objectContaining({
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profile, allowance }),
      })
    );
    expect(result).toBe(true);
  });

  it("returns false when the API responds with a non-ok status", async () => {
    mockFetch(null, false, 500);
    const result = await usersController.updateProfile(profile, allowance);
    expect(result).toBe(false);
  });
});
