import React from "react";
import type { KiasCheckEntry, PaycheckColumn, PaycheckWeek } from "@/types";
import { fmtMoney, sumCents } from "@/lib/money";
import { fmtMonthFull, mondayOf } from "@/lib/dates";
import { emptyWeek } from "@/hooks/usePaycheckTabState";
import { getWeekColumnValue } from "@/lib/paycheck";
import { WeekRow } from "../WeekRow";
import styles from "./MonthBlock.module.css";

type Props = {
  month: string;
  mondays: string[];
  columns: PaycheckColumn[];
  paycheck: PaycheckWeek[];
  checkLog: KiasCheckEntry[];
  savingsByWeek: Map<string, number>;
  affirmPerWeek: number;
  affirmMonthTotal: number;
  isCollapsed: boolean;
  onToggle: () => void;
  onUpsertWeek: (week: PaycheckWeek) => void;
  onAddCheckEntry: (entry: KiasCheckEntry) => void;
  onDeleteCheckEntry: (weekOf: string) => void;
  template: PaycheckWeek | undefined;
};

/**
 * One month section in the paycheck grid (presenter).
 * Renders the collapsible month header, week rows, and monthly totals footer.
 */
export const MonthBlock = React.memo(function MonthBlock({
  month,
  mondays,
  columns,
  paycheck,
  checkLog,
  savingsByWeek,
  affirmPerWeek,
  affirmMonthTotal,
  isCollapsed,
  onToggle,
  onUpsertWeek,
  onAddCheckEntry,
  onDeleteCheckEntry,
  template,
}: Props) {
  const monthCheckEntries = checkLog
    .filter((e) => e.weekOf.startsWith(month))
    .sort((a, b) => a.weekOf.localeCompare(b.weekOf));

  const rows: { week: PaycheckWeek; displayDate: string }[] =
    monthCheckEntries.length > 0
      ? monthCheckEntries.map((entry) => {
          const monday = mondayOf(entry.weekOf);
          const week =
            paycheck.find((p) => p.weekOf === monday) ??
            emptyWeek(monday, template, entry.amount);
          return { week, displayDate: entry.weekOf };
        })
      : mondays.map((monday) => {
          const logAmount =
            checkLog.find((e) => mondayOf(e.weekOf) === monday)?.amount ?? 0;
          const week =
            paycheck.find((p) => p.weekOf === monday) ??
            emptyWeek(monday, template, logAmount);
          return { week, displayDate: monday };
        });

  // Monthly totals
  const monthKiaTotal = sumCents(rows.map((r) => r.week.kiasPay));
  const monthColTotals: Record<string, number> = {};
  for (const col of columns) {
    monthColTotals[col.key] = sumCents(
      rows.map((r) => getWeekColumnValue(r.week, col.key)),
    );
  }
  const monthSavingsTotal = sumCents([...savingsByWeek.values()]);
  const monthRemaining =
    monthKiaTotal -
    affirmMonthTotal -
    sumCents(Object.values(monthColTotals)) -
    monthSavingsTotal;

  // colspan = Week + Kia's Pay + Affirm + columns + Savings + Remaining
  const totalCols = 3 + columns.length + 2;

  return (
    <>
      <tr className={styles.monthLabelRow} onClick={onToggle}>
        <td colSpan={totalCols} className={styles.monthLabel}>
          <span className={styles.collapseIcon}>{isCollapsed ? "►" : "▼"}</span>
          {fmtMonthFull(month)}
        </td>
      </tr>

      {!isCollapsed && (
        <>
          {rows.map(({ week, displayDate }) => (
            <WeekRow
              key={week.weekOf}
              week={week}
              columns={columns}
              displayDate={displayDate}
              affirmPerWeek={affirmPerWeek}
              savingsForWeek={savingsByWeek.get(week.weekOf) ?? 0}
              onUpsertWeek={onUpsertWeek}
              onAddCheckEntry={onAddCheckEntry}
              onDeleteCheckEntry={onDeleteCheckEntry}
            />
          ))}

          <tr className={styles.monthTotalRow}>
            <td className={`${styles.monthTotalLabel} ${styles.stickyLeft}`}>
              Total
            </td>
            <td className={`${styles.td} ${styles.mono}`}>
              {fmtMoney(monthKiaTotal)}
            </td>
            <td className={`${styles.td} ${styles.mono}`}>
              {fmtMoney(affirmMonthTotal)}
            </td>
            {columns.map((col) => (
              <td key={col.key} className={`${styles.td} ${styles.mono}`}>
                {fmtMoney(monthColTotals[col.key] ?? 0)}
              </td>
            ))}
            <td className={`${styles.td} ${styles.mono}`}>
              {fmtMoney(monthSavingsTotal)}
            </td>
            <td
              className={`${styles.td} ${styles.mono} ${styles.stickyRight} ${monthRemaining < 0 ? styles.negative : styles.positive}`}
            >
              {fmtMoney(monthRemaining)}
            </td>
          </tr>
        </>
      )}
    </>
  );
});
