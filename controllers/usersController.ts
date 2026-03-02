import type { PublicUser, UserProfile, YearAllowance } from "@/types";

export const usersController = {
  async fetchAll(): Promise<PublicUser[]> {
    const res = await fetch("/api/users", { cache: "no-store" });
    if (!res.ok) return [];
    return res.json();
  },

  /**
   * PATCH the current user's profile.
   * Returns the full updated user (which includes yearAllowances, entries, etc.)
   * so the caller can sync local state directly from the response, avoiding a
   * second fetchAll() round-trip.  Returns null on failure.
   */
  async updateProfile(profile: UserProfile): Promise<PublicUser | null> {
    const res = await fetch("/api/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ profile }),
    });
    if (!res.ok) return null;
    return res.json() as Promise<PublicUser>;
  },

  async addYearAllowance(yearAllowance: YearAllowance): Promise<YearAllowance | null> {
    const res = await fetch("/api/users/allowance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(yearAllowance),
    });
    if (!res.ok) return null;
    return res.json() as Promise<YearAllowance>;
  },

  async register(data: {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
  }): Promise<{ ok: boolean; error?: string }> {
    const res = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (res.ok) return { ok: true };
    const json = await res.json();
    return { ok: false, error: json.error ?? "Registration failed" };
  },
};
