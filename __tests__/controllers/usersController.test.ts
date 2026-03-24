import { usersController } from "@/controllers/usersController";
import type { PublicUser } from "@/types";

const mockUser: PublicUser = {
  id: "u1",
  profile: {
    firstName: "Alice",
    lastName: "Smith",
    email: "alice@example.com",
    nonWorkingDays: [0, 6],
  },
  yearAllowances: [
    { year: 2026, company: "Acme", holidayStartMonth: 1, core: 25, bought: 0, carried: 0 },
  ],
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
    expect(fetch).toHaveBeenCalledWith("/api/users", { cache: "no-store" });
    expect(result).toEqual([mockUser]);
  });

  it("returns an empty array when the API returns an empty list", async () => {
    mockFetch([]);
    const result = await usersController.fetchAll();
    expect(result).toEqual([]);
  });

  it("returns an empty array when the API responds with a non-ok status", async () => {
    mockFetch(null, false, 500);
    const result = await usersController.fetchAll();
    expect(result).toEqual([]);
  });
});

describe("usersController.updateProfile", () => {
  const profile = mockUser.profile;

  it("calls PATCH /api/users and returns the updated user on success", async () => {
    mockFetch(mockUser, true);
    const result = await usersController.updateProfile(profile);
    expect(fetch).toHaveBeenCalledWith(
      "/api/users",
      expect.objectContaining({
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profile }),
      })
    );
    expect(result).toEqual(mockUser);
  });

  it("returns null when the API responds with a non-ok status", async () => {
    mockFetch(null, false, 500);
    const result = await usersController.updateProfile(profile);
    expect(result).toBeNull();
  });
});

describe("usersController.addYearAllowance", () => {
  const yearAllowance = {
    year: 2026,
    company: "Acme",
    holidayStartMonth: 1,
    core: 25,
    bought: 0,
    carried: 0,
  };

  it("calls POST /api/users/allowance and returns the saved allowance on success", async () => {
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
    expect(result).toEqual(yearAllowance);
  });

  it("returns null when the API responds with a non-ok status", async () => {
    mockFetch(null, false, 500);
    const result = await usersController.addYearAllowance(yearAllowance);
    expect(result).toBeNull();
  });

  it("returns a conflict object when the API responds with 409 and company_change_required", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 409,
      json: jest.fn().mockResolvedValue({
        error: "company_change_required",
        existingCompany: "OldCo",
        message: "Company change detected",
      }),
    } as unknown as Response);
    const result = await usersController.addYearAllowance(yearAllowance);
    expect(result).toEqual({
      conflict: true,
      existingCompany: "OldCo",
      message: "Company change detected",
    });
  });

  it("uses empty string fallbacks for missing existingCompany/message in the 409 conflict body", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 409,
      json: jest.fn().mockResolvedValue({ error: "company_change_required" }),
    } as unknown as Response);
    const result = await usersController.addYearAllowance(yearAllowance);
    expect(result).toEqual({ conflict: true, existingCompany: "", message: "" });
  });

  it("returns null when the API responds with 409 but a non-conflict error", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 409,
      json: jest.fn().mockResolvedValue({ error: "other_error" }),
    } as unknown as Response);
    const result = await usersController.addYearAllowance(yearAllowance);
    expect(result).toBeNull();
  });
});

describe("usersController.register", () => {
  const data = {
    firstName: "Alice",
    lastName: "Smith",
    email: "alice@example.com",
    password: "password123",
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

describe("usersController.sendPinRequest", () => {
  it("calls POST /api/users/pin-request and returns ok:true on success", async () => {
    mockFetch({}, true);
    const result = await usersController.sendPinRequest("u2");
    expect(fetch).toHaveBeenCalledWith(
      "/api/users/pin-request",
      expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetUserId: "u2" }),
      })
    );
    expect(result).toEqual({ ok: true });
  });

  it("returns ok:false with error message when the API rejects", async () => {
    mockFetch({ error: "Request already sent" }, false, 409);
    const result = await usersController.sendPinRequest("u2");
    expect(result).toEqual({ ok: false, error: "Request already sent" });
  });

  it("returns fallback error when API returns no error field", async () => {
    mockFetch({}, false, 500);
    const result = await usersController.sendPinRequest("u2");
    expect(result).toEqual({ ok: false, error: "Failed to send request" });
  });
});

describe("usersController.respondToPinRequest", () => {
  it("calls POST /api/users/pin-request/respond and returns ok:true on success", async () => {
    mockFetch({}, true);
    const result = await usersController.respondToPinRequest("u2", true);
    expect(fetch).toHaveBeenCalledWith(
      "/api/users/pin-request/respond",
      expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requesterId: "u2", accept: true }),
      })
    );
    expect(result).toEqual({ ok: true });
  });

  it("calls POST with accept=false when declining", async () => {
    mockFetch({}, true);
    await usersController.respondToPinRequest("u2", false);
    expect(fetch).toHaveBeenCalledWith(
      "/api/users/pin-request/respond",
      expect.objectContaining({ body: JSON.stringify({ requesterId: "u2", accept: false }) })
    );
  });

  it("returns ok:false with error message when the API rejects", async () => {
    mockFetch({ error: "Not found" }, false, 404);
    const result = await usersController.respondToPinRequest("u2", true);
    expect(result).toEqual({ ok: false, error: "Not found" });
  });

  it("returns fallback error when API returns no error field", async () => {
    mockFetch({}, false, 500);
    const result = await usersController.respondToPinRequest("u2", true);
    expect(result).toEqual({ ok: false, error: "Failed to respond" });
  });
});

describe("usersController.fetchCompanies", () => {
  it("calls GET /api/companies and returns the parsed list", async () => {
    mockFetch(["Acme Ltd", "Globex"]);
    const result = await usersController.fetchCompanies();
    expect(fetch).toHaveBeenCalledWith("/api/companies", { cache: "no-store" });
    expect(result).toEqual(["Acme Ltd", "Globex"]);
  });

  it("returns an empty array when the API responds with a non-ok status", async () => {
    mockFetch(null, false, 500);
    const result = await usersController.fetchCompanies();
    expect(result).toEqual([]);
  });
});

describe("usersController.revokeConnection", () => {
  it("calls POST /api/users/revoke-connection and returns ok:true on success", async () => {
    mockFetch({}, true);
    const result = await usersController.revokeConnection("u2");
    expect(fetch).toHaveBeenCalledWith(
      "/api/users/revoke-connection",
      expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ followerId: "u2" }),
      })
    );
    expect(result).toEqual({ ok: true });
  });

  it("returns ok:false with error message when the API rejects", async () => {
    mockFetch({ error: "Not a follower" }, false, 409);
    const result = await usersController.revokeConnection("u2");
    expect(result).toEqual({ ok: false, error: "Not a follower" });
  });

  it("returns fallback error when API returns no error field", async () => {
    mockFetch({}, false, 500);
    const result = await usersController.revokeConnection("u2");
    expect(result).toEqual({ ok: false, error: "Failed to revoke connection" });
  });
});

describe("usersController.disconnect", () => {
  it("calls POST /api/users/disconnect and returns ok:true on success", async () => {
    mockFetch({}, true);
    const result = await usersController.disconnect("u2");
    expect(fetch).toHaveBeenCalledWith(
      "/api/users/disconnect",
      expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetId: "u2" }),
      })
    );
    expect(result).toEqual({ ok: true });
  });

  it("returns ok:false with error message when the API rejects", async () => {
    mockFetch({ error: "Target user not found" }, false, 404);
    const result = await usersController.disconnect("u2");
    expect(result).toEqual({ ok: false, error: "Target user not found" });
  });

  it("returns fallback error when API returns no error field", async () => {
    mockFetch({}, false, 500);
    const result = await usersController.disconnect("u2");
    expect(result).toEqual({ ok: false, error: "Failed to disconnect" });
  });
});
