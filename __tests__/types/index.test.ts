import { LeaveStatus, LeaveType, ValidationRule } from "@/types";

describe("LeaveStatus enum", () => {
  it("has the correct string values", () => {
    expect(LeaveStatus.Planned).toBe("planned");
    expect(LeaveStatus.Requested).toBe("requested");
    expect(LeaveStatus.Approved).toBe("approved");
  });

  it("has exactly three members", () => {
    expect(Object.keys(LeaveStatus)).toHaveLength(3);
  });
});

describe("LeaveType enum", () => {
  it("has the correct string values", () => {
    expect(LeaveType.Holiday).toBe("holiday");
    expect(LeaveType.Sick).toBe("sick");
    expect(LeaveType.Other).toBe("other");
  });

  it("has exactly three members", () => {
    expect(Object.keys(LeaveType)).toHaveLength(3);
  });
});

describe("ValidationRule enum", () => {
  it("has the correct string values", () => {
    expect(ValidationRule.Required).toBe("required");
    expect(ValidationRule.Min).toBe("min");
    expect(ValidationRule.Max).toBe("max");
  });

  it("has exactly three members", () => {
    expect(Object.keys(ValidationRule)).toHaveLength(3);
  });
});
