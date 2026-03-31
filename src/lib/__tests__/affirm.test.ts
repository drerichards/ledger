import {
  getAffirmTotalForMonth,
  getAffirmGridMonths,
  isFinalMonth,
  getPlansEndingInMonth,
} from "@/lib/affirm";
import type { InstallmentPlan } from "@/types";

// Minimal plan factory — only fields affirm.ts actually reads
function makePlan(
  id: string,
  start: string,
  end: string,
  mc: number,
): InstallmentPlan {
  return { id, name: id, start, end, mc, total: mc * 6 };
}

const PLAN_A = makePlan("a", "2026-01", "2026-06", 5000); // $50/mo
const PLAN_B = makePlan("b", "2026-03", "2026-08", 8000); // $80/mo
const PLAN_C = makePlan("c", "2026-06", "2026-06", 3000); // single month, final in June

describe("getAffirmTotalForMonth", () => {
  it("returns 0 when no plans are active", () => {
    expect(getAffirmTotalForMonth([], "2026-04")).toBe(0);
  });

  it("returns the single active plan's monthly cost", () => {
    // PLAN_A active Jan–Jun; only PLAN_A active in Feb
    expect(getAffirmTotalForMonth([PLAN_A], "2026-02")).toBe(5000);
  });

  it("sums all active plans for a given month", () => {
    // April: PLAN_A (active) + PLAN_B (active) = 5000 + 8000
    expect(getAffirmTotalForMonth([PLAN_A, PLAN_B], "2026-04")).toBe(13000);
  });

  it("excludes plans that haven't started yet", () => {
    // PLAN_B starts March — not active in January
    expect(getAffirmTotalForMonth([PLAN_B], "2026-01")).toBe(0);
  });

  it("excludes plans that have ended", () => {
    // PLAN_A ends June — not active in July
    expect(getAffirmTotalForMonth([PLAN_A], "2026-07")).toBe(0);
  });

  it("includes plans on their start month", () => {
    expect(getAffirmTotalForMonth([PLAN_B], "2026-03")).toBe(8000);
  });

  it("includes plans on their end month", () => {
    expect(getAffirmTotalForMonth([PLAN_A], "2026-06")).toBe(5000);
  });

  it("handles the April 2026 verification total", () => {
    // Seed data: Affirm April total should be $376.52 = 37652 cents
    // This test uses real seed plans once seed.ts is populated.
    // For now assert the math works with a known subset.
    const plans = [
      makePlan("p1", "2026-01", "2026-12", 10000),
      makePlan("p2", "2026-04", "2026-06", 5000),
    ];
    expect(getAffirmTotalForMonth(plans, "2026-04")).toBe(15000);
  });
});

describe("getAffirmGridMonths", () => {
  it("returns empty array for no plans", () => {
    expect(getAffirmGridMonths([])).toEqual([]);
  });

  it("returns the single plan's month range", () => {
    const months = getAffirmGridMonths([PLAN_A]);
    expect(months[0]).toBe("2026-01");
    expect(months[months.length - 1]).toBe("2026-06");
    expect(months).toHaveLength(6);
  });

  it("spans the full union of all plans", () => {
    // PLAN_A: Jan–Jun, PLAN_B: Mar–Aug → grid Jan–Aug = 8 months
    const months = getAffirmGridMonths([PLAN_A, PLAN_B]);
    expect(months[0]).toBe("2026-01");
    expect(months[months.length - 1]).toBe("2026-08");
    expect(months).toHaveLength(8);
  });
});

describe("isFinalMonth", () => {
  it("returns true on the plan's end month", () => {
    expect(isFinalMonth(PLAN_A, "2026-06")).toBe(true);
  });

  it("returns false before the plan's end month", () => {
    expect(isFinalMonth(PLAN_A, "2026-05")).toBe(false);
  });

  it("returns false after the plan's end month", () => {
    expect(isFinalMonth(PLAN_A, "2026-07")).toBe(false);
  });
});

describe("getPlansEndingInMonth", () => {
  it("returns empty array when no plans end in that month", () => {
    expect(getPlansEndingInMonth([PLAN_A, PLAN_B], "2026-04")).toEqual([]);
  });

  it("returns only plans ending in the given month", () => {
    const result = getPlansEndingInMonth([PLAN_A, PLAN_B, PLAN_C], "2026-06");
    expect(result).toHaveLength(2); // PLAN_A and PLAN_C both end in June
    expect(result.map((p) => p.id)).toContain("a");
    expect(result.map((p) => p.id)).toContain("c");
  });
});
