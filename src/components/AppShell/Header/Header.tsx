"use client";

import { useEffect, useState } from "react";
import type { Milestone } from "@/types";
import { getMilestoneLabel } from "@/lib/milestones";
import styles from "./Header.module.css";

type Props = {
  userName: string | null;
  onSignOut: () => void;
  milestones?: Milestone[];
  unseenCount?: number;
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
const THEME_KEY = "ledger-theme";

export function Header({
  userName,
  onSignOut,
  milestones = [],
  unseenCount = 0,
}: Props) {
  const greetingText = userName ? `${timeGreeting()}, ${userName}` : timeGreeting();
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    const saved = typeof window !== "undefined"
      ? window.localStorage.getItem(THEME_KEY)
      : null;
    const resolved = saved === "dark" ? "dark" : "light";
    // eslint-disable-next-line react-hooks/set-state-in-effect -- hydration-safe localStorage sync
    setTheme(resolved);
    document.documentElement.dataset.theme = resolved;
  }, []);

  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.dataset.theme = next;
    window.localStorage.setItem(THEME_KEY, next);
  };

  return (
    <header className={styles.header}>
      <div className={styles.brand}>
        <div className={styles.brandMark} aria-hidden="true">
          <svg viewBox="0 0 28 28" className={styles.brandIcon}>
            <rect x="2.5" y="4" width="9.5" height="9.5" rx="4.75" />
            <rect x="14" y="4" width="11.5" height="9.5" rx="2.4" />
            <path d="M8.4 15.2L14 24 19.6 15.2" />
          </svg>
        </div>
        <div className={styles.brandCopy}>
          <h1 className={styles.appName}>Ledger</h1>
          <span className={styles.userGreeting}>{greetingText}</span>
        </div>
      </div>

      <div className={styles.actions}>
        <div className={styles.msgWrap}>
          <button
            type="button"
            className={styles.msgBtn}
            aria-label="Messages"
          >
            <svg viewBox="0 0 24 24" className={styles.msgIcon} aria-hidden="true">
              <path d="M4 6.5h16v11H4z" />
              <path d="M5.5 8l6.5 5 6.5-5" />
            </svg>
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
          </div>
        </div>
        <button
          type="button"
          className={styles.headerAction}
          aria-label={theme === "dark" ? "Light mode" : "Dark mode"}
          onClick={toggleTheme}
        >
          {theme === "dark" ? "☀" : "☾"}
          <span className={styles.headerActionLabel}>
            {theme === "dark" ? "Light" : "Dark"}
          </span>
        </button>
        <button
          type="button"
          className={styles.headerAction}
          aria-label="Sign out"
          onClick={onSignOut}
        >
          ⇢
          <span className={styles.headerActionLabel}>Sign out</span>
        </button>
      </div>
    </header>
  );
}
