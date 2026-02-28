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

function mockFetch(body: unknown, ok = true, status = ok ? 200 : 500): void {
  global.fetch = jest.fn().mockResolvedValue({
    ok,
    status,
    json: jest.fn().mockResolvedValue(body),
  } as unknown as Response);
}

afterEach(() => {
  jest.restoreAllMocks();
});

describe("entriesController.create", () => {
  it("calls POST /api/entries with the entry body and returns the created entry on success", async () => {
    mockFetch(entry);
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
    expect(result).toEqual(entry);
  });

  it("returns null when the API responds with a non-ok status", async () => {
    mockFetch(null, false);
    const { id: _id, ...body } = entry; // eslint-disable-line @typescript-eslint/no-unused-vars
    const result = await entriesController.create(body);
    expect(result).toBeNull();
  });
});

describe("entriesController.update", () => {
  it("calls PATCH /api/entries/:id with the full entry and returns the updated entry on success", async () => {
    mockFetch(entry);
    const result = await entriesController.update(entry);
    expect(fetch).toHaveBeenCalledWith(
      `/api/entries/${entry.id}`,
      expect.objectContaining({
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(entry),
      })
    );
    expect(result).toEqual(entry);
  });

  it("returns null when the API responds with a non-ok status", async () => {
    mockFetch(null, false);
    const result = await entriesController.update(entry);
    expect(result).toBeNull();
  });
});

describe("entriesController.remove", () => {
  it("calls DELETE /api/entries/:id and returns true on success", async () => {
    mockFetch(null, true);
    const result = await entriesController.remove(entry.id);
    expect(fetch).toHaveBeenCalledWith(`/api/entries/${entry.id}`, { method: "DELETE" });
    expect(result).toBe(true);
  });

  it("returns false when the API responds with a non-ok status", async () => {
    mockFetch(null, false);
    const result = await entriesController.remove(entry.id);
    expect(result).toBe(false);
  });
});
