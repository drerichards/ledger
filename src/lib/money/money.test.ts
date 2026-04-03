/**
 * money.test.ts — Unit tests for money utilities.
 *
 * WHY NESTED DESCRIBE BLOCKS:
 * Nested describes give failure messages like:
 *   "money utils > toCents > invalid inputs > returns 0 for empty string"
 * instead of just:
 *   "returns 0 for empty string"
 * In CI output with 200+ tests, that context is the difference between
 * finding the failure in 5 seconds vs 5 minutes.
 *
 * PATTERN: outer describe = module, inner describe = function,
 * innermost describe = scenario group (valid inputs, edge cases, etc.)
 *
 * WHY NO afterEach(jest.resetAllMocks()) HERE:
 * money.ts is pure math — no external calls, no mocks. resetAllMocks()
 * belongs in test files that use jest.mock() or jest.spyOn(). Adding it
 * here would be noise with no benefit.
 * See: hooks/useAppState/useAppState.test.ts for the mock reset pattern.
 */

import { toCents, fmtMoney, sumCents, calcShortfall } from "@/lib/money";

describe("money utils", () => {
  // ─── toCents ────────────────────────────────────────────────────────────────
  describe("toCents", () => {
    describe("valid inputs", () => {
      it("converts a plain dollar string", () => {
        expect(toCents("10.00")).toBe(1000);
      });

      it("strips dollar sign and converts", () => {
        // "$1,084.00" is a realistic user-entered value or formatted string
        expect(toCents("$1,084.00")).toBe(108400);
      });

      it("strips commas and converts", () => {
        expect(toCents("1,234.56")).toBe(123456);
      });

      it("handles whole dollar amounts with no decimal", () => {
        expect(toCents("500")).toBe(50000);
      });

      it("handles zero", () => {
        expect(toCents("0")).toBe(0);
      });

      it("handles a large real-world bill total (April 2026 Other Income)", () => {
        // $2,598.63 — the April 2026 Other Income bills total from her printout
        expect(toCents("2598.63")).toBe(259863);
      });
    });

    describe("float precision", () => {
      it("rounds to nearest cent, respecting IEEE 754 float reality", () => {
        // LEARN: 1.005 * 100 in JavaScript = 100.49999999999999 (not 100.5)
        // because 1.005 cannot be represented exactly in binary floating point.
        // Math.round(100.499...) = 100, not 101. This is correct behavior —
        // financial inputs should never have more than 2 decimal places.
        expect(toCents("1.005")).toBe(100);
      });
    });

    describe("invalid inputs", () => {
      it("returns 0 for empty string", () => {
        expect(toCents("")).toBe(0);
      });

      it("returns 0 for a non-numeric string", () => {
        expect(toCents("abc")).toBe(0);
      });

      it("returns 0 for a bare dollar sign (no digits)", () => {
        // "$" → strips to "" → parseFloat("") = NaN → 0
        expect(toCents("$")).toBe(0);
      });
    });
  });

  // ─── fmtMoney ───────────────────────────────────────────────────────────────
  describe("fmtMoney", () => {
    it("formats zero as $0.00", () => {
      expect(fmtMoney(0)).toBe("$0.00");
    });

    it("formats a round dollar amount with thousands separator", () => {
      expect(fmtMoney(100000)).toBe("$1,000.00");
    });

    it("formats a real rent amount", () => {
      expect(fmtMoney(108400)).toBe("$1,084.00");
    });

    it("formats amounts with non-round cents", () => {
      // $2,598.63 — the April 2026 bills total
      expect(fmtMoney(259863)).toBe("$2,598.63");
    });

    it("formats a single cent", () => {
      expect(fmtMoney(1)).toBe("$0.01");
    });

    it("round-trips correctly with toCents", () => {
      // LEARN: "round-trip" means: convert to storage format and back.
      // What goes in as a dollar string should come back out as the same dollar string.
      expect(fmtMoney(toCents("1084.00"))).toBe("$1,084.00");
    });
  });

  // ─── sumCents ───────────────────────────────────────────────────────────────
  describe("sumCents", () => {
    it("sums an array of cent values", () => {
      expect(sumCents([1000, 2000, 3000])).toBe(6000);
    });

    it("returns 0 for an empty array", () => {
      // LEARN: reduce on an empty array with initial value 0 returns 0.
      // This is correct behavior — sum of nothing is zero.
      expect(sumCents([])).toBe(0);
    });

    it("handles a single-element array", () => {
      expect(sumCents([5050])).toBe(5050);
    });

    it("sums 51 bills without floating point drift", () => {
      // Real-world scale: the April 2026 seed has 51 bills.
      // Integer addition never drifts — this would be 25,500, not 25,499.9999...
      const bills = Array(51).fill(500);
      expect(sumCents(bills)).toBe(25500);
    });
  });

  // ─── calcShortfall ──────────────────────────────────────────────────────────
  describe("calcShortfall", () => {
    it("returns positive when bills exceed income (she is short)", () => {
      // April 2026 real numbers: Bills $2,598.63 · Income $2,351.37 → SHORT $247.26
      expect(calcShortfall(259863, 235137)).toBe(24726);
    });

    it("returns negative when income exceeds bills (surplus)", () => {
      expect(calcShortfall(100000, 150000)).toBe(-50000);
    });

    it("returns 0 when bills exactly equal income (break-even)", () => {
      expect(calcShortfall(100000, 100000)).toBe(0);
    });
  });
});
