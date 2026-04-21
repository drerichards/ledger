"use client";

import type {
  Bill,
  InstallmentPlan,
  KiasCheckEntry,
  MonthlyIncome,
  MonthSnapshot,
  PaycheckWeek,
  SavingsEntry,
} from "@/types";
import { fmtMoney } from "@/lib/money";
import { fmtMonthFull } from "@/lib/dates";
import {
  getHouseholdMonthSummary,
  getMonthSnapshotFromSummary,
} from "@/lib/household/household";
import { Stat } from "@/components/ui/Stat/Stat";
import styles from "./MonthSnapshot.module.css";

type Props = {
  month: string;
  bills: Bill[];
  income: MonthlyIncome[];
  plans: InstallmentPlan[];
  savingsLog: SavingsEntry[];
  checkLog: KiasCheckEntry[];
  paycheck: PaycheckWeek[];
  /** Called when the user confirms saving the snapshot. */
  onSave: (snap: MonthSnapshot) => void;
  /** Called after save — closes the modal. */
  onClose: () => void;
};

/**
 * Month-End Snapshot content.
 *
 * Rendered inside a Modal by BillChart — does not own its own container or
 * trigger button. Computes the snapshot from current bill/income state and
 * calls onSave + onClose when the user confirms.
 */
export function MonthSnapshot({
  month,
  bills,
  income,
  plans,
  savingsLog,
  checkLog = [],
  paycheck,
  onSave,
  onClose,
}: Props) {
  const summary = getHouseholdMonthSummary({
    month,
    bills,
    income,
    paycheck,
    checkLog,
    savingsLog,
    plans,
  });
  const snapshot = getMonthSnapshotFromSummary(summary);
  const canSave = summary.totalExpenseCents > 0;

  const handleSave = () => {
    onSave(snapshot);
    onClose();
  };

  return (
    <div className={styles.content}>
      <p className={styles.intro}>
        Snapshot for <strong>{fmtMonthFull(month)}</strong>. Review the figures
        then confirm to lock in the record.
      </p>

      {!canSave && (
        <p className={styles.emptyWarning}>
          No bills have been entered for this month. Add bills before saving a snapshot.
        </p>
      )}

      <div className={styles.statsGrid}>
        <Stat label="Total Billed" value={fmtMoney(snapshot.totalBilled)} />
        <Stat label="Total Paid" value={fmtMoney(snapshot.totalPaid)} />
        <Stat
          label={snapshot.shortfall > 0 ? "Short" : "Surplus"}
          value={fmtMoney(Math.abs(snapshot.shortfall))}
          color={snapshot.shortfall > 0 ? "rust" : "olive"}
        />
        <Stat label="Moved to Savings" value={fmtMoney(snapshot.savingsMoved)} color="olive" />
        <Stat label="Kia's Pay (actual)" value={fmtMoney(snapshot.kiasPayActual)} />
      </div>

      <div className={styles.actions}>
        <button type="button" className={styles.btnGhost} onClick={onClose}>
          Cancel
        </button>
        <button
          type="button"
          className={styles.btnPrimary}
          onClick={handleSave}
          disabled={!canSave}
        >
          Confirm &amp; Save Snapshot
        </button>
      </div>
    </div>
  );
}
