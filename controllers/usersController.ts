import type { PublicUser, UserProfile, YearAllowance } from "@/types";

export const usersController = {
  async fetchAll(): Promise<PublicUser[]> {
    const res = await fetch("/api/users");
    return res.json();
  },

  async updateProfile(profile: UserProfile): Promise<boolean> {
    const res = await fetch("/api/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ profile }),
    });
    return res.ok;
  },

  async addYearAllowance(yearAllowance: YearAllowance): Promise<boolean> {
    const res = await fetch("/api/users/allowance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(yearAllowance),
    });
    return res.ok;
  },

  async register(data: {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    company: string;
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
