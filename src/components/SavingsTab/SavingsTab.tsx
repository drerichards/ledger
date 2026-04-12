"use client";

import { useState } from "react";
import type {
  InstallmentPlan,
  KiasCheckEntry,
  PaycheckWeek,
  SavingsEntry,
  SavingsGoal,
} from "@/types";
import { SavingsTracker } from "./SavingsTracker";
import { SavingsProjection } from "./SavingsProjection";
import { PayeeReductionPlanner } from "./PayeeReductionPlanner";
import { GoalSetter } from "./GoalSetter";
import styles from "./SavingsTab.module.css";

type Section = "savings" | "debt" | "projection";

const SECTIONS: { id: Section; label: string }[] = [
  { id: "savings",    label: "Savings" },
  { id: "debt",       label: "Debt" },
  { id: "projection", label: "Projection" },
];

type Props = {
  plans: InstallmentPlan[];
  checking: KiasCheckEntry[];
  savingsLog: SavingsEntry[];
  paycheck: PaycheckWeek[];
  goals: SavingsGoal[];
  onAddSavings: (entry: SavingsEntry) => void;
  onUpdateSavings: (entry: SavingsEntry) => void;
  onDeleteSavings: (id: string) => void;
  onAddGoal: (goal: SavingsGoal) => void;
  onDeleteGoal: (id: string) => void;
  /** Navigate to Paycheck tab */
  onGoToPaycheck?: () => void;
};

export function SavingsTab({
  plans,
  checking,
  savingsLog,
  paycheck,
  goals,
  onAddSavings,
  onUpdateSavings,
  onDeleteSavings,
  onAddGoal,
  onDeleteGoal,
  onGoToPaycheck,
}: Props) {
  const [section, setSection] = useState<Section>("savings");

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

      <div className={styles.sectionNav}>
        {SECTIONS.map((s) => (
          <button
            key={s.id}
            type="button"
            className={`${styles.sectionPill} ${section === s.id ? styles.sectionPillActive : ""}`}
            onClick={() => setSection(s.id)}
          >
            {s.label}
          </button>
        ))}
      </div>

      {section === "savings" && (
        <div className={styles.panels}>
          <SavingsTracker
            log={savingsLog}
            onAdd={onAddSavings}
            onUpdate={onUpdateSavings}
            onDelete={onDeleteSavings}
          />
          <GoalSetter
            goals={goals}
            savingsLog={savingsLog}
            onAdd={onAddGoal}
            onDelete={onDeleteGoal}
          />
        </div>
      )}

      {section === "debt" && (
        <PayeeReductionPlanner plans={plans} />
      )}

      {section === "projection" && (
        <SavingsProjection
          plans={plans}
          checkLog={checking}
          paycheck={paycheck}
        />
      )}
    </div>
  );
}
