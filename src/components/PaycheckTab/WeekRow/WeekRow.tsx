import React from "react";
import type { KiasCheckEntry, PaycheckColumn, PaycheckWeek } from "@/types";
import { fmtMoney, toCents } from "@/lib/money";
import {
  getWeekColumnValue,
  setWeekColumnValue,
  sumWeekColumns,
} from "@/lib/paycheck";
import { AmountInput } from "../AmountInput";
import styles from "./WeekRow.module.css";

type Props = {
  week: PaycheckWeek;
  columns: PaycheckColumn[];
  displayDate: string;
  affirmPerWeek: number;
  savingsForWeek: number;
  onUpsertWeek: (week: PaycheckWeek) => void;
  onAddCheckEntry: (entry: KiasCheckEntry) => void;
  onDeleteCheckEntry: (weekOf: string) => void;
};

/**
 * One week row in the paycheck grid (presenter + local edit state).
 * Renders Kia's Pay, Affirm (derived), configurable middle columns, Savings (derived), Remaining.
 */
export const WeekRow = React.memo(function WeekRow({
  week,
  columns,
  displayDate,
  affirmPerWeek,
  savingsForWeek,
  onUpsertWeek,
  onAddCheckEntry,
  onDeleteCheckEntry,
}: Props) {
  const updateColumn = (key: string, raw: string) => {
    const cents = toCents(raw);
    const updated = setWeekColumnValue(week, key, cents);
    onUpsertWeek(updated);
  };

  const updateKiasPay = (raw: string) => {
    const cents = toCents(raw);
    const updated = { ...week, kiasPay: cents };
    onUpsertWeek(updated);
    onDeleteCheckEntry(week.weekOf);
    if (cents > 0) {
      onAddCheckEntry({ weekOf: week.weekOf, amount: cents });
    }
  };

  const totalAllocated = sumWeekColumns(week, columns, affirmPerWeek, savingsForWeek);
  const remaining = week.kiasPay - totalAllocated;

  const weekLabel = new Date(displayDate + "T12:00:00").toLocaleDateString(
    "en-US",
    { month: "numeric", day: "numeric" },
  );

  return (
    <tr className={styles.row}>
      {/* ── Week date — sticky left ──────────────────────────────────────── */}
      <td className={`${styles.td} ${styles.tdWeek} ${styles.stickyLeft}`}>
        <span className={styles.weekLabel}>{weekLabel}</span>
      </td>

      {/* ── Kia's Pay — editable ─────────────────────────────────────────── */}
      <td className={styles.td}>
        <AmountInput
          value={week.kiasPay}
          onChange={updateKiasPay}
          highlight
        />
      </td>

      {/* ── Affirm — derived, read-only ──────────────────────────────────── */}
      <td className={`${styles.td} ${styles.tdDerived}`}>
        <span className={styles.mono}>{fmtMoney(affirmPerWeek)}</span>
      </td>

      {/* ── Configurable middle columns ───────────────────────────────────── */}
      {columns.map((col) => (
        <td key={col.key} className={styles.td}>
          <AmountInput
            value={getWeekColumnValue(week, col.key)}
            onChange={(raw) => updateColumn(col.key, raw)}
          />
        </td>
      ))}

      {/* ── Savings — derived from savings log ───────────────────────────── */}
      <td className={`${styles.td} ${styles.tdDerived}`}>
        <span className={styles.mono}>
          {savingsForWeek > 0 ? (
            fmtMoney(savingsForWeek)
          ) : (
            <span className={styles.zero}>—</span>
          )}
        </span>
      </td>

      {/* ── Remaining — sticky right ──────────────────────────────────────── */}
      <td
        className={`${styles.td} ${styles.tdRemaining} ${styles.stickyRight} ${remaining < 0 ? styles.negative : styles.positive}`}
      >
        {fmtMoney(remaining)}
      </td>
    </tr>
  );
});
