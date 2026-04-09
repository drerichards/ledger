import { useEffect } from "react";
import type { AppState, Milestone } from "@/types";
import { deriveNewMilestones } from "@/lib/milestones";

/**
 * Watches relevant AppState slices and dispatches ADD_MILESTONE
 * for any newly achieved milestones not yet in state.
 *
 * Called in AppShell after every state change.
 * The reducer deduplicates by ID so double-firing is safe.
 */
export function useMilestones(
  state: AppState,
  addMilestone: (m: Milestone) => void,
): void {
  const { plans, savingsLog, goals, snapshots, milestones } = state;

  useEffect(() => {
    const newOnes = deriveNewMilestones(state);
    for (const m of newOnes) {
      addMilestone(m);
    }
    // Intentionally depend on the slices that affect milestone derivation,
    // not the full state object (avoids infinite re-derive on milestone additions).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plans, savingsLog, goals, snapshots, milestones]);
}
