import { useMemo } from "react";
import type { InstallmentPlan } from "@/types";
import { getAffirmGridMonths, getAffirmTotalForMonth, getPlansEndingInMonth } from "@/lib/affirm";
import { currentMonth } from "@/lib/dates";

/**
 * Derives all computed values for the Affirm tab.
 * Pure computation — no side effects, no dispatch.
 *
 * Centralises derivation so PlanRow and AffirmTab tfoot are pure presenters
 * that receive pre-computed values rather than computing inline.
 */
export function useAffirmTabState(plans: InstallmentPlan[]) {
  return useMemo(() => {
    const now = currentMonth();
    const months = getAffirmGridMonths(plans);
    const milestonePlans = getPlansEndingInMonth(plans, now);

    // Per-plan total owed (mc × number of active months in the grid).
    // Keyed by plan id so PlanRow receives a single number prop.
    const totalOwedByPlan = new Map<string, number>(
      plans.map((p) => {
        const activeCount = months.filter((m) => p.start <= m && p.end >= m).length;
        return [p.id, p.mc * activeCount];
      }),
    );

    // Grand total owed across all plans — drives the tfoot right-most cell.
    const grandTotalOwed = plans.reduce((sum, p) => {
      return sum + totalOwedByPlan.get(p.id)!;
    }, 0);

    // Monthly column totals — drives the tfoot per-month cells.
    const monthlyTotals = new Map<string, number>(
      months.map((m) => [m, getAffirmTotalForMonth(plans, m)]),
    );

    return { now, months, milestonePlans, totalOwedByPlan, grandTotalOwed, monthlyTotals };
  }, [plans]);
}
