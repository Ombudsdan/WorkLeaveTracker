import type { LeaveEntry } from "@/types";

export const entriesController = {
  async create(entry: Omit<LeaveEntry, "id">): Promise<boolean> {
    const res = await fetch("/api/entries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(entry),
    });
    return res.ok;
  },

  async update(entry: LeaveEntry): Promise<boolean> {
    const res = await fetch(`/api/entries/${entry.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(entry),
    });
    return res.ok;
  },

  async remove(id: string): Promise<boolean> {
    const res = await fetch(`/api/entries/${id}`, { method: "DELETE" });
    return res.ok;
  },
};
