import type { BankHolidayEntry, UkCountry } from "@/types";

export const holidaysController = {
  async fetchBankHolidays(country?: UkCountry): Promise<BankHolidayEntry[]> {
    try {
      const url = country ? `/api/holidays?country=${encodeURIComponent(country)}` : "/api/holidays";
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) return [];
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    } catch {
      return [];
    }
  },
};
