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
    expect(fetch).toHaveBeenCalledWith("/api/holidays", { cache: "no-store" });
    expect(result).toEqual(dates);
  });

  it("returns an empty array when the API returns no holidays", async () => {
    mockFetch([]);
    const result = await holidaysController.fetchBankHolidays();
    expect(result).toEqual([]);
  });

  it("returns an empty array when the API responds with a non-OK status", async () => {
    mockFetch({ error: "Server Error" }, false);
    const result = await holidaysController.fetchBankHolidays();
    expect(result).toEqual([]);
  });

  it("returns an empty array when fetch throws (network error)", async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error("Network error"));
    const result = await holidaysController.fetchBankHolidays();
    expect(result).toEqual([]);
  });

  it("returns an empty array when the response body is not an array", async () => {
    mockFetch({ not: "an array" });
    const result = await holidaysController.fetchBankHolidays();
    expect(result).toEqual([]);
  });

  it("calls GET /api/holidays?country=... when a country is provided", async () => {
    mockFetch([]);
    const result = await holidaysController.fetchBankHolidays("england-and-wales");
    expect(fetch).toHaveBeenCalledWith(
      "/api/holidays?country=england-and-wales",
      { cache: "no-store" }
    );
    expect(result).toEqual([]);
  });
});
