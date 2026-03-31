"use client";

import { useState } from "react";
import type {
  InstallmentPlan,
  KiasCheckEntry,
  PaycheckViewScope,
  PaycheckWeek,
  SavingsEntry,
} from "@/types";
import { currentMonth, fmtMonthFull, advanceMonth } from "@/lib/dates";
import {
  usePaycheckTabState,
  getVisibleMonths,
} from "@/hooks/usePaycheckTabState";
import { CATEGORIES } from "./WeekRow";
import { MonthBlock } from "./MonthBlock";
import styles from "./PaycheckTab.module.css";

type Props = {
  paycheck: PaycheckWeek[];
  checkLog: KiasCheckEntry[];
  savingsLog: SavingsEntry[];
  plans: InstallmentPlan[];
  viewScope: PaycheckViewScope;
  onUpsertWeek: (week: PaycheckWeek) => void;
  onAddCheckEntry: (entry: KiasCheckEntry) => void;
  onDeleteCheckEntry: (weekOf: string) => void;
  onSetViewScope: (scope: PaycheckViewScope) => void;
};

const SCOPES: { id: PaycheckViewScope; label: string }[] = [
  { id: "weekly", label: "Week" },
  { id: "monthly", label: "Month" },
  { id: "quarterly", label: "Quarter" },
  { id: "yearly", label: "Year" },
];

export function PaycheckTab({
  paycheck,
  checkLog,
  savingsLog,
  plans,
  viewScope,
  onUpsertWeek,
  onAddCheckEntry,
  onDeleteCheckEntry,
  onSetViewScope,
}: Props) {
  const [currentMonthStr, setCurrentMonthStr] = useState(() =>
    advanceMonth(currentMonth(), 1),
  );
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const visibleMonths = getVisibleMonths(currentMonthStr, viewScope);
  const { template, monthData } = usePaycheckTabState(
    paycheck,
    checkLog,
    savingsLog,
    plans,
    visibleMonths,
  );

  const toggleMonth = (month: string) =>
    setCollapsed((prev) => ({ ...prev, [month]: !prev[month] }));

  const headingLabel =
    viewScope === "weekly" || viewScope === "monthly"
      ? fmtMonthFull(currentMonthStr)
      : viewScope === "quarterly"
        ? `${fmtMonthFull(currentMonthStr)} — Q`
        : "Year View";

  return (
    <div className={styles.container}>
      {/* ── Header ────────────────────────────────────────────────── */}
      <div className={styles.header}>
        <div>
          <h2 className={styles.heading}>{headingLabel}</h2>
          <p className={styles.subheading}>
            Plan this month&apos;s checks to cover next month&apos;s bills
          </p>
        </div>

        <div className={styles.controls}>
          <div className={styles.nav}>
            <button
              className={styles.navBtn}
              onClick={() => setCurrentMonthStr((m) => advanceMonth(m, -1))}
              aria-label="Previous"
            >
              ‹
            </button>
            <button
              className={styles.navBtn}
              onClick={() => setCurrentMonthStr(advanceMonth(currentMonth(), 1))}
            >
              Today
            </button>
            <button
              className={styles.navBtn}
              onClick={() => setCurrentMonthStr((m) => advanceMonth(m, 1))}
              aria-label="Next"
            >
              ›
            </button>
          </div>

          <div className={styles.scopeToggle}>
            {SCOPES.map((s) => (
              <button
                key={s.id}
                className={`${styles.scopeBtn} ${viewScope === s.id ? styles.scopeBtnActive : ""}`}
                onClick={() => onSetViewScope(s.id)}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Paycheck Grid ─────────────────────────────────────────── */}
      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th scope="col" className={`${styles.th} ${styles.thWeek}`}>
                Week
              </th>
              <th scope="col" className={`${styles.th} ${styles.thKias}`}>
                Kia&apos;s Pay
              </th>
              <th scope="col" className={styles.th}>
                Affirm
              </th>
              {CATEGORIES.map((c) => (
                <th key={c.key} scope="col" className={styles.th}>
                  {c.label}
                </th>
              ))}
              <th scope="col" className={styles.th}>
                Savings
              </th>
              <th scope="col" className={`${styles.th} ${styles.thPay}`}>
                Pay Left
              </th>
            </tr>
          </thead>

          <tbody>
            {monthData.map((data) => (
              <MonthBlock
                key={data.month}
                month={data.month}
                mondays={data.mondays}
                paycheck={paycheck}
                checkLog={checkLog}
                savingsByWeek={data.savingsByWeek}
                affirmPerWeek={data.affirmPerWeek}
                affirmMonthTotal={data.affirmTotal}
                isCollapsed={!!collapsed[data.month]}
                onToggle={() => toggleMonth(data.month)}
                onUpsertWeek={onUpsertWeek}
                onAddCheckEntry={onAddCheckEntry}
                onDeleteCheckEntry={onDeleteCheckEntry}
                template={template}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
