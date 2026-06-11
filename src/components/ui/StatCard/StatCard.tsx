import React from "react";
import styles from "./StatCard.module.css";

type SubRow = { label: string; value: string };

type Props = {
  label: string;
  /** Primary value — omit when using subRows instead. */
  value?: string;
  color?: "navy" | "olive" | "rust" | "gold";
  /** Renders a two-column breakdown instead of a single value. */
  subRows?: SubRow[];
  /** Progress bar fill 0–100. Renders a thin bar below the value. */
  progress?: number;
};

/**
 * Reusable summary card used in the Bill Chart header row.
 * Supports both a single value and a split sub-row layout.
 */
export const StatCard = React.memo(function StatCard({
  label,
  value,
  color,
  subRows,
  progress,
}: Props) {
  const colorClass = color ? styles[`card_${color}`] : "";

  return (
    <div className={`${styles.card} ${colorClass}`}>
      <span className={styles.label}>{label}</span>

      {subRows ? (
        subRows.map((row) => (
          <div key={row.label} className={styles.subRow}>
            <span className={styles.subLabel}>{row.label}</span>
            <span className={styles.value}>{row.value}</span>
          </div>
        ))
      ) : (
        <span className={styles.value}>{value}</span>
      )}
      {progress !== undefined && (
        <div className={styles.progressTrack}>
          <div
            className={styles.progressFill}
            style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
          />
        </div>
      )}
    </div>
  );
});
