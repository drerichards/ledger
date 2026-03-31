import {
  advanceMonth,
  getMonthRange,
  getMondaysInMonth,
  monthsBetween,
  fmtMonthLabel,
  fmtMonthFull,
  mondayOf,
} from "@/lib/dates";

describe("advanceMonth", () => {
  it("advances by 1 month", () => {
    expect(advanceMonth("2026-04", 1)).toBe("2026-05");
  });

  it("advances by 12 months (full year)", () => {
    expect(advanceMonth("2026-04", 12)).toBe("2027-04");
  });

  it("rolls over December to January", () => {
    expect(advanceMonth("2026-12", 1)).toBe("2027-01");
  });

  it("handles n=0 (no change)", () => {
    expect(advanceMonth("2026-04", 0)).toBe("2026-04");
  });

  it("pads single-digit months with a leading zero", () => {
    expect(advanceMonth("2026-08", 1)).toBe("2026-09");
    expect(advanceMonth("2026-09", 1)).toBe("2026-10");
  });

  it("advances across multiple year boundaries", () => {
    expect(advanceMonth("2026-11", 3)).toBe("2027-02");
  });
});

describe("getMonthRange", () => {
  it("returns a single month when start equals end", () => {
    expect(getMonthRange("2026-04", "2026-04")).toEqual(["2026-04"]);
  });

  it("returns all months from start to end inclusive", () => {
    expect(getMonthRange("2026-01", "2026-03")).toEqual([
      "2026-01",
      "2026-02",
      "2026-03",
    ]);
  });

  it("spans a year boundary", () => {
    expect(getMonthRange("2026-11", "2027-02")).toEqual([
      "2026-11",
      "2026-12",
      "2027-01",
      "2027-02",
    ]);
  });

  it("produces correct count for a full year", () => {
    expect(getMonthRange("2026-01", "2026-12")).toHaveLength(12);
  });

  // Critical regression: this was the timezone-drift bug that caused duplicates.
  // Pure string arithmetic must produce clean, unique months.
  it("produces no duplicate months across year boundary", () => {
    const months = getMonthRange("2025-10", "2026-03");
    const unique = new Set(months);
    expect(unique.size).toBe(months.length);
  });
});

describe("monthsBetween", () => {
  it("returns 1 for same month", () => {
    expect(monthsBetween("2026-04", "2026-04")).toBe(1);
  });

  it("counts months inclusive", () => {
    // Jan through Dec = 12
    expect(monthsBetween("2026-01", "2026-12")).toBe(12);
  });

  it("works across year boundary", () => {
    // Nov 2026 to Feb 2027 = 4 months
    expect(monthsBetween("2026-11", "2027-02")).toBe(4);
  });
});

describe("getMondaysInMonth", () => {
  it("returns only Mondays for April 2026", () => {
    // April 2026: Mondays fall on the 6th, 13th, 20th, 27th
    const mondays = getMondaysInMonth("2026-04");
    expect(mondays).toEqual([
      "2026-04-06",
      "2026-04-13",
      "2026-04-20",
      "2026-04-27",
    ]);
  });

  it("all returned dates are within the target month", () => {
    const mondays = getMondaysInMonth("2026-04");
    expect(mondays.every((d) => d.startsWith("2026-04"))).toBe(true);
  });

  it("returns 4 or 5 Mondays (never fewer, never more)", () => {
    const count = getMondaysInMonth("2026-04").length;
    expect(count).toBeGreaterThanOrEqual(4);
    expect(count).toBeLessThanOrEqual(5);
  });

  it("handles January (month that starts on various days)", () => {
    const mondays = getMondaysInMonth("2026-01");
    expect(mondays.every((d) => d.startsWith("2026-01"))).toBe(true);
  });
});

describe("fmtMonthLabel", () => {
  it("formats April 2026 as short label", () => {
    expect(fmtMonthLabel("2026-04")).toMatch(/Apr.+26/);
  });

  it("formats January correctly", () => {
    expect(fmtMonthLabel("2026-01")).toMatch(/Jan.+26/);
  });
});

describe("fmtMonthFull", () => {
  it("formats April 2026 as full label", () => {
    expect(fmtMonthFull("2026-04")).toBe("April 2026");
  });

  it("formats January correctly", () => {
    expect(fmtMonthFull("2026-01")).toBe("January 2026");
  });
});

describe("mondayOf", () => {
  it("returns the same date if already a Monday", () => {
    // 2026-04-06 is a Monday
    expect(mondayOf("2026-04-06")).toBe("2026-04-06");
  });

  it("returns the preceding Monday for a Wednesday", () => {
    // 2026-04-08 is a Wednesday → Monday is 2026-04-06
    expect(mondayOf("2026-04-08")).toBe("2026-04-06");
  });

  it("returns the preceding Monday for a Sunday", () => {
    // 2026-04-12 is a Sunday → Monday is 2026-04-06
    expect(mondayOf("2026-04-12")).toBe("2026-04-06");
  });
});
