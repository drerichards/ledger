"use client";

import { useState } from "react";
import type { KiasCheckEntry } from "@/types";
import type { CheckBaseline } from "@/lib/projection";
import { fmtMoney, toCents } from "@/lib/money";
import { today } from "@/lib/dates";
import styles from "./PaycheckTab.module.css";

type Props = {
  log: KiasCheckEntry[];
  baseline: CheckBaseline | null;
  onAdd: (entry: KiasCheckEntry) => void;
  onDelete: (weekOf: string) => void;
};

export function CheckLog({ log, baseline, onAdd, onDelete }: Props) {
  const [amtStr, setAmtStr] = useState("");

  const handleAdd = () => {
    const cents = toCents(amtStr);
    if (cents <= 0) return;
    onAdd({ weekOf: today(), amount: cents });
    setAmtStr("");
  };

  const recent = [...log].reverse();

  return (
    <div className={styles.panel}>
      <h3 className={styles.panelTitle}>Kia&apos;s Check Log</h3>

      {baseline && (
        <div className={styles.baselineRow}>
          <Stat label="Average" value={fmtMoney(baseline.average)} />
          <Stat label="Low" value={fmtMoney(baseline.low)} />
          <Stat label="High" value={fmtMoney(baseline.high)} />
          <Stat label="Samples" value={String(baseline.sampleSize)} />
        </div>
      )}

      <div className={styles.addRow}>
        <input
          className={styles.panelInput}
          value={amtStr}
          onChange={(e) => setAmtStr(e.target.value)}
          placeholder="Enter check amount"
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
        />
        <button className={styles.btnPrimary} onClick={handleAdd}>
          Log
        </button>
      </div>

      {recent.length > 0 && (
        <div className={styles.logList}>
          {recent.map((e, i) => (
            <div key={i} className={styles.logRow}>
              <span className={styles.logDate}>{e.weekOf}</span>
              <span className={styles.mono}>{fmtMoney(e.amount)}</span>
              <button
                className={styles.btnDanger}
                onClick={() => onDelete(e.weekOf)}
                aria-label="Delete entry"
              >
                Del
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className={styles.stat}>
      <span className={styles.statLabel}>{label}</span>
      <span className={styles.statValue}>{value}</span>
    </div>
  );
}
