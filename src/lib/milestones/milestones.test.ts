import type { AppState, Milestone, SavingsGoal } from "@/types";
import { deriveNewMilestones, getMilestoneLabel, getUnseenMilestones } from "./milestones";
import { SEED_STATE } from "@/lib/seed";

jest.mock("@/lib/dates", () => ({
  ...jest.requireActual("@/lib/dates"),
  currentMonth: () => "2026-04",
}));

// Minimal AppState for testing
const emptyState: AppState = {
  ...SEED_STATE,
  bills: [],
  plans: [],
  income: [],
  snapshots: [],
  savingsLog: [],
  checkLog: [],
  paycheck: [],
  goals: [],
  milestones: [],
};

// ─── deriveNewMilestones ──────────────────────────────────────────────────────

describe("deriveNewMilestones", () => {
  it("returns empty array when no conditions are met", () => {
    expect(deriveNewMilestones(emptyState)).toEqual([]);
  });

  it("detects affirm_payoff for plans that have ended", () => {
    const state: AppState = {
      ...emptyState,
      plans: [
        { id: "p1", label: "Affirm — Due 6th", mc: 3698, start: "2026-04", end: "2026-04" }, // ends current month — not yet payoff
        { id: "p2", label: "Affirm — Due 6th B", mc: 3698, start: "2025-01", end: "2026-03" }, // past
      ],
    };
    const milestones = deriveNewMilestones(state);
    // Only p2 has ended (past current month 2026-04)
    expect(milestones).toHaveLength(1);
    expect(milestones[0].type).toBe("affirm_payoff");
    expect(milestones[0].payload.planId).toBe("p2");
  });

  it("does not duplicate existing milestones", () => {
    const state: AppState = {
      ...emptyState,
      plans: [
        { id: "p1", label: "Old plan", mc: 1000, start: "2025-01", end: "2026-01" },
      ],
      milestones: [
        {
          id: "affirm_payoff:p1",
          type: "affirm_payoff",
          payload: {},
          achievedAt: "2026-01-01T00:00:00.000Z",
          seen: true,
        },
      ],
    };
    const milestones = deriveNewMilestones(state);
    expect(milestones).toHaveLength(0);
  });

  it("detects savings_threshold at $500", () => {
    const state: AppState = {
      ...emptyState,
      savingsLog: [
        { id: "s1", date: "2026-04-01", amount: 60000 }, // $600 > $500 threshold
      ],
    };
    const milestones = deriveNewMilestones(state);
    const thresholdMilestone = milestones.find(
      (m) => m.type === "savings_threshold" && m.payload.threshold === 50000,
    );
    expect(thresholdMilestone).toBeDefined();
  });

  it("detects multiple savings thresholds at once", () => {
    const state: AppState = {
      ...emptyState,
      savingsLog: [
        { id: "s1", date: "2026-04-01", amount: 250000 }, // $2,500 — crosses $500, $1k, $2k
      ],
    };
    const milestones = deriveNewMilestones(state);
    const thresholds = milestones.filter((m) => m.type === "savings_threshold");
    expect(thresholds).toHaveLength(3);
  });

  it("detects goal_achieved when savings covers target", () => {
    const goal: SavingsGoal = {
      id: "g1",
      label: "Emergency fund",
      targetCents: 100000,
      targetDate: "2027-01",
      createdAt: "2026-04-01T00:00:00.000Z",
    };
    const state: AppState = {
      ...emptyState,
      goals: [goal],
      savingsLog: [{ id: "s1", date: "2026-04-01", amount: 100000 }],
    };
    const milestones = deriveNewMilestones(state);
    const goalMilestone = milestones.find((m) => m.type === "goal_achieved");
    expect(goalMilestone).toBeDefined();
    expect(goalMilestone?.payload.goalId).toBe("g1");
  });

  it("detects first_surplus from snapshots", () => {
    const state: AppState = {
      ...emptyState,
      snapshots: [
        {
          month: "2026-03",
          totalBilled: 200000,
          totalPaid: 200000,
          shortfall: -5000, // negative = surplus
          savingsMoved: 0,
          kiasPayActual: 0,
        },
      ],
    };
    const milestones = deriveNewMilestones(state);
    expect(milestones.find((m) => m.type === "first_surplus")).toBeDefined();
  });

  it("does not trigger first_surplus for shortfall > 0", () => {
    const state: AppState = {
      ...emptyState,
      snapshots: [
        {
          month: "2026-03",
          totalBilled: 200000,
          totalPaid: 190000,
          shortfall: 10000, // positive = short
          savingsMoved: 0,
          kiasPayActual: 0,
        },
      ],
    };
    const milestones = deriveNewMilestones(state);
    expect(milestones.find((m) => m.type === "first_surplus")).toBeUndefined();
  });
});

// ─── getMilestoneLabel ────────────────────────────────────────────────────────

describe("getMilestoneLabel", () => {
  it("returns label for affirm_payoff", () => {
    const m: Milestone = {
      id: "affirm_payoff:p1",
      type: "affirm_payoff",
      payload: { planId: "p1", label: "Affirm — Due 4th", mc: 3227, month: "2026-08" },
      achievedAt: "2026-09-01T00:00:00.000Z",
      seen: false,
    };
    expect(getMilestoneLabel(m)).toBe("Affirm — Due 4th is paid off");
  });

  it("returns label for savings_threshold", () => {
    const m: Milestone = {
      id: "savings_threshold:50000",
      type: "savings_threshold",
      payload: { threshold: 50000, totalSaved: 60000 },
      achievedAt: "2026-04-01T00:00:00.000Z",
      seen: false,
    };
    expect(getMilestoneLabel(m)).toBe("Saved $500!");
  });

  it("returns label for goal_achieved", () => {
    const m: Milestone = {
      id: "goal_achieved:g1",
      type: "goal_achieved",
      payload: { goalId: "g1", label: "Buy a car", targetCents: 500000 },
      achievedAt: "2026-04-01T00:00:00.000Z",
      seen: false,
    };
    expect(getMilestoneLabel(m)).toBe("Goal achieved: Buy a car");
  });

  it("returns label for first_surplus", () => {
    const m: Milestone = {
      id: "first_surplus:global",
      type: "first_surplus",
      payload: { month: "2026-03", surplusCents: 5000 },
      achievedAt: "2026-04-01T00:00:00.000Z",
      seen: false,
    };
    expect(getMilestoneLabel(m)).toBe("First month surplus!");
  });
});

// ─── getUnseenMilestones ──────────────────────────────────────────────────────

describe("getUnseenMilestones", () => {
  it("returns only unseen milestones", () => {
    const state: AppState = {
      ...emptyState,
      milestones: [
        {
          id: "m1",
          type: "first_surplus",
          payload: {},
          achievedAt: "2026-04-01T00:00:00.000Z",
          seen: false,
        },
        {
          id: "m2",
          type: "savings_threshold",
          payload: { threshold: 50000 },
          achievedAt: "2026-04-01T00:00:00.000Z",
          seen: true,
        },
      ],
    };
    const unseen = getUnseenMilestones(state);
    expect(unseen).toHaveLength(1);
    expect(unseen[0].id).toBe("m1");
  });

  it("handles missing milestones field gracefully", () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const state = { ...emptyState, milestones: undefined as any };
    expect(getUnseenMilestones(state)).toEqual([]);
  });
});
