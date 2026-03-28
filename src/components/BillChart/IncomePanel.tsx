"use client";

import { useState } from "react";
import type { MonthlyIncome } from "@/types";
import { toCents, fmtMoney, sumCents, calcShortfall } from "@/lib/money";
import styles from "./IncomePanel.module.css";

type Props = {
  month: string;
  income: MonthlyIncome | undefined;
  totalBillsCents: number;
  onUpdate: (income: MonthlyIncome) => void;
};

type Field = "kias_pay" | "military_pay" | "retirement" | "social_security";

const FIELDS: { key: Field; label: string }[] = [
  { key: "kias_pay", label: "Kia's Pay" },
  { key: "military_pay", label: "Military Pay" },
  { key: "retirement", label: "Retirement" },
  { key: "social_security", label: "Social Security" },
];

const FIXED_DEFAULTS: Record<Field, number> = {
  kias_pay: 0,
  military_pay: 124190,
  retirement: 33437,
  social_security: 77500,
};

function fieldCents(income: MonthlyIncome | undefined, key: Field): number {
  return income ? income[key] : FIXED_DEFAULTS[key];
}

export function IncomePanel({
  month,
  income,
  totalBillsCents,
  onUpdate,
}: Props) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Record<Field, string>>({
    kias_pay: income ? String(income.kias_pay / 100) : "",
    military_pay: String(fieldCents(income, "military_pay") / 100),
    retirement: String(fieldCents(income, "retirement") / 100),
    social_security: String(fieldCents(income, "social_security") / 100),
  });

  const totalIncomeCents = sumCents([
    fieldCents(income, "kias_pay"),
    fieldCents(income, "military_pay"),
    fieldCents(income, "retirement"),
    fieldCents(income, "social_security"),
  ]);

  const shortfall = calcShortfall(totalBillsCents, totalIncomeCents);
  const isShort = shortfall > 0;

  const handleSave = () => {
    const updated: MonthlyIncome = {
      month,
      kias_pay: toCents(draft.kias_pay),
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
            <div key={key} className={styles.editRow}>
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
            <button
              className={styles.btnGhost}
              onClick={() => setEditing(false)}
            >
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
              <span className={styles.reconLabel}>Total Bills</span>
              <span className={styles.reconValue}>
                {fmtMoney(totalBillsCents)}
              </span>
            </div>
            {FIELDS.map(({ key, label }) => {
              const val = fieldCents(income, key);
              return val > 0 ? (
                <div key={key} className={styles.reconRow}>
                  <span className={styles.reconLabel}>{label}</span>
                  <span
                    className={`${styles.reconValue} ${styles.reconIncome}`}
                  >
                    − {fmtMoney(val)}
                  </span>
                </div>
              ) : null;
            })}
          </div>
          <div className={styles.reconDivider} />
          <div className={styles.reconRow}>
            <span className={styles.reconTotalLabel}>
              {isShort ? "Short" : "Surplus"}
            </span>
            <span
              className={`${styles.reconTotalValue} ${
                isShort ? styles.reconShort : styles.reconSurplus
              }`}
            >
              {fmtMoney(Math.abs(shortfall))}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
