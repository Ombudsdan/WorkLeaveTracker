import { DAY_NAMES_SHORT, MONTH_NAMES_LONG, MONTH_NAMES_SHORT } from "@/variables/calendar";

describe("DAY_NAMES_SHORT", () => {
  it("contains exactly 7 entries", () => {
    expect(DAY_NAMES_SHORT).toHaveLength(7);
  });

  it("starts with Sunday (matches JS Date.getDay() = 0)", () => {
    expect(DAY_NAMES_SHORT[0]).toBe("Sun");
  });

  it("has Monday at index 1", () => {
    expect(DAY_NAMES_SHORT[1]).toBe("Mon");
  });

  it("ends with Saturday", () => {
    expect(DAY_NAMES_SHORT[6]).toBe("Sat");
  });
});

describe("MONTH_NAMES_LONG", () => {
  it("contains exactly 12 entries", () => {
    expect(MONTH_NAMES_LONG).toHaveLength(12);
  });

  it("starts with January (matches JS Date month 0)", () => {
    expect(MONTH_NAMES_LONG[0]).toBe("January");
  });

  it("ends with December", () => {
    expect(MONTH_NAMES_LONG[11]).toBe("December");
  });
});

describe("MONTH_NAMES_SHORT", () => {
  it("contains exactly 12 entries", () => {
    expect(MONTH_NAMES_SHORT).toHaveLength(12);
  });

  it("starts with Jan", () => {
    expect(MONTH_NAMES_SHORT[0]).toBe("Jan");
  });

  it("ends with Dec", () => {
    expect(MONTH_NAMES_SHORT[11]).toBe("Dec");
  });

  it("short name matches the first 3 chars of the long name", () => {
    for (let i = 0; i < 12; i++) {
      expect(MONTH_NAMES_SHORT[i]).toBe(MONTH_NAMES_LONG[i].slice(0, 3));
    }
  });
});
