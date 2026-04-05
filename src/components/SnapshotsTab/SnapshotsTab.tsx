"use client";

import type { MonthSnapshot } from "@/types";
import { fmtMoney } from "@/lib/money";
import { fmtMonthFull } from "@/lib/dates";
import styles from "./SnapshotsTab.module.css";

type Props = {
  snapshots: MonthSnapshot[];
};

export function SnapshotsTab({ snapshots }: Props) {
  const sorted = [...snapshots].sort((a, b) => b.month.localeCompare(a.month));

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2 className={styles.heading}>Snapshots</h2>
        <p className={styles.subheading}>Monthly summaries saved from the Accounts tab.</p>
      </div>

      {sorted.length === 0 ? (
        <p className={styles.empty}>
          No monthly summaries yet. Use &apos;Month Summary&apos; in the Accounts tab after closing out a month.
        </p>
      ) : (
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th className={styles.th}>Month</th>
                <th className={styles.th}>Billed</th>
                <th className={styles.th}>Paid</th>
                <th className={styles.th}>Short / Surplus</th>
                <th className={styles.th}>Saved</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((snap) => {
                const isShort = snap.shortfall > 0;
                return (
                  <tr key={snap.month} className={styles.row}>
                    <td className={styles.td}>{fmtMonthFull(snap.month)}</td>
                    <td className={`${styles.td} ${styles.mono}`}>{fmtMoney(snap.totalBilled)}</td>
                    <td className={`${styles.td} ${styles.mono}`}>{fmtMoney(snap.totalPaid)}</td>
                    <td className={`${styles.td} ${styles.mono} ${isShort ? styles.rust : styles.olive}`}>
                      {isShort ? "−" : "+"}{fmtMoney(Math.abs(snap.shortfall))}
                    </td>
                    <td className={`${styles.td} ${styles.mono} ${styles.olive}`}>
                      {fmtMoney(snap.savingsMoved)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
