import type { PublicUser, UserProfile, UserAllowance } from "@/types";

export const usersController = {
  async fetchAll(): Promise<PublicUser[]> {
    const res = await fetch("/api/users");
    return res.json();
  },

  async updateProfile(profile: UserProfile, allowance: UserAllowance): Promise<boolean> {
    const res = await fetch("/api/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ profile, allowance }),
    });
    return res.ok;
  },
};
