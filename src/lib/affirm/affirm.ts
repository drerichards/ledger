import type { InstallmentPlan } from "@/types";
import { getMonthRange } from "@/lib/dates";
import { sumCents } from "@/lib/money";

/**
 * Returns the total Affirm payment owed in a given month (YYYY-MM).
 * Derived from active plans — not stored directly.
 * Feeds into Tab 1 (bill list line item) and Tab 3 (paycheck Affirm column).
 */
export function getAffirmTotalForMonth(
  plans: InstallmentPlan[],
  month: string,
): number {
  const activePlans = plans.filter((p) => p.start <= month && p.end >= month);
  return sumCents(activePlans.map((p) => p.mc));
}

/**
 * Returns the full month range covered by all plans combined.
 * Determines how many columns the Affirm grid renders.
 * Returns empty array if there are no plans.
 */
export function getAffirmGridMonths(plans: InstallmentPlan[]): string[] {
  if (plans.length === 0) return [];

  const starts = plans.map((p) => p.start).sort();
  const ends = plans.map((p) => p.end).sort();

  return getMonthRange(starts[0], ends[ends.length - 1]);
}

/** Returns true if the given month is the final payment month for a plan. */
export function isFinalMonth(plan: InstallmentPlan, month: string): boolean {
  return plan.end === month;
}

/**
 * Returns plans whose final payment falls in the given month.
 * Used to generate payoff milestone callouts.
 */
export function getPlansEndingInMonth(
  plans: InstallmentPlan[],
  month: string,
): InstallmentPlan[] {
  return plans.filter((p) => p.end === month);
}
