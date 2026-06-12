"use client";

import styles from "./GaugeMeter.module.css";

/**
 * One semicircular gauge: a half-circle arc (radius 56, stroke 12, rounded
 * caps) that fills to `value` (0–1), with a dot riding the fill endpoint.
 * Used three-up inside MomentumGauges. Pure presentation.
 */

export type GaugeTone = "olive" | "amber" | "rust" | "navy";

type Props = {
  value: number; // 0..1
  tone: GaugeTone;
  big: string; // center value, e.g. "9/13"
  label: string; // e.g. "Bills handled"
  tag: string; // e.g. "ON TRACK"
  onClick?: () => void; // when set, the gauge becomes a clickable button
};

const CX = 70;
const CY = 78;
const R = 56;
const ARC_LEN = Math.PI * R; // half-circle length

const TONE_CLASS: Record<GaugeTone, string> = {
  olive: styles.toneOlive,
  amber: styles.toneAmber,
  rust: styles.toneRust,
  navy: styles.toneNavy,
};

export function GaugeMeter({ value, tone, big, label, tag, onClick }: Props) {
  const v = Math.max(0, Math.min(1, value));
  const theta = Math.PI * (1 - v); // π (left) → 0 (right)
  const dotX = CX + R * Math.cos(theta);
  const dotY = CY - R * Math.sin(theta);
  const dash = `${v * ARC_LEN} ${ARC_LEN}`;

  const inner = (
    <>
      <svg viewBox="0 0 140 88" className={styles.svg} role="img" aria-label={`${label}: ${big}`}>
        <path d="M 14 78 A 56 56 0 0 1 126 78" className={styles.track} strokeWidth={12} fill="none" />
        <path
          d="M 14 78 A 56 56 0 0 1 126 78"
          className={`${styles.fill} ${TONE_CLASS[tone]}`}
          strokeWidth={12}
          fill="none"
          strokeDasharray={dash}
        />
        <circle cx={dotX} cy={dotY} r={4} className={`${styles.dot} ${TONE_CLASS[tone]}`} />
        <text x={CX} y={68} className={styles.big} textAnchor="middle">
          {big}
        </text>
      </svg>
      <p className={styles.label}>{label}</p>
      {tag && <span className={`${styles.tag} ${TONE_CLASS[tone]}`}>{tag}</span>}
    </>
  );

  if (onClick) {
    return (
      <button type="button" className={`${styles.gauge} ${styles.gaugeClickable}`} onClick={onClick}>
        {inner}
      </button>
    );
  }
  return <div className={styles.gauge}>{inner}</div>;
}
