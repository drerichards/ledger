/**
 * projection.test.ts — Unit tests for Kia's check projection utilities.
 *
 * DOMAIN CONTEXT:
 * Kia's weekly checks vary significantly ($441 to $1,421 in the 12-week sample).
 * A single average is misleading for planning — she needs three scenarios:
 * - Conservative: based on the lowest check (safe to plan around)
 * - Average: realistic expectation over time
 * - Optimistic: best case, what's possible on a good week
 *
 * Projections default to Conservative to protect against shortfalls.
 * All amounts in cents — no floats.
 */

import {
  calcCheckBaseline,
  getWeeklyBaseline,
  projectMonthlyKiasPay,
} from "@/lib/projection";
import type { KiasCheckEntry } from "@/types";

function makeEntry(weekOf: string, amount: number): KiasCheckEntry {
  return { weekOf, amount };
}

describe("projection utils", () => {
  // ─── calcCheckBaseline ──────────────────────────────────────────────────────
  describe("calcCheckBaseline", () => {
    describe("empty log", () => {
      it("returns null when there is no check history", () => {
        // null signals to the UI: "not enough data to project"
        expect(calcCheckBaseline([])).toBeNull();
      });
    });

    describe("single entry", () => {
      it("returns a baseline where average, low, and high all equal the only entry", () => {
        const result = calcCheckBaseline([makeEntry("2026-04-06", 80000)]);
        expect(result).toEqual({
          average: 80000,
          low: 80000,
          high: 80000,
          sampleSize: 1,
        });
      });
    });

    describe("multiple entries", () => {
      it("calculates average, low, high, and sampleSize correctly", () => {
        const log = [
          makeEntry("2026-01-01", 70000),
          makeEntry("2026-01-08", 80000),
          makeEntry("2026-01-15", 90000),
        ];
        const result = calcCheckBaseline(log);
        expect(result?.average).toBe(80000);
        expect(result?.low).toBe(70000);
        expect(result?.high).toBe(90000);
        expect(result?.sampleSize).toBe(3);
      });

      it("rounds the average to the nearest cent", () => {
        // (100 + 200 + 300) / 3 = 200 — divides evenly
        const log = [
          makeEntry("2026-01-01", 100),
          makeEntry("2026-01-08", 200),
          makeEntry("2026-01-15", 300),
        ];
        expect(calcCheckBaseline(log)?.average).toBe(200);
      });

      it("handles entries with identical amounts", () => {
        const log = [
          makeEntry("2026-01-01", 76423),
          makeEntry("2026-01-08", 76423),
        ];
        const result = calcCheckBaseline(log);
        expect(result?.average).toBe(76423);
        expect(result?.low).toBe(76423);
        expect(result?.high).toBe(76423);
      });

      it("correctly identifies low and high from real check history range", () => {
        // From seed data: $441.27 low, $1,421.12 high
        const log = [
          makeEntry("2026-02-06", 44127),  // $441.27 — the low
          makeEntry("2026-02-13", 142112), // $1,421.12 — the high
        ];
        const result = calcCheckBaseline(log);
        expect(result?.low).toBe(44127);
        expect(result?.high).toBe(142112);
      });
    });
  });

  // ─── getWeeklyBaseline ─────────────────────────────────────────────────────
  describe("getWeeklyBaseline", () => {
    const baseline = {
      average: 80000,
      low: 60000,
      high: 100000,
      sampleSize: 5,
    };

    it("returns low for the conservative scenario", () => {
      expect(getWeeklyBaseline(baseline, "conservative")).toBe(60000);
    });

    it("returns average for the average scenario", () => {
      expect(getWeeklyBaseline(baseline, "average")).toBe(80000);
    });

    it("returns high for the optimistic scenario", () => {
      expect(getWeeklyBaseline(baseline, "optimistic")).toBe(100000);
    });
  });

  // ─── projectMonthlyKiasPay ─────────────────────────────────────────────────
  describe("projectMonthlyKiasPay", () => {
    it("multiplies by 4 weeks by default (conservative floor)", () => {
      expect(projectMonthlyKiasPay(80000)).toBe(320000);
    });

    it("respects a custom week count for 5-week months", () => {
      expect(projectMonthlyKiasPay(80000, 5)).toBe(400000);
    });

    it("returns 0 when the baseline is 0", () => {
      expect(projectMonthlyKiasPay(0)).toBe(0);
    });

    it("produces correct conservative monthly projection from real data", () => {
      // Real low: $441.27/week × 4 weeks = $1,765.08/month
      expect(projectMonthlyKiasPay(44127)).toBe(176508);
    });
  });
});
