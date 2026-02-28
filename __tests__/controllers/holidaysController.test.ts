import { holidaysController } from "@/controllers/holidaysController";

function mockFetch(body: unknown, ok = true): void {
  global.fetch = jest.fn().mockResolvedValue({
    ok,
    json: jest.fn().mockResolvedValue(body),
  } as unknown as Response);
}

afterEach(() => {
  jest.restoreAllMocks();
});

describe("holidaysController.fetchBankHolidays", () => {
  it("calls GET /api/holidays and returns the parsed date strings", async () => {
    const dates = ["2026-01-01", "2026-04-03"];
    mockFetch(dates);
    const result = await holidaysController.fetchBankHolidays();
    expect(fetch).toHaveBeenCalledWith("/api/holidays");
    expect(result).toEqual(dates);
  });

  it("returns an empty array when the API returns no holidays", async () => {
    mockFetch([]);
    const result = await holidaysController.fetchBankHolidays();
    expect(result).toEqual([]);
  });
});
