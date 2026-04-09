import type { AppState, Milestone, MilestoneType } from "@/types";
import { sumCents } from "@/lib/money";
import { currentMonth } from "@/lib/dates";

// Savings thresholds that trigger milestone events (cents)
const SAVINGS_THRESHOLDS = [50000, 100000, 200000]; // $500, $1000, $2000

/** Creates a stable ID for a milestone so we can detect duplicates. */
function milestoneId(type: MilestoneType, key: string): string {
  return `${type}:${key}`;
}

/**
 * Derives all milestones that should exist given the current app state.
 * Called after each state change to detect newly achieved milestones.
 *
 * Returns only NEW milestones — ones whose ID is not already in state.milestones.
 * The caller is responsible for dispatching ADD_MILESTONE for each returned item.
 */
export function deriveNewMilestones(state: AppState): Milestone[] {
  const existingIds = new Set((state.milestones ?? []).map((m) => m.id));
  const now = new Date().toISOString();
  const month = currentMonth();
  const newMilestones: Milestone[] = [];

  // ── Affirm payoff milestones ───────────────────────────────────────────────
  for (const plan of state.plans) {
    const id = milestoneId("affirm_payoff", plan.id);
    if (!existingIds.has(id) && plan.end < month) {
      // Plan has already ended — it's paid off
      newMilestones.push({
        id,
        type: "affirm_payoff",
        payload: { planId: plan.id, label: plan.label, mc: plan.mc, month: plan.end },
        achievedAt: now,
        seen: false,
      });
    }
  }

  // ── Savings threshold milestones ───────────────────────────────────────────
  const totalSaved = sumCents(state.savingsLog.map((e) => e.amount));
  for (const threshold of SAVINGS_THRESHOLDS) {
    const id = milestoneId("savings_threshold", String(threshold));
    if (!existingIds.has(id) && totalSaved >= threshold) {
      newMilestones.push({
        id,
        type: "savings_threshold",
        payload: { threshold, totalSaved },
        achievedAt: now,
        seen: false,
      });
    }
  }

  // ── Goal achieved milestones ───────────────────────────────────────────────
  for (const goal of state.goals) {
    const id = milestoneId("goal_achieved", goal.id);
    if (!existingIds.has(id) && totalSaved >= goal.targetCents) {
      newMilestones.push({
        id,
        type: "goal_achieved",
        payload: {
          goalId: goal.id,
          label: goal.label,
          targetCents: goal.targetCents,
        },
        achievedAt: now,
        seen: false,
      });
    }
  }

  // ── First surplus milestone ────────────────────────────────────────────────
  const firstSurplusId = milestoneId("first_surplus", "global");
  if (!existingIds.has(firstSurplusId)) {
    const hasAnySurplus = state.snapshots.some((s) => s.shortfall < 0);
    if (hasAnySurplus) {
      // Non-null assertion safe: `some` guard above guarantees at least one match
      const surplusSnapshot = state.snapshots.find((s) => s.shortfall < 0)!;
      newMilestones.push({
        id: firstSurplusId,
        type: "first_surplus",
        payload: {
          month: surplusSnapshot.month,
          surplusCents: Math.abs(surplusSnapshot.shortfall),
        },
        achievedAt: now,
        seen: false,
      });
    }
  }

  return newMilestones;
}

/**
 * Returns the human-readable label for a milestone type.
 */
export function getMilestoneLabel(milestone: Milestone): string {
  switch (milestone.type) {
    case "affirm_payoff": {
      const label = milestone.payload.label as string;
      return `${label} is paid off`;
    }
    case "savings_threshold": {
      const threshold = milestone.payload.threshold as number;
      return `Saved $${(threshold / 100).toFixed(0)}!`;
    }
    case "goal_achieved": {
      const label = milestone.payload.label as string;
      return `Goal achieved: ${label}`;
    }
    case "first_surplus":
      return "First month surplus!";
  }
}

/**
 * Returns unseen milestones (for toast display).
 */
export function getUnseenMilestones(state: AppState): Milestone[] {
  return (state.milestones ?? []).filter((m) => !m.seen);
}
