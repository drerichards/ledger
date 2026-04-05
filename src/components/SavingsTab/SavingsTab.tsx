"use client";

import type {
  InstallmentPlan,
  KiasCheckEntry,
  PaycheckWeek,
  SavingsEntry,
} from "@/types";
import { SavingsTracker } from "./SavingsTracker";
import { SavingsProjection } from "./SavingsProjection";
import styles from "./SavingsTab.module.css";

type Props = {
  plans: InstallmentPlan[];
  checking: KiasCheckEntry[];
  savingsLog: SavingsEntry[];
  paycheck: PaycheckWeek[];
  onAddSavings: (entry: SavingsEntry) => void;
  onUpdateSavings: (entry: SavingsEntry) => void;
  onDeleteSavings: (id: string) => void;
  /** Navigate to Paycheck tab */
  onGoToPaycheck?: () => void;
};

export function SavingsTab({
  plans,
  checking,
  savingsLog,
  paycheck,
  onAddSavings,
  onUpdateSavings,
  onDeleteSavings,
  onGoToPaycheck,
}: Props) {
  return (
    <div className={styles.container}>
      <div>
        <h2 className={styles.heading}>Savings &amp; Projections</h2>
        <p className={styles.subheading}>
          Log savings moves and see your 12-month outlook.
          {onGoToPaycheck && (
            <>
              {" "}Paycheck data is in the{" "}
              <button
                type="button"
                className={styles.tabLink}
                onClick={onGoToPaycheck}
              >
                Paycheck tab
              </button>
              .
            </>
          )}
        </p>
      </div>

      <div className={styles.panels}>
        <SavingsTracker
          log={savingsLog}
          onAdd={onAddSavings}
          onUpdate={onUpdateSavings}
          onDelete={onDeleteSavings}
        />
      </div>

      <SavingsProjection
        plans={plans}
        checkLog={checking}
        paycheck={paycheck}
      />
    </div>
  );
}
