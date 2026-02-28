import {
  STATUS_COLORS,
  STATUS_DOT,
  CALENDAR_COLORS,
  CALENDAR_CELL_BANK_HOLIDAY,
  CALENDAR_CELL_NON_WORKING,
  CALENDAR_CELL_DEFAULT,
} from "@/variables/colours";
import { LeaveStatus } from "@/types";

const ALL_STATUSES: LeaveStatus[] = [
  LeaveStatus.Planned,
  LeaveStatus.Requested,
  LeaveStatus.Approved,
];

describe("STATUS_COLORS", () => {
  it("defines a non-empty class string for every LeaveStatus", () => {
    ALL_STATUSES.forEach((status) => {
      expect(STATUS_COLORS[status]).toBeTruthy();
      expect(typeof STATUS_COLORS[status]).toBe("string");
    });
  });

  it("contains yellow classes for Planned", () => {
    expect(STATUS_COLORS[LeaveStatus.Planned]).toContain("yellow");
  });

  it("contains blue classes for Requested", () => {
    expect(STATUS_COLORS[LeaveStatus.Requested]).toContain("blue");
  });

  it("contains green classes for Approved", () => {
    expect(STATUS_COLORS[LeaveStatus.Approved]).toContain("green");
  });
});

describe("STATUS_DOT", () => {
  it("defines a non-empty class string for every LeaveStatus", () => {
    ALL_STATUSES.forEach((status) => {
      expect(STATUS_DOT[status]).toBeTruthy();
    });
  });

  it("contains yellow for Planned dot", () => {
    expect(STATUS_DOT[LeaveStatus.Planned]).toContain("yellow");
  });

  it("contains blue for Requested dot", () => {
    expect(STATUS_DOT[LeaveStatus.Requested]).toContain("blue");
  });

  it("contains green for Approved dot", () => {
    expect(STATUS_DOT[LeaveStatus.Approved]).toContain("green");
  });
});

describe("CALENDAR_COLORS", () => {
  it("defines a non-empty class string for every LeaveStatus", () => {
    ALL_STATUSES.forEach((status) => {
      expect(CALENDAR_COLORS[status]).toBeTruthy();
    });
  });

  it("contains yellow for Planned calendar cell", () => {
    expect(CALENDAR_COLORS[LeaveStatus.Planned]).toContain("yellow");
  });

  it("contains blue for Requested calendar cell", () => {
    expect(CALENDAR_COLORS[LeaveStatus.Requested]).toContain("blue");
  });

  it("contains green for Approved calendar cell", () => {
    expect(CALENDAR_COLORS[LeaveStatus.Approved]).toContain("green");
  });
});

describe("CALENDAR_CELL_BANK_HOLIDAY", () => {
  it("is a non-empty string", () => {
    expect(typeof CALENDAR_CELL_BANK_HOLIDAY).toBe("string");
    expect(CALENDAR_CELL_BANK_HOLIDAY.length).toBeGreaterThan(0);
  });

  it("contains purple styling (distinguishes bank holidays from leave)", () => {
    expect(CALENDAR_CELL_BANK_HOLIDAY).toContain("purple");
  });
});

describe("CALENDAR_CELL_NON_WORKING", () => {
  it("is a non-empty string", () => {
    expect(typeof CALENDAR_CELL_NON_WORKING).toBe("string");
    expect(CALENDAR_CELL_NON_WORKING.length).toBeGreaterThan(0);
  });

  it("contains gray styling (distinguishes non-working days from leave)", () => {
    expect(CALENDAR_CELL_NON_WORKING).toContain("gray");
  });
});

describe("CALENDAR_CELL_DEFAULT", () => {
  it("is a non-empty string", () => {
    expect(typeof CALENDAR_CELL_DEFAULT).toBe("string");
    expect(CALENDAR_CELL_DEFAULT.length).toBeGreaterThan(0);
  });

  it("contains hover utility class (ensures default cells are interactive)", () => {
    expect(CALENDAR_CELL_DEFAULT).toContain("hover:");
  });
});
