"use client";

import React from "react";
import type { KiasCheckEntry, PaycheckColumn, PaycheckWeek } from "@/types";
import { fmtMoney, toCents } from "@/lib/money";
import {
  getWeekColumnValue,
  setWeekColumnValue,
  sumWeekColumns,
} from "@/lib/paycheck";
import { AmountInput } from "../AmountInput";
import styles from "./WeekAccordion.module.css";

type Props = {
  week: PaycheckWeek;
  columns: PaycheckColumn[];
  /** YYYY-MM-DD — the Monday of this week (used as the canonical key). */
  displayDate: string;
  affirmPerWeek: number;
  savingsForWeek: number;
  isExpanded: boolean;
  onToggle: () => void;
  onUpsertWeek: (week: PaycheckWeek) => void;
  onAddCheckEntry: (entry: KiasCheckEntry) => void;
  onDeleteCheckEntry: (weekOf: string) => void;
};

/**
 * One accordion row in the PaycheckTab timeline.
 *
 * Collapsed: date label + Kia's Pay (editable) + Remaining (derived).
 * Expanded: full payee field list with ghost inputs. Derived fields
 * (Affirm, Savings) are visually receded — read-only, italic label.
 */
export const WeekAccordion = React.memo(function WeekAccordion({
  week,
  columns,
  displayDate,
  affirmPerWeek,
  savingsForWeek,
  isExpanded,
  onToggle,
  onUpsertWeek,
  onAddCheckEntry,
  onDeleteCheckEntry,
}: Props) {
  const totalAllocated = sumWeekColumns(
    week,
    columns,
    affirmPerWeek,
    savingsForWeek,
  );
  const remaining = week.kiasPay - totalAllocated;

  // Label: "Apr 7" from YYYY-MM-DD (numeric Date constructor — no timezone drift)
  const [y, m, d] = displayDate.split("-").map(Number);
  const weekLabel = new Date(y, m - 1, d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });

  const updateColumn = (key: string, raw: string) => {
    onUpsertWeek(setWeekColumnValue(week, key, toCents(raw)));
  };

  const updateKiasPay = (raw: string) => {
    const cents = toCents(raw);
    onUpsertWeek({ ...week, kiasPay: cents });
    // Keep check log in sync: delete old Monday entry, add new one if non-zero
    onDeleteCheckEntry(week.weekOf);
    if (cents > 0) {
      onAddCheckEntry({ weekOf: week.weekOf, amount: cents });
    }
  };

  return (
    <div
      className={[
        styles.week,
        isExpanded ? styles.weekExpanded : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {/* ── Header — always visible ─────────────────────────────────── */}
      <div
        className={styles.header}
        onClick={onToggle}
        role="button"
        tabIndex={0}
        aria-expanded={isExpanded}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onToggle();
          }
        }}
      >
        <div className={styles.headerLeft}>
          <span className={styles.chevron} aria-hidden="true">
            {isExpanded ? "▾" : "▸"}
          </span>
          <span className={styles.date}>Week of {weekLabel}</span>
        </div>

        <div className={styles.headerRight}>
          {/* Kia's Pay — editable inline. Stop propagation so click doesn't toggle. */}
          <div
            className={styles.headerField}
            onClick={(e) => e.stopPropagation()}
          >
            <span className={styles.headerFieldLabel}>Kia&apos;s Pay</span>
            <AmountInput
              value={week.kiasPay}
              onChange={updateKiasPay}
              variant="ghost"
              highlight
            />
          </div>

          <span className={styles.fieldSep} aria-hidden="true" />

          {/* Remaining — derived, read-only */}
          <div className={styles.headerField}>
            <span className={styles.headerFieldLabel}>Remaining</span>
            <span
              className={[
                styles.remaining,
                styles.mono,
                remaining < 0
                  ? styles.negative
                  : remaining > 0
                    ? styles.positive
                    : styles.zero,
              ].join(" ")}
            >
              {fmtMoney(remaining)}
            </span>
          </div>
        </div>
      </div>

      {/* ── Body — visible when expanded ────────────────────────────── */}
      {isExpanded && (
        <div className={styles.body}>
          {/* Affirm — always first, always derived */}
          <div className={`${styles.field} ${styles.fieldDerived}`}>
            <span className={styles.fieldLabel}>Affirm</span>
            <span className={`${styles.fieldValue} ${styles.mono}`}>
              {fmtMoney(affirmPerWeek)}
            </span>
          </div>

          {/* Configurable columns: Storage, Rent, Jazmin, Dre, PayPal CC,
              Deductions — plus any user-added custom columns */}
          {columns.map((col) => (
            <div key={col.key} className={styles.field}>
              <span className={styles.fieldLabel}>{col.label}</span>
              <div className={styles.fieldRight}>
                <AmountInput
                  value={getWeekColumnValue(week, col.key)}
                  onChange={(raw) => updateColumn(col.key, raw)}
                  variant="ghost"
                />
              </div>
            </div>
          ))}

          {/* Savings — always last, always derived */}
          <div
            className={`${styles.field} ${styles.fieldDerived} ${styles.fieldDivider}`}
          >
            <span className={styles.fieldLabel}>Savings</span>
            <span className={`${styles.fieldValue} ${styles.mono}`}>
              {savingsForWeek > 0 ? fmtMoney(savingsForWeek) : "—"}
            </span>
          </div>
        </div>
      )}
    </div>
  );
});
