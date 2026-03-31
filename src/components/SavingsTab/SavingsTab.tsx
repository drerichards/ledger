"use client";

import type {
  InstallmentPlan,
  KiasCheckEntry,
  PaycheckWeek,
  SavingsEntry,
} from "@/types";
import { calcCheckBaseline } from "@/lib/projection";
import { CheckLog } from "./CheckLog";
import { SavingsTracker } from "./SavingsTracker";
import { SavingsProjection } from "./SavingsProjection";
import styles from "./SavingsTab.module.css";

type Props = {
  plans: InstallmentPlan[];
  checking: KiasCheckEntry[];
  savingsLog: SavingsEntry[];
  checkLog: KiasCheckEntry[];
  paycheck: PaycheckWeek[];
  onAddCheckEntry: (entry: KiasCheckEntry) => void;
  onDeleteCheckEntry: (weekOf: string) => void;
  onAddSavings: (entry: SavingsEntry) => void;
};

export function SavingsTab({
  plans,
  checking,
  savingsLog,
  paycheck,
  onAddCheckEntry,
  onDeleteCheckEntry,
  onAddSavings,
}: Props) {
  const baseline = calcCheckBaseline(checking);

  return (
    <div className={styles.container}>
      <div>
        <h2 className={styles.heading}>Savings &amp; Projections</h2>
        <p className={styles.subheading}>
          Check Kia&apos;s checks, log savings moves, and see your 12-month
          outlook.
        </p>
      </div>

      <div className={styles.panels}>
        <CheckLog
          log={checking}
          baseline={baseline}
          onAdd={onAddCheckEntry}
          onDelete={onDeleteCheckEntry}
        />
        <SavingsTracker log={savingsLog} onAdd={onAddSavings} />
      </div>

      <SavingsProjection
        plans={plans}
        checkLog={checking}
        paycheck={paycheck}
      />
    </div>
  );
}
