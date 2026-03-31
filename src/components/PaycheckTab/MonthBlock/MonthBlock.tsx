import React from "react";
import type { KiasCheckEntry, PaycheckWeek } from "@/types";
import { fmtMoney, sumCents } from "@/lib/money";
import { fmtMonthFull, mondayOf } from "@/lib/dates";
import { emptyWeek } from "@/hooks/usePaycheckTabState";
import { WeekRow, CATEGORIES } from "../WeekRow";
import type { CategoryKey } from "../WeekRow";
import styles from "./MonthBlock.module.css";

type Props = {
  month: string;
  mondays: string[];
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
  const monthCatTotals = CATEGORIES.reduce(
    (acc, c) => {
      acc[c.key] = sumCents(rows.map((r) => r.week[c.key]));
      return acc;
    },
    {} as Record<CategoryKey, number>,
  );
  const monthSavingsTotal = sumCents([...savingsByWeek.values()]);
  const monthPayLeft =
    monthKiaTotal -
    affirmMonthTotal -
    sumCents(Object.values(monthCatTotals)) -
    monthSavingsTotal;

  return (
    <>
      <tr
        className={styles.monthLabelRow}
        onClick={onToggle}
        style={{ cursor: "pointer" }}
      >
        <td colSpan={3 + CATEGORIES.length + 2} className={styles.monthLabel}>
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
              displayDate={displayDate}
              affirmPerWeek={affirmPerWeek}
              savingsForWeek={savingsByWeek.get(week.weekOf) ?? 0}
              onUpsertWeek={onUpsertWeek}
              onAddCheckEntry={onAddCheckEntry}
              onDeleteCheckEntry={onDeleteCheckEntry}
            />
          ))}

          <tr className={styles.monthTotalRow}>
            <td className={styles.monthTotalLabel}>Total</td>
            <td className={`${styles.td} ${styles.mono}`}>
              {fmtMoney(monthKiaTotal)}
            </td>
            <td className={`${styles.td} ${styles.mono}`}>
              {fmtMoney(affirmMonthTotal)}
            </td>
            {CATEGORIES.map((c) => (
              <td key={c.key} className={`${styles.td} ${styles.mono}`}>
                {fmtMoney(monthCatTotals[c.key])}
              </td>
            ))}
            <td className={`${styles.td} ${styles.mono}`}>
              {fmtMoney(monthSavingsTotal)}
            </td>
            <td
              className={`${styles.td} ${styles.mono} ${monthPayLeft < 0 ? styles.negative : styles.positive}`}
            >
              {fmtMoney(monthPayLeft)}
            </td>
          </tr>
        </>
      )}
    </>
  );
});
