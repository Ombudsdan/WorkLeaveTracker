import {
  LEAVE_STATUS_LABELS,
  LEAVE_STATUS_ORDER,
  LEAVE_TYPE_LABELS,
  LEAVE_TYPE_ORDER,
} from "@/variables/leaveConfig";
import { LeaveStatus, LeaveType } from "@/types";

describe("LEAVE_STATUS_LABELS", () => {
  it("provides a label for every LeaveStatus", () => {
    Object.values(LeaveStatus).forEach((status) => {
      expect(LEAVE_STATUS_LABELS[status]).toBeTruthy();
    });
  });

  it("has the expected label text for each status", () => {
    expect(LEAVE_STATUS_LABELS[LeaveStatus.Planned]).toContain("Planned");
    expect(LEAVE_STATUS_LABELS[LeaveStatus.Requested]).toContain("Requested");
    expect(LEAVE_STATUS_LABELS[LeaveStatus.Approved]).toContain("Approved");
  });
});

describe("LEAVE_STATUS_ORDER", () => {
  it("contains all three LeaveStatus values", () => {
    expect(LEAVE_STATUS_ORDER).toHaveLength(3);
    expect(LEAVE_STATUS_ORDER).toContain(LeaveStatus.Planned);
    expect(LEAVE_STATUS_ORDER).toContain(LeaveStatus.Requested);
    expect(LEAVE_STATUS_ORDER).toContain(LeaveStatus.Approved);
  });

  it("lists Planned before Requested (draft → pending ordering)", () => {
    expect(LEAVE_STATUS_ORDER.indexOf(LeaveStatus.Planned)).toBeLessThan(
      LEAVE_STATUS_ORDER.indexOf(LeaveStatus.Requested)
    );
  });

  it("lists Requested before Approved (pending → confirmed ordering)", () => {
    expect(LEAVE_STATUS_ORDER.indexOf(LeaveStatus.Requested)).toBeLessThan(
      LEAVE_STATUS_ORDER.indexOf(LeaveStatus.Approved)
    );
  });
});

describe("LEAVE_TYPE_LABELS", () => {
  it("provides a label for every LeaveType", () => {
    Object.values(LeaveType).forEach((type) => {
      expect(LEAVE_TYPE_LABELS[type]).toBeTruthy();
    });
  });

  it("has the expected label text for each type", () => {
    expect(LEAVE_TYPE_LABELS[LeaveType.Holiday]).toContain("Holiday");
    expect(LEAVE_TYPE_LABELS[LeaveType.Sick]).toContain("Sick");
    expect(LEAVE_TYPE_LABELS[LeaveType.Other]).toContain("Other");
  });
});

describe("LEAVE_TYPE_ORDER", () => {
  it("contains all three LeaveType values", () => {
    expect(LEAVE_TYPE_ORDER).toHaveLength(3);
    expect(LEAVE_TYPE_ORDER).toContain(LeaveType.Holiday);
    expect(LEAVE_TYPE_ORDER).toContain(LeaveType.Sick);
    expect(LEAVE_TYPE_ORDER).toContain(LeaveType.Other);
  });

  it("lists Holiday first (primary leave type)", () => {
    expect(LEAVE_TYPE_ORDER[0]).toBe(LeaveType.Holiday);
  });
});
