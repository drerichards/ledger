"use client";

import { useState } from "react";
import type { SavingsEntry } from "@/types";
import { fmtMoney, sumCents, toCents } from "@/lib/money";
import { today } from "@/lib/dates";
import { LogRow } from "@/components/ui/LogRow";
import styles from "./SavingsTracker.module.css";

type Props = {
  log: SavingsEntry[];
  onAdd: (entry: SavingsEntry) => void;
};

export function SavingsTracker({ log, onAdd }: Props) {
  const [amtStr, setAmtStr] = useState("");

  const handleAdd = () => {
    const cents = toCents(amtStr);
    if (cents <= 0) return;
    onAdd({ weekOf: today(), amount: cents });
    setAmtStr("");
  };

  const runningTotal = sumCents(log.map((e) => e.amount));
  const recent = [...log].reverse().slice(0, 6);

  return (
    <div className={styles.panel}>
      <h3 className={styles.panelTitle}>Savings Balance</h3>

      <div className={styles.savingsTotal}>{fmtMoney(runningTotal)}</div>

      <div className={styles.addRow}>
        <input
          className={styles.panelInput}
          value={amtStr}
          onChange={(e) => setAmtStr(e.target.value)}
          placeholder="Amount moved to savings"
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
        />
        <button className={styles.btnOlive} onClick={handleAdd}>
          + Save
        </button>
      </div>

      {recent.length > 0 && (
        <div className={styles.logList}>
          {recent.map((e, i) => (
            <LogRow
              key={i}
              date={e.weekOf}
              value={`+ ${fmtMoney(e.amount)}`}
              variant="savings"
            />
          ))}
        </div>
      )}
    </div>
  );
}
