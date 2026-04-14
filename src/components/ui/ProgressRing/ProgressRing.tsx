"use client";

import styles from "./ProgressRing.module.css";

type Props = {
  /** Fraction of completion (0–1). Values outside [0,1] are clamped. */
  ratio: number;
  /** Diameter in pixels. Default 80. */
  size?: number;
  /** Stroke width in pixels. Default 8. */
  strokeWidth?: number;
  /** Ring fill color token. Default "olive". */
  color?: "olive" | "rust" | "navy" | "gold";
  /** Optional label rendered in the center of the ring. */
  label?: string;
  /** Optional sublabel below the main label (e.g. "of goal"). */
  sublabel?: string;
};

/**
 * SVG progress ring.
 *
 * Used in Goal Setter, Savings Tracker, and Debt-Free Projection.
 * Pattern: Monarch Money / Copilot — ring, not flat bar.
 */
export function ProgressRing({
  ratio,
  size = 80,
  strokeWidth = 8,
  color = "olive",
  label,
  sublabel,
}: Props) {
  const clamped = Math.min(1, Math.max(0, ratio));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - clamped);
  const cx = size / 2;

  return (
    <div
      className={styles.root}
      style={{ width: size, height: size }}
      role="img"
      aria-label={label ? `${label}: ${Math.round(clamped * 100)}% complete` : `${Math.round(clamped * 100)}% complete`}
    >
      <svg
        className={styles.svg}
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
      >
        {/* Background track */}
        <circle
          className={styles.track}
          cx={cx}
          cy={cx}
          r={radius}
          strokeWidth={strokeWidth}
        />
        {/* Progress arc — rotated so it starts at 12 o'clock */}
        <circle
          className={`${styles.arc} ${styles[`arc_${color}`]}`}
          cx={cx}
          cy={cx}
          r={radius}
          strokeWidth={strokeWidth}
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform={`rotate(-90 ${cx} ${cx})`}
          style={
            {
              "--arc-full": circumference,
              "--arc-offset": offset,
            } as React.CSSProperties
          }
        />
      </svg>
      {(label || sublabel) && (
        <div className={styles.center}>
          {label && <span className={styles.label}>{label}</span>}
          {sublabel && <span className={styles.sublabel}>{sublabel}</span>}
        </div>
      )}
    </div>
  );
}
