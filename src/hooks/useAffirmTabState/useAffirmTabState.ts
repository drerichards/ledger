import { useMemo } from "react";
import type { InstallmentPlan } from "@/types";
import { getAffirmGridMonths, getPlansEndingInMonth } from "@/lib/affirm";
import { currentMonth } from "@/lib/dates";

/**
 * Derives all computed values for the Affirm tab.
 * Pure computation — no side effects, no dispatch.
 */
export function useAffirmTabState(plans: InstallmentPlan[]) {
  return useMemo(() => {
    const now = currentMonth();
    const months = getAffirmGridMonths(plans);
    const milestonePlans = getPlansEndingInMonth(plans, now);

    return { now, months, milestonePlans };
  }, [plans]);
}
