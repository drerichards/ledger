import { renderHook } from "@testing-library/react";
import type { InstallmentPlan } from "@/types";
import { useAffirmNotifications } from "./useAffirmNotifications";

// Freeze "current month" to a known value for stable assertions.
// currentMonth() reads from new Date() internally — jest.spyOn ensures consistency.
jest.mock("@/lib/dates", () => ({
  ...jest.requireActual("@/lib/dates"),
  currentMonth: () => "2026-04",
}));

const plan = (overrides: Partial<InstallmentPlan>): InstallmentPlan => ({
  id: "plan-1",
  label: "Test Plan",
  mc: 5000,
  start: "2025-01",
  end: "2026-03",
  ...overrides,
});

describe("useAffirmNotifications", () => {
  it("returns a notification for every plan whose end <= currentMonth()", () => {
    const plans = [
      plan({ id: "a", end: "2026-03" }), // paid off
      plan({ id: "b", end: "2026-04" }), // also paid off (this month)
      plan({ id: "c", end: "2026-05" }), // still active
    ];
    const { result } = renderHook(() => useAffirmNotifications(plans));
    const ids = result.current.map((n) => n.planId);
    expect(ids).toContain("a");
    expect(ids).toContain("b");
    expect(ids).not.toContain("c");
  });

  it("sorts newest end month first", () => {
    const plans = [
      plan({ id: "old", end: "2025-06" }),
      plan({ id: "new", end: "2026-03" }),
    ];
    const { result } = renderHook(() => useAffirmNotifications(plans));
    expect(result.current[0].planId).toBe("new");
    expect(result.current[1].planId).toBe("old");
  });

  it("returns empty array when no plans are paid off", () => {
    const plans = [plan({ end: "2027-01" })];
    const { result } = renderHook(() => useAffirmNotifications(plans));
    expect(result.current).toHaveLength(0);
  });

  it("generates stable ids as `${planId}-payoff`", () => {
    const plans = [plan({ id: "xyz", end: "2026-01" })];
    const { result } = renderHook(() => useAffirmNotifications(plans));
    expect(result.current[0].id).toBe("xyz-payoff");
  });

  it("exposes mc (monthly cents) on each notification", () => {
    const plans = [plan({ id: "p", mc: 3698, end: "2026-02" })];
    const { result } = renderHook(() => useAffirmNotifications(plans));
    expect(result.current[0].mc).toBe(3698);
  });
});
