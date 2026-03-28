"use client";

import { useState } from "react";
import type { Bill, MonthlyIncome, MonthSnapshot, SavingsEntry } from "@/types";
import { fmtMoney, sumCents, calcShortfall } from "@/lib/money";
import { currentMonth, fmtMonthFull } from "@/lib/dates";
import { generateId } from "@/lib/id";
import { today } from "@/lib/dates";
import styles from "./MonthSnapshot.module.css";

type Props = {
  bills: Bill[];
  income: MonthlyIncome[];
  savingsLog: SavingsEntry[];
  snapshots: MonthSnapshot[];
  onSave: (snap: MonthSnapshot) => void;
};

export function MonthSnapshot({
  bills,
  income,
  savingsLog,
  snapshots,
  onSave,
}: Props) {
  const [confirming, setConfirming] = useState(false);

  const month = currentMonth();
  const thisMonthIncome = income.find((i) => i.month === month);
  const totalBilled = sumCents(bills.map((b) => b.cents));
  const totalPaid = sumCents(bills.filter((b) => b.paid).map((b) => b.cents));
  const totalIncome = thisMonthIncome
    ? sumCents([
        thisMonthIncome.kias_pay,
        thisMonthIncome.military_pay,
        thisMonthIncome.retirement,
        thisMonthIncome.social_security,
      ])
    : 0;
  const shortfall = calcShortfall(totalBilled, totalIncome);

  // Savings moved this month — sum entries from this month only
  const savingsMoved = sumCents(
    savingsLog.filter((e) => e.weekOf.startsWith(month)).map((e) => e.amount),
  );

  const existingSnap = snapshots.find((s) => s.month === month);

  const handleClose = () => {
    const snap: MonthSnapshot = {
      month,
      totalBilled,
      totalPaid,
      shortfall,
      savingsMoved,
    };
    onSave(snap);
    setConfirming(false);
  };

  const sorted = [...snapshots].sort((a, b) => b.month.localeCompare(a.month));

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h3 className={styles.title}>Month-End Snapshot</h3>
        <button
          className={styles.btnPrimary}
          onClick={() => setConfirming(true)}
        >
          Close Out {fmtMonthFull(month)}
        </button>
      </div>

      {/* Confirmation panel */}
      {confirming && (
        <div className={styles.confirmation}>
          <p className={styles.confirmHeading}>
            This will save a snapshot of {fmtMonthFull(month)}.
          </p>
          <div className={styles.confirmStats}>
            <Stat label="Total Billed" value={fmtMoney(totalBilled)} />
            <Stat label="Total Paid" value={fmtMoney(totalPaid)} />
            <Stat
              label={shortfall > 0 ? "Short" : "Surplus"}
              value={fmtMoney(Math.abs(shortfall))}
              color={shortfall > 0 ? "rust" : "olive"}
            />
            <Stat
              label="Moved to Savings"
              value={fmtMoney(savingsMoved)}
              color="olive"
            />
          </div>
          <div className={styles.confirmActions}>
            <button
              className={styles.btnGhost}
              onClick={() => setConfirming(false)}
            >
              Cancel
            </button>
            <button className={styles.btnPrimary} onClick={handleClose}>
              Confirm & Save Snapshot
            </button>
          </div>
        </div>
      )}

      {/* Snapshot history */}
      {sorted.length > 0 && (
        <div className={styles.history}>
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
                    <td className={`${styles.td} ${styles.mono}`}>
                      {fmtMoney(snap.totalBilled)}
                    </td>
                    <td className={`${styles.td} ${styles.mono}`}>
                      {fmtMoney(snap.totalPaid)}
                    </td>
                    <td
                      className={`${styles.td} ${styles.mono} ${isShort ? styles.rust : styles.olive}`}
                    >
                      {isShort ? "−" : "+"}
                      {fmtMoney(Math.abs(snap.shortfall))}
                    </td>
                    <td
                      className={`${styles.td} ${styles.mono} ${styles.olive}`}
                    >
                      {fmtMoney(snap.savingsMoved)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {sorted.length === 0 && !confirming && (
        <p className={styles.empty}>
          No snapshots yet. Close out a month to start your history.
        </p>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color?: "rust" | "olive";
}) {
  return (
    <div className={styles.stat}>
      <span className={styles.statLabel}>{label}</span>
      <span className={`${styles.statValue} ${color ? styles[color] : ""}`}>
        {value}
      </span>
    </div>
  );
}
