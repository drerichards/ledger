import type { SavingsGoal } from "@/types";
import { advanceMonth, currentMonth } from "@/lib/dates";

/** Status of a savings goal relative to current savings balance. */
export type GoalStatus = "on_track" | "behind" | "achieved";

/** Derived metrics for a single savings goal. */
export type GoalMetrics = {
  /** Monthly amount that needs to be saved to hit the target on time (cents). */
  monthlyContributionNeeded: number;
  /** Number of months remaining until targetDate. 0 = this month or past. */
  monthsRemaining: number;
  /** Fraction of goal completed (0–1). Derived from currentSavedCents / targetCents. */
  progressRatio: number;
  status: GoalStatus;
};

/**
 * Returns the number of months from the current month to targetDate (inclusive).
 * Returns 0 if targetDate is in the past or current month.
 */
export function monthsUntil(targetDate: string): number {
  const now = currentMonth();
  if (targetDate <= now) return 0;

  // Parse YYYY-MM strings as integers to avoid Date objects
  const [ny, nm] = now.split("-").map(Number);
  const [ty, tm] = targetDate.split("-").map(Number);
  return (ty - ny) * 12 + (tm - nm);
}

/**
 * Calculates derived metrics for a goal given the user's current savings balance.
 * All amounts in cents.
 */
export function calcGoalMetrics(
  goal: SavingsGoal,
  currentSavedCents: number,
): GoalMetrics {
  const remaining = Math.max(0, goal.targetCents - currentSavedCents);
  const progressRatio =
    goal.targetCents > 0
      ? Math.min(1, currentSavedCents / goal.targetCents)
      : 0;

  if (remaining === 0) {
    return {
      monthlyContributionNeeded: 0,
      monthsRemaining: 0,
      progressRatio: 1,
      status: "achieved",
    };
  }

  const monthsRemaining = monthsUntil(goal.targetDate);

  const monthlyContributionNeeded =
    monthsRemaining > 0 ? Math.ceil(remaining / monthsRemaining) : remaining;

  // "On track" if the user needs to save no more than the current month's target
  // or if monthly contribution is feasible given what they've already saved.
  const status: GoalStatus =
    monthsRemaining > 0
      ? progressRatio >= monthsUntilProgress(goal)
        ? "on_track"
        : "behind"
      : "behind";

  return {
    monthlyContributionNeeded,
    monthsRemaining,
    progressRatio,
    status,
  };
}

/**
 * The expected progress ratio if contributions were perfectly evenly spaced.
 * e.g. if 3 of 12 months have passed, expected ratio = 0.25.
 */
function monthsUntilProgress(goal: SavingsGoal): number {
  // Total months from creation to target
  const createdMonth = goal.createdAt.slice(0, 7); // YYYY-MM from ISO datetime
  const [cy, cm] = createdMonth.split("-").map(Number);
  const [ty, tm] = goal.targetDate.split("-").map(Number);
  const totalMonths = (ty - cy) * 12 + (tm - cm);
  if (totalMonths <= 0) return 1;

  const elapsed = totalMonths - monthsUntil(goal.targetDate);
  return elapsed / totalMonths;
}

/**
 * Returns the month strings representing the next N months starting from current.
 * Used for projecting future savings contributions.
 */
export function getGoalMonths(goal: SavingsGoal): string[] {
  const months = monthsUntil(goal.targetDate);
  if (months <= 0) return [];
  return Array.from({ length: months }, (_, i) =>
    advanceMonth(currentMonth(), i),
  );
}
