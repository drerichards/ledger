"use client";

import styles from "./DateToggle.module.css";

type Props = {
  label: string;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
  canPrev?: boolean;
  canNext?: boolean;
  prevAriaLabel?: string;
  nextAriaLabel?: string;
};

export function DateToggle({
  label,
  onPrev,
  onNext,
  onToday,
  canPrev = true,
  canNext = true,
  prevAriaLabel = "Previous period",
  nextAriaLabel = "Next period",
}: Props) {
  return (
    <div className={styles.root}>
      <button
        className={styles.btn}
        onClick={onPrev}
        disabled={!canPrev}
        aria-label={prevAriaLabel}
      >
        ‹
      </button>
      <button className={styles.btn} onClick={onToday}>
        Today
      </button>
      <button
        className={styles.btn}
        onClick={onNext}
        disabled={!canNext}
        aria-label={nextAriaLabel}
      >
        ›
      </button>
      <span className={styles.label}>{label}</span>
    </div>
  );
}
