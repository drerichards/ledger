import { useMemo } from "react";
import type { AppNotification, InstallmentPlan } from "@/types";
import { currentMonth } from "@/lib/dates";

/**
 * Derives payoff notifications from the active Affirm plan list.
 *
 * A notification is generated for every plan whose final payment month (end)
 * is on or before the current month — meaning the plan has been paid off.
 * Results are sorted newest-first (most recently paid off at top).
 *
 * Notifications are deterministic and derived — only the seen state
 * (seenNotificationIds in AppState) needs to be persisted.
 */
export function useAffirmNotifications(plans: InstallmentPlan[]): AppNotification[] {
  return useMemo(() => {
    const now = currentMonth();
    return plans
      .filter((p) => p.end <= now)
      .map((p) => ({
        id: `${p.id}-payoff`,
        planId: p.id,
        planLabel: p.label,
        month: p.end,
        mc: p.mc,
      }))
      .sort((a, b) => b.month.localeCompare(a.month));
  }, [plans]);
}
