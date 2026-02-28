export const holidaysController = {
  async fetchBankHolidays(): Promise<string[]> {
    try {
      const res = await fetch("/api/holidays", { cache: "no-store" });
      if (!res.ok) return [];
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    } catch {
      return [];
    }
  },
};
