/**
 * affirm.test.ts — Unit tests for Affirm plan derivations.
 *
 * FIXED BUG: Previous makePlan factory used `name` and `total` fields that
 * don't exist on InstallmentPlan. The real type uses `label` (not name) and
 * has no `total` field — just `mc` (monthly payment in cents).
 * TypeScript would catch this at compile time, but Jest transpiles without
 * type-checking. Always run `tsc --noEmit` in CI to catch these.
 *
 * LEARN: The fields affirm.ts actually reads are: start, end, mc, id.
 * The factory only needs to produce those. Anything else is noise.
 */

import {
  getAffirmTotalForMonth,
  getAffirmGridMonths,
  isFinalMonth,
  getPlansEndingInMonth,
} from "@/lib/affirm";
import type { InstallmentPlan } from "@/types";

// ─── Factory ───────────────────────────────────────────────────────────────────
// Only includes the fields affirm.ts actually reads — keeps tests focused.
function makePlan(
  id: string,
  start: string,
  end: string,
  mc: number,
): InstallmentPlan {
  return { id, label: id, start, end, mc };
}

const PLAN_A = makePlan("a", "2026-01", "2026-06", 5000); // $50/mo, Jan–Jun
const PLAN_B = makePlan("b", "2026-03", "2026-08", 8000); // $80/mo, Mar–Aug
const PLAN_C = makePlan("c", "2026-06", "2026-06", 3000); // $30/mo, single month (June)

describe("affirm utils", () => {
  // ─── getAffirmTotalForMonth ─────────────────────────────────────────────────
  describe("getAffirmTotalForMonth", () => {
    describe("empty state", () => {
      it("returns 0 when there are no plans", () => {
        expect(getAffirmTotalForMonth([], "2026-04")).toBe(0);
      });
    });

    describe("single active plan", () => {
      it("returns the plan's mc when it is active in the month", () => {
        expect(getAffirmTotalForMonth([PLAN_A], "2026-02")).toBe(5000);
      });
    });

    describe("multiple plans", () => {
      it("sums all plans that are active in the given month", () => {
        // April: PLAN_A (Jan–Jun) + PLAN_B (Mar–Aug) = 5000 + 8000
        expect(getAffirmTotalForMonth([PLAN_A, PLAN_B], "2026-04")).toBe(13000);
      });
    });

    describe("boundary conditions", () => {
      it("includes a plan on its start month", () => {
        expect(getAffirmTotalForMonth([PLAN_B], "2026-03")).toBe(8000);
      });

      it("includes a plan on its end month", () => {
        expect(getAffirmTotalForMonth([PLAN_A], "2026-06")).toBe(5000);
      });

      it("excludes a plan before it starts", () => {
        expect(getAffirmTotalForMonth([PLAN_B], "2026-01")).toBe(0);
      });

      it("excludes a plan after it ends", () => {
        expect(getAffirmTotalForMonth([PLAN_A], "2026-07")).toBe(0);
      });
    });
  });

  // ─── getAffirmGridMonths ───────────────────────────────────────────────────
  describe("getAffirmGridMonths", () => {
    it("returns an empty array when there are no plans", () => {
      expect(getAffirmGridMonths([])).toEqual([]);
    });

    it("returns the correct month range for a single plan", () => {
      const months = getAffirmGridMonths([PLAN_A]);
      expect(months[0]).toBe("2026-01");
      expect(months[months.length - 1]).toBe("2026-06");
      expect(months).toHaveLength(6);
    });

    it("spans the full union of all plan ranges", () => {
      // PLAN_A: Jan–Jun, PLAN_B: Mar–Aug → grid covers Jan–Aug = 8 months
      const months = getAffirmGridMonths([PLAN_A, PLAN_B]);
      expect(months[0]).toBe("2026-01");
      expect(months[months.length - 1]).toBe("2026-08");
      expect(months).toHaveLength(8);
    });
  });

  // ─── isFinalMonth ──────────────────────────────────────────────────────────
  describe("isFinalMonth", () => {
    it("returns true on the plan's end month", () => {
      expect(isFinalMonth(PLAN_A, "2026-06")).toBe(true);
    });

    it("returns false for any month before the end", () => {
      expect(isFinalMonth(PLAN_A, "2026-05")).toBe(false);
    });

    it("returns false for any month after the end", () => {
      expect(isFinalMonth(PLAN_A, "2026-07")).toBe(false);
    });
  });

  // ─── getPlansEndingInMonth ─────────────────────────────────────────────────
  describe("getPlansEndingInMonth", () => {
    it("returns an empty array when no plans end in that month", () => {
      expect(getPlansEndingInMonth([PLAN_A, PLAN_B], "2026-04")).toEqual([]);
    });

    it("returns all plans whose end month matches", () => {
      // Both PLAN_A and PLAN_C end in June
      const result = getPlansEndingInMonth([PLAN_A, PLAN_B, PLAN_C], "2026-06");
      expect(result).toHaveLength(2);
      expect(result.map((p) => p.id)).toContain("a");
      expect(result.map((p) => p.id)).toContain("c");
    });

    it("does not include plans that end in a different month", () => {
      const result = getPlansEndingInMonth([PLAN_A, PLAN_B, PLAN_C], "2026-06");
      expect(result.map((p) => p.id)).not.toContain("b"); // PLAN_B ends Aug
    });
  });
});
