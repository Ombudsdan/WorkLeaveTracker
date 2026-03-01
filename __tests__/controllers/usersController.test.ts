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
  yearAllowances: [{ year: 2026, core: 25, bought: 0, carried: 0 }],
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

  it("calls PATCH /api/users and returns true on success", async () => {
    mockFetch(null, true);
    const result = await usersController.updateProfile(profile);
    expect(fetch).toHaveBeenCalledWith(
      "/api/users",
      expect.objectContaining({
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profile }),
      })
    );
    expect(result).toBe(true);
  });

  it("returns false when the API responds with a non-ok status", async () => {
    mockFetch(null, false, 500);
    const result = await usersController.updateProfile(profile);
    expect(result).toBe(false);
  });
});

describe("usersController.addYearAllowance", () => {
  const yearAllowance = { year: 2026, core: 25, bought: 0, carried: 0 };

  it("calls POST /api/users/allowance and returns true on success", async () => {
    mockFetch(yearAllowance, true);
    const result = await usersController.addYearAllowance(yearAllowance);
    expect(fetch).toHaveBeenCalledWith(
      "/api/users/allowance",
      expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(yearAllowance),
      })
    );
    expect(result).toBe(true);
  });

  it("returns false when the API responds with a non-ok status", async () => {
    mockFetch(null, false, 500);
    const result = await usersController.addYearAllowance(yearAllowance);
    expect(result).toBe(false);
  });
});

describe("usersController.register", () => {
  const data = {
    firstName: "Alice",
    lastName: "Smith",
    email: "alice@example.com",
    password: "password123",
    company: "Acme",
  };

  it("calls POST /api/users and returns ok:true on success", async () => {
    mockFetch(mockUser, true, 201);
    const result = await usersController.register(data);
    expect(fetch).toHaveBeenCalledWith(
      "/api/users",
      expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
    );
    expect(result.ok).toBe(true);
  });

  it("returns ok:false with error message on conflict", async () => {
    mockFetch({ error: "Email already registered" }, false, 409);
    const result = await usersController.register(data);
    expect(result.ok).toBe(false);
    expect(result.error).toBe("Email already registered");
  });

  it("returns fallback error message when API returns no error field", async () => {
    mockFetch({}, false, 500);
    const result = await usersController.register(data);
    expect(result.ok).toBe(false);
    expect(result.error).toBe("Registration failed");
  });
});
