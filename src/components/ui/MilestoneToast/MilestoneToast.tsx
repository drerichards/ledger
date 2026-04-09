"use client";

import { useEffect, useState } from "react";
import type { Milestone } from "@/types";
import { getMilestoneLabel } from "@/lib/milestones";
import styles from "./MilestoneToast.module.css";

type Props = {
  milestones: Milestone[];
  onDismiss: (id: string) => void;
};

const MILESTONE_EMOJI: Record<string, string> = {
  affirm_payoff: "🎉",
  savings_threshold: "💰",
  goal_achieved: "✅",
  first_surplus: "📈",
};

/**
 * Ephemeral toast that surfaces unseen milestones one at a time.
 * Auto-dismisses after 6 seconds. Dismissed milestones are marked as seen.
 *
 * `dismissingId` tracks which milestone is in the CSS fade-out phase.
 * When it matches `current.id`, the toast renders as hidden (exiting animation).
 * When a new milestone arrives with a different ID, it renders as visible automatically.
 */
export function MilestoneToast({ milestones, onDismiss }: Props) {
  const [dismissingId, setDismissingId] = useState<string | null>(null);

  const current = milestones[0] ?? null;
  const isExiting = current !== null && dismissingId === current.id;

  const startDismiss = (id: string) => {
    setDismissingId(id);
    setTimeout(() => onDismiss(id), 300);
  };

  // Auto-dismiss timer — only runs when we have a non-exiting milestone
  useEffect(() => {
    if (!current || isExiting) return;
    const id = current.id;
    const timer = setTimeout(() => startDismiss(id), 6000);
    return () => clearTimeout(timer);
  }, [current?.id, isExiting]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!current) return null;

  const emoji = MILESTONE_EMOJI[current.type] ?? "🏆";
  const label = getMilestoneLabel(current);

  return (
    <div
      className={`${styles.toast} ${isExiting ? styles.toastHidden : styles.toastVisible}`}
      role="status"
      aria-live="polite"
    >
      <span className={styles.emoji}>{emoji}</span>
      <span className={styles.label}>{label}</span>
      <button
        type="button"
        className={styles.close}
        onClick={() => startDismiss(current.id)}
        aria-label="Dismiss notification"
      >
        ×
      </button>
    </div>
  );
}
