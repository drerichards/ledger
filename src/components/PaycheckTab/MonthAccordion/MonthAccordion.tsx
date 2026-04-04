"use client";

import React, { useState } from "react";
import type { KiasCheckEntry, PaycheckColumn, PaycheckWeek } from "@/types";
import { fmtMoney, sumCents } from "@/lib/money";
import { fmtMonthFull, getMondaysInMonth, mondayOf } from "@/lib/dates";
import { getWeekColumnValue } from "@/lib/paycheck";
import { emptyWeek } from "@/hooks/usePaycheckTabState";
import { WeekAccordion } from "../WeekAccordion";
import styles from "./MonthAccordion.module.css";

type Props = {
  month: string; // YYYY-MM
  columns: PaycheckColumn[];
  paycheck: PaycheckWeek[];
  checkLog: KiasCheckEntry[];
  savingsByWeek: Map<string, number>;
  affirmPerWeek: number;
  affirmMonthTotal: number;
  /** The Monday of the current real-world week — auto-expanded on mount. */
  currentWeekOf: string;
  /** Controlled by PaycheckTab — collapses the entire month block. */
  isCollapsed: boolean;
  onToggle: () => void;
  onUpsertWeek: (week: PaycheckWeek) => void;
  onAddCheckEntry: (entry: KiasCheckEntry) => void;
  onDeleteCheckEntry: (weekOf: string) => void;
  template: PaycheckWeek | undefined;
};

/**
 * One month group in the accordion timeline.
 *
 * Collapsed: navy header bar showing month + running totals.
 * Expanded: all week rows as WeekAccordion items.
 *
 * Week expand/collapse state is managed internally.
 * Month collapse state is controlled by the parent (PaycheckTab).
 */
export const MonthAccordion = React.memo(function MonthAccordion({
  month,
  columns,
  paycheck,
  checkLog,
  savingsByWeek,
  affirmPerWeek,
  affirmMonthTotal,
  currentWeekOf,
  isCollapsed,
  onToggle,
  onUpsertWeek,
  onAddCheckEntry,
  onDeleteCheckEntry,
  template,
}: Props) {
  const mondays = getMondaysInMonth(month);

  // Auto-expand the current week if it lives in this month
  const [expandedWeeks, setExpandedWeeks] = useState<Set<string>>(() => {
    const initial = new Set<string>();
    if (mondays.includes(currentWeekOf)) {
      initial.add(currentWeekOf);
    }
    return initial;
  });

  const toggleWeek = (monday: string) => {
    setExpandedWeeks((prev) => {
      const next = new Set(prev);
      if (next.has(monday)) {
        next.delete(monday);
      } else {
        next.add(monday);
      }
      return next;
    });
  };

  // Build week rows from mondays — always Monday-based regardless of check log
  const rows = mondays.map((monday) => {
    // Pull Kia's pay from check log (supports both Friday- and Monday-keyed entries)
    const logAmount =
      checkLog.find((e) => mondayOf(e.weekOf) === monday)?.amount ?? 0;
    const week =
      paycheck.find((p) => p.weekOf === monday) ??
      emptyWeek(monday, template, logAmount);
    return { week, monday };
  });

  // Monthly totals
  const monthKiaTotal = sumCents(rows.map((r) => r.week.kiasPay));
  const monthSavingsTotal = sumCents([...savingsByWeek.values()]);
  const monthColAllocated = sumCents(
    rows.flatMap((r) => columns.map((col) => getWeekColumnValue(r.week, col.key))),
  );
  const monthRemaining =
    monthKiaTotal - affirmMonthTotal - monthColAllocated - monthSavingsTotal;

  return (
    <div className={styles.monthBlock}>
      {/* ── Month header ───────────────────────────────────────────── */}
      <div
        className={styles.monthHeader}
        onClick={onToggle}
        role="button"
        tabIndex={0}
        aria-expanded={!isCollapsed}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onToggle();
          }
        }}
      >
        <div className={styles.monthHeaderLeft}>
          <span className={styles.chevron} aria-hidden="true">
            {isCollapsed ? "▸" : "▾"}
          </span>
          <span className={styles.monthLabel}>{fmtMonthFull(month)}</span>
          <span className={styles.weekCount}>
            {mondays.length} week{mondays.length !== 1 ? "s" : ""}
          </span>
        </div>

        <div className={styles.monthHeaderRight}>
          <span className={styles.monthStat}>
            <span className={styles.monthStatLabel}>Kia&apos;s Pay</span>
            <span className={`${styles.monthStatValue} ${styles.mono}`}>
              {monthKiaTotal > 0 ? fmtMoney(monthKiaTotal) : "—"}
            </span>
          </span>
          <span className={styles.monthStatSep} aria-hidden="true" />
          <span className={styles.monthStat}>
            <span className={styles.monthStatLabel}>Remaining</span>
            <span
              className={[
                styles.monthStatValue,
                styles.mono,
                monthKiaTotal > 0
                  ? monthRemaining < 0
                    ? styles.negative
                    : styles.positive
                  : styles.muted,
              ].join(" ")}
            >
              {monthKiaTotal > 0 ? fmtMoney(monthRemaining) : "—"}
            </span>
          </span>
        </div>
      </div>

      {/* ── Week rows ──────────────────────────────────────────────── */}
      {!isCollapsed && (
        <div className={styles.weeks}>
          {rows.map(({ week, monday }) => (
            <WeekAccordion
              key={monday}
              week={week}
              columns={columns}
              displayDate={monday}
              affirmPerWeek={affirmPerWeek}
              savingsForWeek={savingsByWeek.get(monday) ?? 0}
              isExpanded={expandedWeeks.has(monday)}
              onToggle={() => toggleWeek(monday)}
              onUpsertWeek={onUpsertWeek}
              onAddCheckEntry={onAddCheckEntry}
              onDeleteCheckEntry={onDeleteCheckEntry}
            />
          ))}

          {/* Month totals footer */}
          <div className={styles.monthTotals}>
            <span className={styles.monthTotalsLabel}>
              {fmtMonthFull(month)} total
            </span>
            <div className={styles.monthTotalsRight}>
              <span className={styles.monthTotalsStat}>
                <span className={styles.monthTotalsStatLabel}>
                  Kia&apos;s Pay
                </span>
                <span className={`${styles.monthTotalsStatValue} ${styles.mono}`}>
                  {fmtMoney(monthKiaTotal)}
                </span>
              </span>
              <span className={styles.monthTotalsStatSep} aria-hidden="true" />
              <span className={styles.monthTotalsStat}>
                <span className={styles.monthTotalsStatLabel}>Affirm</span>
                <span className={`${styles.monthTotalsStatValue} ${styles.mono}`}>
                  {fmtMoney(affirmMonthTotal)}
                </span>
              </span>
              <span className={styles.monthTotalsStatSep} aria-hidden="true" />
              <span className={styles.monthTotalsStat}>
                <span className={styles.monthTotalsStatLabel}>Remaining</span>
                <span
                  className={[
                    styles.monthTotalsStatValue,
                    styles.mono,
                    monthRemaining < 0 ? styles.negative : styles.positive,
                  ].join(" ")}
                >
                  {fmtMoney(monthRemaining)}
                </span>
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});
