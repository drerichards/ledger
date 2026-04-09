import { renderHook } from "@testing-library/react";
import { useMilestones } from "./useMilestones";
import type { AppState, Milestone } from "@/types";
import { SEED_STATE } from "@/lib/seed";

jest.mock("@/lib/dates", () => ({
  ...jest.requireActual("@/lib/dates"),
  currentMonth: jest.fn(() => "2026-04"),
}));

const PAST_PLAN = {
  id: "plan-past",
  label: "Old Phone",
  mc: 5000,
  start: "2025-01",
  end: "2026-03",
};

const baseState: AppState = {
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

describe("useMilestones", () => {
  it("calls addMilestone for newly achieved milestones", () => {
    const addMilestone = jest.fn();
    const state: AppState = { ...baseState, plans: [PAST_PLAN] };
    renderHook(() => useMilestones(state, addMilestone));
    expect(addMilestone).toHaveBeenCalledTimes(1);
    expect(addMilestone).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "affirm_payoff:plan-past",
        type: "affirm_payoff",
        seen: false,
      }),
    );
  });

  it("does not call addMilestone when milestone already exists", () => {
    const addMilestone = jest.fn();
    const existingMilestone: Milestone = {
      id: "affirm_payoff:plan-past",
      type: "affirm_payoff",
      payload: {},
      achievedAt: "2026-04-01T00:00:00Z",
      seen: true,
    };
    const state: AppState = {
      ...baseState,
      plans: [PAST_PLAN],
      milestones: [existingMilestone],
    };
    renderHook(() => useMilestones(state, addMilestone));
    expect(addMilestone).not.toHaveBeenCalled();
  });

  it("does not call addMilestone when no milestones are derived", () => {
    const addMilestone = jest.fn();
    renderHook(() => useMilestones(baseState, addMilestone));
    expect(addMilestone).not.toHaveBeenCalled();
  });

  it("calls addMilestone for savings threshold milestone", () => {
    const addMilestone = jest.fn();
    const state: AppState = {
      ...baseState,
      savingsLog: [{ id: "s1", date: "2026-04-01", amount: 55000 }],
    };
    renderHook(() => useMilestones(state, addMilestone));
    expect(addMilestone).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "savings_threshold:50000",
        type: "savings_threshold",
      }),
    );
  });
});
