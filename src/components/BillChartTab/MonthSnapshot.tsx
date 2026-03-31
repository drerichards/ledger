"use client";

import { useState } from "react";
import type { Bill, KiasCheckEntry, MonthlyIncome, MonthSnapshot, SavingsEntry } from "@/types";
import { fmtMoney, sumCents, calcShortfall } from "@/lib/money";
import { fmtMonthFull } from "@/lib/dates";
import styles from "./MonthSnapshot.module.css";

type Props = {
  month: string;
  bills: Bill[];
  income: MonthlyIncome[];
  savingsLog: SavingsEntry[];
  checkLog: KiasCheckEntry[];
  onSave: (snap: MonthSnapshot) => void;
};

export function MonthSnapshot({
  month,
  bills,
  income,
  savingsLog,
  checkLog = [],
  onSave,
}: Props) {
  const [confirming, setConfirming] = useState(false);
  const monthBills = bills.filter((b) => b.month === month);
  const thisMonthIncome = income.find((i) => i.month === month);
  const totalBilled = sumCents(monthBills.map((b) => b.cents));
  const totalPaid = sumCents(monthBills.filter((b) => b.paid).map((b) => b.cents));
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

  // Kia's actual pay this month — sum of checkLog entries for this month
  const kiasPayActual = sumCents(
    checkLog.filter((e) => e.weekOf.startsWith(month)).map((e) => e.amount),
  );

  const handleClose = () => {
    const snap: MonthSnapshot = {
      month,
      totalBilled,
      totalPaid,
      shortfall,
      savingsMoved,
      kiasPayActual,
    };
    onSave(snap);
    setConfirming(false);
  };

  return (
    <div className={styles.container}>
      {/* Saving a snapshot is optional and does not trigger month rollover.
          Rollover is handled separately by the Bill Chart month nav bar. */}
      <div className={styles.header}>
        <h3 className={styles.title}>Month-End Snapshot</h3>
        {!confirming && (
          <button
            className={styles.btnPrimary}
            onClick={() => setConfirming(true)}
          >
            Save Month Summary
          </button>
        )}
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
            <Stat
              label="Kia's Pay (actual)"
              value={fmtMoney(kiasPayActual)}
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
