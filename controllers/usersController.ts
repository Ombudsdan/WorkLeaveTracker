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

  /**
   * Add or update a year's allowance.
   * Returns the saved allowance, or an object with a `conflict` field when a
   * company-change confirmation is required, or null on network error.
   */
  async addYearAllowance(
    yearAllowance: YearAllowance & { forceCompanyChange?: boolean }
  ): Promise<YearAllowance | { conflict: true; existingCompany: string; message: string } | null> {
    const res = await fetch("/api/users/allowance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(yearAllowance),
    });
    if (res.status === 409) {
      const json = (await res.json()) as {
        error: string;
        existingCompany?: string;
        message?: string;
      };
      if (json.error === "company_change_required") {
        return {
          conflict: true,
          existingCompany: json.existingCompany ?? "",
          message: json.message ?? "",
        };
      }
    }
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

  /** Send a connection request to another user. */
  async sendPinRequest(targetUserId: string): Promise<{ ok: boolean; error?: string }> {
    const res = await fetch("/api/users/pin-request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targetUserId }),
    });
    if (res.ok) return { ok: true };
    const json = await res.json();
    return { ok: false, error: json.error ?? "Failed to send request" };
  },

  /** Accept or decline an incoming connection request. */
  async respondToPinRequest(
    requesterId: string,
    accept: boolean
  ): Promise<{ ok: boolean; error?: string }> {
    const res = await fetch("/api/users/pin-request/respond", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ requesterId, accept }),
    });
    if (res.ok) return { ok: true };
    const json = await res.json();
    return { ok: false, error: json.error ?? "Failed to respond" };
  },

  /** Fetch all unique company names known in the system. */
  async fetchCompanies(): Promise<string[]> {
    const res = await fetch("/api/companies", { cache: "no-store" });
    if (!res.ok) return [];
    return res.json();
  },
};
