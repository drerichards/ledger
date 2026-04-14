"use client";

import { HeaderMenu } from "./HeaderMenu/HeaderMenu";
import type { Milestone } from "@/types";
import { getMilestoneLabel } from "@/lib/milestones";
import styles from "./Header.module.css";

type Props = {
  userName: string | null;
  onSignOut: () => void;
  onResetToSeed?: () => void;
  milestones?: Milestone[];
  unseenCount?: number;
  onGoToActivity?: () => void;
};

function timeGreeting(): string {
  const h = new Date().getHours();
  if (h >= 5 && h < 12) return "Good morning";
  if (h >= 12 && h < 17) return "Good afternoon";
  if (h >= 17 && h < 21) return "Good evening";
  return "Good night";
}

const MILESTONE_EMOJI: Record<string, string> = {
  affirm_payoff: "🎉",
  savings_threshold: "💰",
  goal_achieved: "✅",
  first_surplus: "📈",
};

export function Header({
  userName,
  onSignOut,
  onResetToSeed,
  milestones = [],
  unseenCount = 0,
  onGoToActivity,
}: Props) {
  return (
    <header className={styles.header}>
      <div className={styles.brand}>
        <h1 className={styles.appName}>Ledger</h1>
        <p className={styles.appSubtitle}>Household Finance Tracker</p>
      </div>

      <div className={styles.actions}>
        {/* ── Message icon + hover panel ───────────────────── */}
        <div className={styles.msgWrap}>
          <button
            type="button"
            className={styles.msgBtn}
            aria-label="Messages"
            onClick={onGoToActivity}
          >
            ✉
            {unseenCount > 0 && (
              <span className={styles.msgBadge} aria-label={`${unseenCount} unread`}>
                {unseenCount}
              </span>
            )}
          </button>
          <div className={styles.msgPanel}>
            <div className={styles.msgPanelHead}>
              <span className={styles.msgPanelTitle}>Last 24 hrs</span>
            </div>
            {milestones.length === 0 ? (
              <p className={styles.msgPanelEmpty}>No new messages</p>
            ) : (
              <ul className={styles.msgPanelList}>
                {milestones.map((m) => (
                  <li key={m.id} className={styles.msgPanelRow}>
                    <span className={styles.msgPanelEmoji}>
                      {MILESTONE_EMOJI[m.type] ?? "🏆"}
                    </span>
                    <span className={styles.msgPanelText}>
                      {getMilestoneLabel(m)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <button
              type="button"
              className={styles.msgPanelCta}
              onClick={onGoToActivity}
            >
              View all in Activity →
            </button>
          </div>
        </div>

        {userName && (
          <span className={styles.userName}>
            {timeGreeting()}, {userName}
          </span>
        )}
        <HeaderMenu
          onSignOut={onSignOut}
          onResetToSeed={onResetToSeed}
        />
      </div>
    </header>
  );
}
