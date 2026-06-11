"use client";

import { useState } from "react";
import type { MonthlyIncome } from "@/types";
import { toCents, fmtMoney, sumCents, calcShortfall } from "@/lib/money";
import { INCOME_DEFAULTS } from "@/lib/income";
import styles from "./IncomePanel.module.css";

type Props = {
  month: string;
  income: MonthlyIncome | undefined;
  kiasPayCents: number;
  totalExpenseCents: number;
  weeksEntered?: number;
  onUpdate: (income: MonthlyIncome) => void;
  /** Stacks edit form fields vertically — use when rendered in a narrow rail. */
  compact?: boolean;
};

type Field = "military_pay" | "retirement" | "social_security";

const FIELDS: { key: Field; label: string }[] = [
  { key: "military_pay", label: "Military Pay" },
  { key: "retirement", label: "Retirement" },
  { key: "social_security", label: "Social Security" },
];

function fieldCents(income: MonthlyIncome | undefined, key: Field): number {
  return income ? income[key] : INCOME_DEFAULTS[key];
}

export function IncomePanel({
  month,
  income,
  kiasPayCents,
  totalExpenseCents,
  weeksEntered,
  onUpdate,
  compact = false,
}: Props) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Record<Field, string>>({
    military_pay: String(fieldCents(income, "military_pay") / 100),
    retirement: String(fieldCents(income, "retirement") / 100),
    social_security: String(fieldCents(income, "social_security") / 100),
  });

  // Shortfall is only against fixed "Other Income" sources — military pay,
  // retirement, social security. Kia's pay covers a separate bill group
  // (kias_pay) and must never enter this calculation or the math is wrong.
  const otherIncomeCents = sumCents([
    fieldCents(income, "military_pay"),
    fieldCents(income, "retirement"),
    fieldCents(income, "social_security"),
  ]);

  const totalIncomeCents = kiasPayCents + otherIncomeCents;
  const shortfall = calcShortfall(totalExpenseCents, totalIncomeCents);
  const isShort = shortfall > 0;
  const statusTitle = isShort ? "Needs coverage" : "Covered this month";
  const statusLine = isShort
    ? `${fmtMoney(shortfall)} still needs to be covered`
    : `${fmtMoney(Math.abs(shortfall))} left after bills`;

  const handleSave = () => {
    const updated: MonthlyIncome = {
      month,
      kias_pay: kiasPayCents,
      military_pay: toCents(draft.military_pay),
      retirement: toCents(draft.retirement),
      social_security: toCents(draft.social_security),
    };
    onUpdate(updated);
    setEditing(false);
  };

  return (
    <div className={styles.panel}>
      <div className={styles.panelHeader}>
        <h3 className={styles.panelTitle}>Income & Reconciliation</h3>
        {!editing && (
          <button className={styles.editBtn} onClick={() => setEditing(true)}>
            Edit Income
          </button>
        )}
      </div>

      {editing ? (
        <div className={styles.editForm}>
          {FIELDS.map(({ key, label }) => (
            <div key={key} className={compact ? styles.editRowStacked : styles.editRow}>
              <label className={styles.editLabel} htmlFor={`income-${key}`}>
                {label}
              </label>
              <input
                id={`income-${key}`}
                className={styles.editInput}
                value={draft[key]}
                onChange={(e) =>
                  setDraft((prev) => ({ ...prev, [key]: e.target.value }))
                }
                placeholder="0.00"
              />
            </div>
          ))}
          <div className={styles.editActions}>
            <button className={styles.btnGhost} onClick={() => setEditing(false)}>
              Cancel
            </button>
            <button className={styles.btnPrimary} onClick={handleSave}>
              Save
            </button>
          </div>
        </div>
      ) : (
        <div className={styles.reconciliation}>
          <div className={styles.reconciliationRows}>
            <div className={styles.reconRow}>
              <span className={styles.reconLabel}>Total Obligations</span>
              <span className={styles.reconValue}>{fmtMoney(totalExpenseCents)}</span>
            </div>
            {kiasPayCents > 0 && (
              <div className={styles.reconRow}>
                <span className={styles.reconLabel}>Kia&apos;s Pay</span>
                <span className={`${styles.reconValue} ${styles.reconIncome}`}>
                  − {fmtMoney(kiasPayCents)}
                </span>
              </div>
            )}
            {otherIncomeCents > 0 && (
              <div className={styles.reconSubhead}>Fixed Income</div>
            )}
            {FIELDS.map(({ key, label }) => {
              const val = fieldCents(income, key);
              return val > 0 ? (
                <div key={key} className={styles.reconRow}>
                  <span className={styles.reconLabel}>{label}</span>
                  <span className={`${styles.reconValue} ${styles.reconIncome}`}>
                    − {fmtMoney(val)}
                  </span>
                </div>
              ) : null;
            })}
            {typeof weeksEntered === "number" && (
              <div className={styles.reconRow}>
                <span className={styles.reconLabel}>Weeks Entered</span>
                <span className={styles.reconValue}>{weeksEntered}</span>
              </div>
            )}
          </div>
          <div className={styles.reconDivider} />
          <div className={styles.reconRow}>
            <span className={styles.reconTotalLabel}>Total Income</span>
            <span className={`${styles.reconTotalValue} ${styles.reconSurplus}`}>
              {fmtMoney(totalIncomeCents)}
            </span>
          </div>
          <div className={styles.reconRow}>
            <span className={styles.reconTotalLabel}>
              {isShort ? "Gap" : "Surplus"}
            </span>
            <span
              className={`${styles.reconTotalValue} ${
                isShort ? styles.reconShort : styles.reconSurplus
              }`}
            >
              {fmtMoney(Math.abs(shortfall))}
            </span>
          </div>
          <div className={`${styles.statusCard} ${isShort ? styles.statusCardWarn : styles.statusCardOk}`}>
            <p className={styles.statusEyebrow}>{statusTitle}</p>
            <p className={styles.statusHeadline}>{statusLine}</p>
            <div className={styles.statusStats}>
              <span className={styles.statusStat}>
                <strong>{weeksEntered ?? 0}</strong> weeks entered
              </span>
              <span className={styles.statusStat}>
                <strong>{fmtMoney(kiasPayCents)}</strong>&nbsp;from Kia&apos;s Pay
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
