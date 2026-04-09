import type { SavingsGoal } from "@/types";
import {
  monthsUntil,
  calcGoalMetrics,
  getGoalMonths,
} from "./goals";

// Fix the current month to a known value for deterministic tests
jest.mock("@/lib/dates", () => ({
  ...jest.requireActual("@/lib/dates"),
  currentMonth: () => "2026-04",
  advanceMonth: jest.requireActual("@/lib/dates").advanceMonth,
}));

const makeGoal = (overrides: Partial<SavingsGoal> = {}): SavingsGoal => ({
  id: "g1",
  label: "Buy a car",
  targetCents: 500000, // $5,000
  targetDate: "2027-04", // 12 months away
  createdAt: "2026-04-01T00:00:00.000Z",
  ...overrides,
});

// ─── monthsUntil ─────────────────────────────────────────────────────────────

describe("monthsUntil", () => {
  it("returns 0 for the current month", () => {
    expect(monthsUntil("2026-04")).toBe(0);
  });

  it("returns 0 for a past month", () => {
    expect(monthsUntil("2025-01")).toBe(0);
  });

  it("returns 1 for next month", () => {
    expect(monthsUntil("2026-05")).toBe(1);
  });

  it("returns 12 for one year out", () => {
    expect(monthsUntil("2027-04")).toBe(12);
  });

  it("returns correct months across year boundary", () => {
    expect(monthsUntil("2027-01")).toBe(9);
  });
});

// ─── calcGoalMetrics ──────────────────────────────────────────────────────────

describe("calcGoalMetrics", () => {
  it("returns achieved when savings equals or exceeds target", () => {
    const goal = makeGoal();
    const result = calcGoalMetrics(goal, 500000);
    expect(result.status).toBe("achieved");
    expect(result.progressRatio).toBe(1);
    expect(result.monthlyContributionNeeded).toBe(0);
  });

  it("returns achieved when savings exceeds target", () => {
    const goal = makeGoal();
    const result = calcGoalMetrics(goal, 600000);
    expect(result.status).toBe("achieved");
    expect(result.progressRatio).toBe(1);
  });

  it("clamps progressRatio to 1 at most", () => {
    const goal = makeGoal();
    const result = calcGoalMetrics(goal, 999999);
    expect(result.progressRatio).toBe(1);
  });

  it("returns 0 progress when no savings yet", () => {
    const goal = makeGoal();
    const result = calcGoalMetrics(goal, 0);
    expect(result.progressRatio).toBe(0);
    expect(result.monthsRemaining).toBe(12);
    // $5000 / 12 months = ceil($416.67) = $41667 cents
    expect(result.monthlyContributionNeeded).toBe(41667);
  });

  it("calculates correct monthly contribution with partial savings", () => {
    const goal = makeGoal();
    // Saved $1,000 of $5,000 → $4,000 remaining / 12 months = ceil($333.33) = $33334 cents
    const result = calcGoalMetrics(goal, 100000);
    expect(result.monthlyContributionNeeded).toBe(33334);
    expect(result.progressRatio).toBeCloseTo(0.2);
  });

  it("is behind when past the target with no savings", () => {
    const goal = makeGoal({ targetDate: "2026-03" }); // past month
    const result = calcGoalMetrics(goal, 0);
    expect(result.status).toBe("behind");
    expect(result.monthsRemaining).toBe(0);
    // All remaining amount due now
    expect(result.monthlyContributionNeeded).toBe(500000);
  });

  it("returns correct months remaining for future target", () => {
    const goal = makeGoal({ targetDate: "2026-10" });
    const result = calcGoalMetrics(goal, 0);
    expect(result.monthsRemaining).toBe(6);
  });

  it("handles zero targetCents without dividing by zero", () => {
    const goal = makeGoal({ targetCents: 0 });
    const result = calcGoalMetrics(goal, 0);
    // A goal with no target is trivially achieved — remaining=0
    expect(result.progressRatio).toBe(1);
    expect(result.status).toBe("achieved");
  });
});

// ─── getGoalMonths ────────────────────────────────────────────────────────────

describe("getGoalMonths", () => {
  it("returns empty array for past target", () => {
    const goal = makeGoal({ targetDate: "2026-03" });
    expect(getGoalMonths(goal)).toEqual([]);
  });

  it("returns empty array for current month target", () => {
    const goal = makeGoal({ targetDate: "2026-04" });
    expect(getGoalMonths(goal)).toEqual([]);
  });

  it("returns correct months for a 3-month goal", () => {
    const goal = makeGoal({ targetDate: "2026-07" });
    const months = getGoalMonths(goal);
    expect(months).toHaveLength(3);
    expect(months[0]).toBe("2026-04");
    expect(months[2]).toBe("2026-06");
  });
});
