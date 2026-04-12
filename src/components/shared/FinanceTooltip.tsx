"use client";

import styles from "./FinanceTooltip.module.css";

type Entry = {
  name?: string;
  value?: number | string;
  color?: string;
};

type Props = {
  active?: boolean;
  payload?: Entry[];
  label?: string;
  fmtValue?: (v: number) => string;
};

export function FinanceTooltip({ active, payload, label, fmtValue = String }: Props) {
  if (!active || !payload?.length) return null;

  return (
    <div className={styles.tooltip}>
      <p className={styles.month}>{label ?? ""}</p>
      {payload.map((entry, i) => (
        <div key={entry.name ?? i} className={styles.row}>
          <span className={styles.dot} style={{ background: entry.color }} />
          <span className={styles.name}>{entry.name}</span>
          <span className={styles.value}>{fmtValue(Number(entry.value ?? 0))}</span>
        </div>
      ))}
    </div>
  );
}
