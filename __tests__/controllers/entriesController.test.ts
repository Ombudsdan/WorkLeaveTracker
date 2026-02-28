import { entriesController } from "@/controllers/entriesController";
import { LeaveStatus, LeaveType } from "@/types";
import type { LeaveEntry } from "@/types";

const entry: LeaveEntry = {
  id: "e1",
  startDate: "2026-03-09",
  endDate: "2026-03-13",
  status: LeaveStatus.Planned,
  type: LeaveType.Holiday,
  notes: "Beach trip",
};

function mockFetch(ok = true, status = ok ? 200 : 500): void {
  global.fetch = jest.fn().mockResolvedValue({
    ok,
    status,
    json: jest.fn().mockResolvedValue(null),
  } as unknown as Response);
}

afterEach(() => {
  jest.restoreAllMocks();
});

describe("entriesController.create", () => {
  it("calls POST /api/entries with the entry body and returns true on success", async () => {
    mockFetch(true);
    const { id: _id, ...body } = entry; // eslint-disable-line @typescript-eslint/no-unused-vars
    const result = await entriesController.create(body);
    expect(fetch).toHaveBeenCalledWith(
      "/api/entries",
      expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
    );
    expect(result).toBe(true);
  });

  it("returns false when the API responds with a non-ok status", async () => {
    mockFetch(false);
    const { id: _id, ...body } = entry; // eslint-disable-line @typescript-eslint/no-unused-vars
    const result = await entriesController.create(body);
    expect(result).toBe(false);
  });
});

describe("entriesController.update", () => {
  it("calls PATCH /api/entries/:id with the full entry and returns true on success", async () => {
    mockFetch(true);
    const result = await entriesController.update(entry);
    expect(fetch).toHaveBeenCalledWith(
      `/api/entries/${entry.id}`,
      expect.objectContaining({
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(entry),
      })
    );
    expect(result).toBe(true);
  });

  it("returns false when the API responds with a non-ok status", async () => {
    mockFetch(false);
    const result = await entriesController.update(entry);
    expect(result).toBe(false);
  });
});

describe("entriesController.remove", () => {
  it("calls DELETE /api/entries/:id and returns true on success", async () => {
    mockFetch(true);
    const result = await entriesController.remove(entry.id);
    expect(fetch).toHaveBeenCalledWith(`/api/entries/${entry.id}`, { method: "DELETE" });
    expect(result).toBe(true);
  });

  it("returns false when the API responds with a non-ok status", async () => {
    mockFetch(false);
    const result = await entriesController.remove(entry.id);
    expect(result).toBe(false);
  });
});
