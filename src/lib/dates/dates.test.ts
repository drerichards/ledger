/**
 * dates.test.ts — Unit tests for date/month utilities.
 *
 * WHY NO new Date(string) IN THE SOURCE:
 * "2026-04" parsed as new Date() is treated as UTC midnight.
 * In US Eastern time (UTC-4), that becomes March 31 at 8pm — wrong month.
 * All month arithmetic uses integer math on year/month integers instead.
 * The timezone-drift regression test below catches any reintroduction of this bug.
 *
 * WHY NO afterEach(jest.resetAllMocks()) HERE:
 * dates.ts has no external dependencies to mock. Pure string/integer functions.
 */

import {
  advanceMonth,
  getMonthRange,
  getMondaysInMonth,
  getFridaysInMonth,
  getFridaysUpToMonth,
  getMondaysUpToMonth,
  monthsBetween,
  fmtMonthLabel,
  fmtMonthFull,
  mondayOf,
} from "@/lib/dates";

describe("date utils", () => {
  // ─── advanceMonth ──────────────────────────────────────────────────────────
  describe("advanceMonth", () => {
    describe("standard advancement", () => {
      it("advances by 1 month", () => {
        expect(advanceMonth("2026-04", 1)).toBe("2026-05");
      });

      it("advances by 12 months (full year)", () => {
        expect(advanceMonth("2026-04", 12)).toBe("2027-04");
      });

      it("handles n=0 (no-op)", () => {
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

    describe("year rollover", () => {
      it("rolls December forward to January of the next year", () => {
        expect(advanceMonth("2026-12", 1)).toBe("2027-01");
      });
    });

    describe("negative advancement (going back)", () => {
      it("goes back 1 month", () => {
        expect(advanceMonth("2026-04", -1)).toBe("2026-03");
      });

      it("rolls back from January to December of the previous year", () => {
        expect(advanceMonth("2026-01", -1)).toBe("2025-12");
      });
    });
  });

  // ─── getMonthRange ─────────────────────────────────────────────────────────
  describe("getMonthRange", () => {
    describe("basic ranges", () => {
      it("returns a single-element array when start equals end", () => {
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
    });

    describe("timezone-drift regression", () => {
      // LEARN: This was the original bug. new Date("2026-12") in a UTC-5 timezone
      // would be interpreted as Nov 30 at 7pm local time — making December appear
      // as November. The fix: pure integer arithmetic, never new Date(string).
      it("produces no duplicate months across a year boundary", () => {
        const months = getMonthRange("2025-10", "2026-03");
        const unique = new Set(months);
        expect(unique.size).toBe(months.length);
        expect(months).toHaveLength(6);
      });

      it("December and January are distinct months in any range", () => {
        const months = getMonthRange("2026-11", "2027-01");
        expect(months).toContain("2026-12");
        expect(months).toContain("2027-01");
        expect(months.filter((m) => m === "2026-12")).toHaveLength(1);
      });
    });
  });

  // ─── monthsBetween ─────────────────────────────────────────────────────────
  describe("monthsBetween", () => {
    it("returns 1 for the same month", () => {
      expect(monthsBetween("2026-04", "2026-04")).toBe(1);
    });

    it("counts months inclusive (Jan through Dec = 12)", () => {
      expect(monthsBetween("2026-01", "2026-12")).toBe(12);
    });

    it("works across a year boundary", () => {
      // Nov 2026 → Feb 2027 = 4 months
      expect(monthsBetween("2026-11", "2027-02")).toBe(4);
    });
  });

  // ─── getMondaysInMonth ─────────────────────────────────────────────────────
  describe("getMondaysInMonth", () => {
    describe("April 2026 — the seed data month", () => {
      it("returns the correct four Mondays", () => {
        // April 2026: 6th, 13th, 20th, 27th
        expect(getMondaysInMonth("2026-04")).toEqual([
          "2026-04-06",
          "2026-04-13",
          "2026-04-20",
          "2026-04-27",
        ]);
      });

      it("all returned dates are within April 2026", () => {
        const mondays = getMondaysInMonth("2026-04");
        expect(mondays.every((d) => d.startsWith("2026-04"))).toBe(true);
      });
    });

    describe("general month properties", () => {
      it("always returns 4 or 5 Mondays — never fewer or more", () => {
        const count = getMondaysInMonth("2026-04").length;
        expect(count).toBeGreaterThanOrEqual(4);
        expect(count).toBeLessThanOrEqual(5);
      });

      it("handles January (often starts mid-week)", () => {
        const mondays = getMondaysInMonth("2026-01");
        expect(mondays.every((d) => d.startsWith("2026-01"))).toBe(true);
        expect(mondays.length).toBeGreaterThanOrEqual(4);
      });
    });
  });

  // ─── fmtMonthLabel ─────────────────────────────────────────────────────────
  describe("fmtMonthLabel", () => {
    it("formats April 2026 as a short label containing 'Apr' and '26'", () => {
      // Using regex because locale formatting varies slightly by environment
      expect(fmtMonthLabel("2026-04")).toMatch(/Apr.+26/);
    });

    it("formats January correctly", () => {
      expect(fmtMonthLabel("2026-01")).toMatch(/Jan.+26/);
    });
  });

  // ─── fmtMonthFull ──────────────────────────────────────────────────────────
  describe("fmtMonthFull", () => {
    it("formats April 2026 as the full label", () => {
      expect(fmtMonthFull("2026-04")).toBe("April 2026");
    });

    it("formats January correctly", () => {
      expect(fmtMonthFull("2026-01")).toBe("January 2026");
    });
  });

  // ─── getFridaysInMonth ─────────────────────────────────────────────────────
  describe("getFridaysInMonth", () => {
    it("returns the correct Fridays for April 2026", () => {
      // April 2026: 3rd, 10th, 17th, 24th
      expect(getFridaysInMonth("2026-04")).toEqual([
        "2026-04-03",
        "2026-04-10",
        "2026-04-17",
        "2026-04-24",
      ]);
    });

    it("all returned dates start with the correct year-month prefix", () => {
      const fridays = getFridaysInMonth("2026-04");
      expect(fridays.every((d) => d.startsWith("2026-04"))).toBe(true);
    });

    it("returns 4 or 5 Fridays per month", () => {
      const count = getFridaysInMonth("2026-04").length;
      expect(count).toBeGreaterThanOrEqual(4);
      expect(count).toBeLessThanOrEqual(5);
    });

    it("pads single-digit days with a leading zero", () => {
      const fridays = getFridaysInMonth("2026-04");
      // 2026-04-03 — day 3 must be zero-padded
      expect(fridays[0]).toBe("2026-04-03");
    });

    it("handles a month where the 1st is a Friday", () => {
      // January 2021: Jan 1 is a Friday
      const fridays = getFridaysInMonth("2021-01");
      expect(fridays[0]).toBe("2021-01-01");
    });
  });

  // ─── getFridaysUpToMonth ───────────────────────────────────────────────────
  describe("getFridaysUpToMonth", () => {
    it("returns newest-first ordering", () => {
      const fridays = getFridaysUpToMonth("2026-04", "2026-03");
      // All April dates should come before March dates
      const aprilDates = fridays.filter((d) => d.startsWith("2026-04"));
      const marchDates = fridays.filter((d) => d.startsWith("2026-03"));
      expect(fridays.indexOf(aprilDates[0])).toBeLessThan(
        fridays.indexOf(marchDates[0]),
      );
    });

    it("includes both start and end months when fromMonth is specified", () => {
      const fridays = getFridaysUpToMonth("2026-04", "2026-03");
      expect(fridays.some((d) => d.startsWith("2026-03"))).toBe(true);
      expect(fridays.some((d) => d.startsWith("2026-04"))).toBe(true);
    });

    it("defaults to a 6-month window when fromMonth is omitted", () => {
      const fridays = getFridaysUpToMonth("2026-04");
      // 6-month window: 2025-11 through 2026-04
      expect(fridays.some((d) => d.startsWith("2025-11"))).toBe(true);
      expect(fridays.some((d) => d.startsWith("2026-04"))).toBe(true);
    });

    it("single-month range returns only fridays in that month", () => {
      const fridays = getFridaysUpToMonth("2026-04", "2026-04");
      expect(fridays.every((d) => d.startsWith("2026-04"))).toBe(true);
    });
  });

  // ─── getMondaysUpToMonth ───────────────────────────────────────────────────
  describe("getMondaysUpToMonth", () => {
    it("returns newest-first ordering", () => {
      const mondays = getMondaysUpToMonth("2026-04", "2026-03");
      const aprilDates = mondays.filter((d) => d.startsWith("2026-04"));
      const marchDates = mondays.filter((d) => d.startsWith("2026-03"));
      expect(mondays.indexOf(aprilDates[0])).toBeLessThan(
        mondays.indexOf(marchDates[0]),
      );
    });

    it("includes both start and end months when fromMonth is specified", () => {
      const mondays = getMondaysUpToMonth("2026-04", "2026-03");
      expect(mondays.some((d) => d.startsWith("2026-03"))).toBe(true);
      expect(mondays.some((d) => d.startsWith("2026-04"))).toBe(true);
    });

    it("defaults to a 6-month window when fromMonth is omitted", () => {
      const mondays = getMondaysUpToMonth("2026-04");
      expect(mondays.some((d) => d.startsWith("2025-11"))).toBe(true);
      expect(mondays.some((d) => d.startsWith("2026-04"))).toBe(true);
    });

    it("single-month range returns only mondays in that month", () => {
      const mondays = getMondaysUpToMonth("2026-04", "2026-04");
      expect(mondays.every((d) => d.startsWith("2026-04"))).toBe(true);
    });
  });

  // ─── mondayOf ──────────────────────────────────────────────────────────────
  describe("mondayOf", () => {
    it("returns the same date when input is already a Monday", () => {
      // 2026-04-06 is a Monday
      expect(mondayOf("2026-04-06")).toBe("2026-04-06");
    });

    it("returns the preceding Monday for a Wednesday", () => {
      // 2026-04-08 is Wednesday → preceding Monday is 2026-04-06
      expect(mondayOf("2026-04-08")).toBe("2026-04-06");
    });

    it("returns the preceding Monday for a Sunday", () => {
      // 2026-04-12 is Sunday → preceding Monday is 2026-04-06
      expect(mondayOf("2026-04-12")).toBe("2026-04-06");
    });

    it("returns the preceding Monday for a Saturday", () => {
      // 2026-04-11 is Saturday → preceding Monday is 2026-04-06
      expect(mondayOf("2026-04-11")).toBe("2026-04-06");
    });
  });
});
