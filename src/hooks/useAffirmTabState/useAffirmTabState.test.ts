import { renderHook } from "@testing-library/react";
import { useAffirmTabState } from "./useAffirmTabState";
import type { InstallmentPlan } from "@/types";

// ─── Mock currentMonth so tests are deterministic ─────────────────────────────
jest.mock("@/lib/dates", () => ({
  ...jest.requireActual("@/lib/dates"),
  currentMonth: jest.fn(() => "2026-04"),
}));

// ─── Factories ────────────────────────────────────────────────────────────────

function makePlan(overrides: Partial<InstallmentPlan> = {}): InstallmentPlan {
  return {
    id: "plan-1",
    label: "Amazon Card",
    mc: 5000,
    start: "2026-01",
    end: "2026-06",
    ...overrides,
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("useAffirmTabState — empty plans", () => {
  it("returns empty months array when no plans exist", () => {
    const { result } = renderHook(() => useAffirmTabState([]));
    expect(result.current.months).toEqual([]);
  });

  it("returns empty milestonePlans when no plans exist", () => {
    const { result } = renderHook(() => useAffirmTabState([]));
    expect(result.current.milestonePlans).toEqual([]);
  });

  it("now reflects the mocked current month", () => {
    const { result } = renderHook(() => useAffirmTabState([]));
    expect(result.current.now).toBe("2026-04");
  });
});

describe("useAffirmTabState — months range", () => {
  it("returns the full range spanning all plans", () => {
    const plans = [
      makePlan({ id: "p1", start: "2026-01", end: "2026-03" }),
      makePlan({ id: "p2", start: "2026-02", end: "2026-06" }),
    ];
    const { result } = renderHook(() => useAffirmTabState(plans));
    expect(result.current.months[0]).toBe("2026-01");
    expect(result.current.months[result.current.months.length - 1]).toBe("2026-06");
    expect(result.current.months).toHaveLength(6);
  });

  it("returns a single month when start and end are equal", () => {
    const plans = [makePlan({ start: "2026-04", end: "2026-04" })];
    const { result } = renderHook(() => useAffirmTabState(plans));
    expect(result.current.months).toEqual(["2026-04"]);
  });
});

describe("useAffirmTabState — milestonePlans", () => {
  it("identifies plans ending in the current month as milestones", () => {
    const plans = [
      makePlan({ id: "p1", end: "2026-04" }), // ends now
      makePlan({ id: "p2", end: "2026-06" }), // ends later
    ];
    const { result } = renderHook(() => useAffirmTabState(plans));
    expect(result.current.milestonePlans).toHaveLength(1);
    expect(result.current.milestonePlans[0].id).toBe("p1");
  });

  it("returns empty milestones when no plans end in the current month", () => {
    const plans = [
      makePlan({ id: "p1", end: "2026-05" }),
      makePlan({ id: "p2", end: "2026-06" }),
    ];
    const { result } = renderHook(() => useAffirmTabState(plans));
    expect(result.current.milestonePlans).toEqual([]);
  });

  it("returns all plans that end in the current month", () => {
    const plans = [
      makePlan({ id: "p1", end: "2026-04" }),
      makePlan({ id: "p2", end: "2026-04" }),
      makePlan({ id: "p3", end: "2026-06" }),
    ];
    const { result } = renderHook(() => useAffirmTabState(plans));
    expect(result.current.milestonePlans).toHaveLength(2);
  });
});

describe("useAffirmTabState — grandTotalOwed + monthlyTotals", () => {
  it("computes grandTotalOwed as sum of mc × active months per plan", () => {
    // Plan active Jan–Mar (3 months) with mc=5000 → 15000
    const plans = [makePlan({ id: "p1", mc: 5000, start: "2026-01", end: "2026-03" })];
    const { result } = renderHook(() => useAffirmTabState(plans));
    expect(result.current.grandTotalOwed).toBe(15000);
  });

  it("grandTotalOwed is 0 for an empty plans array", () => {
    const { result } = renderHook(() => useAffirmTabState([]));
    expect(result.current.grandTotalOwed).toBe(0);
  });

  it("monthlyTotals has an entry for each column month", () => {
    const plans = [makePlan({ start: "2026-04", end: "2026-06" })];
    const { result } = renderHook(() => useAffirmTabState(plans));
    const { months, monthlyTotals } = result.current;
    expect(monthlyTotals.size).toBe(months.length);
  });

  it("monthlyTotals sums mc across plans active in a given month", () => {
    const plans = [
      makePlan({ id: "p1", mc: 3000, start: "2026-04", end: "2026-04" }),
      makePlan({ id: "p2", mc: 2000, start: "2026-04", end: "2026-05" }),
    ];
    const { result } = renderHook(() => useAffirmTabState(plans));
    expect(result.current.monthlyTotals.get("2026-04")).toBe(5000);
  });

  it("totalOwedByPlan maps plan id to mc × active months count", () => {
    // Plan active Apr–May (2 months) with mc=4000 → 8000
    const plans = [makePlan({ id: "p1", mc: 4000, start: "2026-04", end: "2026-05" })];
    const { result } = renderHook(() => useAffirmTabState(plans));
    expect(result.current.totalOwedByPlan.get("p1")).toBe(8000);
  });

});

describe("useAffirmTabState — memoization", () => {
  it("returns same reference when plans array is stable", () => {
    const plans = [makePlan()];
    const { result, rerender } = renderHook(
      ({ p }: { p: InstallmentPlan[] }) => useAffirmTabState(p),
      { initialProps: { p: plans } },
    );
    const first = result.current;
    rerender({ p: plans }); // same reference
    expect(result.current).toBe(first);
  });
});
