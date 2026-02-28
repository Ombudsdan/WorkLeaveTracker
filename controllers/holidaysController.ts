export const holidaysController = {
  async fetchBankHolidays(): Promise<string[]> {
    const res = await fetch("/api/holidays");
    return res.json();
  },
};
