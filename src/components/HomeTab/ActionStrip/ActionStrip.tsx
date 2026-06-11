"use client";

import { fmtMoney } from "@/lib/money";
import styles from "./ActionStrip.module.css";

/**
 * Three compact action cards under the verdict: the next bill to pay (with a
 * primary "Mark paid"), the next paycheck, and an overdue/this-week summary.
 * Each card has a 4px colored top border. Pure presentation — HomeTab derives
 * the figures from household helpers and owns the mark-paid dispatch.
 */

type NextBill = { id: string; name: string; cents: number };
type NextPaycheck = { whenLabel: string; cents: number };
type Overdue = { count: number; cents: number };

type Props = {
  nextBill: NextBill | null;
  nextPaycheck: NextPaycheck | null;
  overdue: Overdue;
  onMarkPaid: (id: string) => void;
};

export function ActionStrip({ nextBill, nextPaycheck, overdue, onMarkPaid }: Props) {
  const isOverdue = overdue.count > 0;

  return (
    <div className={styles.strip}>
      <div className={`${styles.card} ${styles.cardNext}`}>
        <span className={styles.label}>Next bill to pay</span>
        {nextBill ? (
          <>
            <span className={styles.title}>{nextBill.name}</span>
            <div className={styles.foot}>
              <span className={styles.amtDue}>−{fmtMoney(nextBill.cents)}</span>
              <button
                type="button"
                className={`${styles.act} ${styles.actPrimary}`}
                onClick={() => onMarkPaid(nextBill.id)}
              >
                Mark paid
              </button>
            </div>
          </>
        ) : (
          <span className={styles.title}>All bills handled ✓</span>
        )}
      </div>

      <div className={`${styles.card} ${styles.cardPayday}`}>
        <span className={styles.label}>Next paycheck</span>
        {nextPaycheck ? (
          <>
            <span className={styles.title}>{nextPaycheck.whenLabel}</span>
            <div className={styles.foot}>
              <span className={styles.amtIn}>+{fmtMoney(nextPaycheck.cents)}</span>
            </div>
          </>
        ) : (
          <span className={styles.title}>None scheduled</span>
        )}
      </div>

      <div className={`${styles.card} ${isOverdue ? styles.cardOverdue : styles.cardOk}`}>
        <span className={styles.label}>{isOverdue ? "Overdue" : "This week"}</span>
        <span className={styles.title}>
          {isOverdue
            ? `${overdue.count} bill${overdue.count === 1 ? "" : "s"} overdue`
            : "Nothing overdue"}
        </span>
        {isOverdue && (
          <div className={styles.foot}>
            <span className={styles.amtDue}>−{fmtMoney(overdue.cents)}</span>
          </div>
        )}
      </div>
    </div>
  );
}
