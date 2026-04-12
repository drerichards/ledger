"use client";

import type { Bill, KiasCheckEntry, MonthlyIncome, MonthSnapshot, SavingsEntry } from "@/types";
import { fmtMoney, sumCents, calcShortfall } from "@/lib/money";
import { fmtMonthFull } from "@/lib/dates";
import { Stat } from "@/components/ui/Stat/Stat";
import styles from "./MonthSnapshot.module.css";

type Props = {
  month: string;
  bills: Bill[];
  income: MonthlyIncome[];
  savingsLog: SavingsEntry[];
  checkLog: KiasCheckEntry[];
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
  savingsLog,
  checkLog = [],
  onSave,
  onClose,
}: Props) {
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
  const savingsMoved = sumCents(
    savingsLog
      .filter((e) => (e.date ?? e.weekOf ?? "").startsWith(month))
      .map((e) => e.amount),
  );
  const kiasPayActual = sumCents(
    checkLog.filter((e) => e.weekOf.startsWith(month)).map((e) => e.amount),
  );

  const canSave = totalBilled > 0;

  const handleSave = () => {
    onSave({ month, totalBilled, totalPaid, shortfall, savingsMoved, kiasPayActual });
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
        <Stat label="Total Billed" value={fmtMoney(totalBilled)} />
        <Stat label="Total Paid" value={fmtMoney(totalPaid)} />
        <Stat
          label={shortfall > 0 ? "Short" : "Surplus"}
          value={fmtMoney(Math.abs(shortfall))}
          color={shortfall > 0 ? "rust" : "olive"}
        />
        <Stat label="Moved to Savings" value={fmtMoney(savingsMoved)} color="olive" />
        <Stat label="Kia's Pay (actual)" value={fmtMoney(kiasPayActual)} />
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
