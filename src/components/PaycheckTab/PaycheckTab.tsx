"use client";

import { useState } from "react";
import type {
  InstallmentPlan,
  KiasCheckEntry,
  PaycheckViewScope,
  PaycheckWeek,
  SavingsEntry,
} from "@/types";
import { getAffirmTotalForMonth } from "@/lib/affirm";
import { fmtMoney, sumCents, toCents } from "@/lib/money";
import {
  currentMonth,
  fmtMonthFull,
  getMondaysInMonth,
  advanceMonth,
} from "@/lib/dates";
import { calcCheckBaseline } from "@/lib/projection";
import { generateId } from "@/lib/id";
import { CheckLog } from "./CheckLog";
import { SavingsTracker } from "./SavingsTracker";
import { SavingsProjection } from "./SavingsProjection";
import styles from "./PaycheckTab.module.css";

type Props = {
  paycheck: PaycheckWeek[];
  plans: InstallmentPlan[];
  checkLog: KiasCheckEntry[];
  savingsLog: SavingsEntry[];
  viewScope: PaycheckViewScope;
  onUpsertWeek: (week: PaycheckWeek) => void;
  onAddCheckEntry: (entry: KiasCheckEntry) => void;
  onAddSavings: (entry: SavingsEntry) => void;
  onSetViewScope: (scope: PaycheckViewScope) => void;
};

const SCOPES: { id: PaycheckViewScope; label: string }[] = [
  { id: "weekly", label: "Week" },
  { id: "monthly", label: "Month" },
  { id: "quarterly", label: "Quarter" },
  { id: "yearly", label: "Year" },
];

/** Fixed paycheck categories in the order they appear as columns. */
const CATEGORIES = [
  { key: "storage", label: "Storage" },
  { key: "rent", label: "Rent" },
  { key: "jazmin", label: "Jazmin" },
  { key: "dre", label: "Dre" },
  { key: "savings", label: "Savings" },
  { key: "paypalCC", label: "PayPal CC" },
  { key: "deductions", label: "Deductions" },
] as const;

type CategoryKey = (typeof CATEGORIES)[number]["key"];

export function PaycheckTab({
  paycheck,
  plans,
  checkLog,
  savingsLog,
  viewScope,
  onUpsertWeek,
  onAddCheckEntry,
  onAddSavings,
  onSetViewScope,
}: Props) {
  const [currentMonthStr, setCurrentMonthStr] = useState(currentMonth);

  // Derive the months shown based on the view scope
  const visibleMonths = getVisibleMonths(currentMonthStr, viewScope);

  // All Mondays across all visible months
  const allWeeks = visibleMonths.flatMap((m) =>
    getMondaysInMonth(m).map((weekOf) => weekOf),
  );

  const baseline = calcCheckBaseline(checkLog);

  return (
    <div className={styles.container}>
      {/* ── Header ────────────────────────────────────────────────── */}
      <div className={styles.header}>
        <div>
          <h2 className={styles.heading}>
            {viewScope === "weekly" || viewScope === "monthly"
              ? fmtMonthFull(currentMonthStr)
              : viewScope === "quarterly"
                ? `${fmtMonthFull(currentMonthStr)} — Q`
                : "Year View"}
          </h2>
          <p className={styles.subheading}>
            Plan this month&apos;s checks to cover next month&apos;s bills
          </p>
        </div>

        {/* Navigation + scope toggle */}
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
              onClick={() => setCurrentMonthStr(currentMonth())}
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
              <th scope="col" className={`${styles.th} ${styles.thPay}`}>
                Pay Left
              </th>
            </tr>
          </thead>

          <tbody>
            {visibleMonths.map((month) => {
              const mondays = getMondaysInMonth(month);
              const affirmTotal = getAffirmTotalForMonth(plans, month);
              // Split Affirm evenly across weeks — not stored, derived
              const affirmPerWeek =
                mondays.length > 0
                  ? Math.round(affirmTotal / mondays.length)
                  : 0;

              return (
                <MonthBlock
                  key={month}
                  month={month}
                  mondays={mondays}
                  paycheck={paycheck}
                  affirmPerWeek={affirmPerWeek}
                  affirmMonthTotal={affirmTotal}
                  onUpsertWeek={onUpsertWeek}
                  onAddCheckEntry={onAddCheckEntry}
                />
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ── Bottom panels ─────────────────────────────────────────── */}
      <div className={styles.panels}>
        <CheckLog log={checkLog} baseline={baseline} onAdd={onAddCheckEntry} />
        <SavingsTracker log={savingsLog} onAdd={onAddSavings} />
      </div>

      <SavingsProjection
        plans={plans}
        checkLog={checkLog}
        paycheck={paycheck}
      />
    </div>
  );
}

// ─── Month Block ──────────────────────────────────────────────────────────────

function MonthBlock({
  month,
  mondays,
  paycheck,
  affirmPerWeek,
  affirmMonthTotal,
  onUpsertWeek,
  onAddCheckEntry,
}: {
  month: string;
  mondays: string[];
  paycheck: PaycheckWeek[];
  affirmPerWeek: number;
  affirmMonthTotal: number;
  onUpsertWeek: (week: PaycheckWeek) => void;
  onAddCheckEntry: (entry: KiasCheckEntry) => void;
}) {
  // Monthly totals for footer
  const monthWeeks = mondays.map(
    (w) => paycheck.find((p) => p.weekOf === w) ?? emptyWeek(w),
  );
  const monthKiaTotal = sumCents(monthWeeks.map((w) => w.kiasPay));
  const monthCatTotals = CATEGORIES.reduce(
    (acc, c) => {
      acc[c.key] = sumCents(monthWeeks.map((w) => w[c.key]));
      return acc;
    },
    {} as Record<CategoryKey, number>,
  );
  const monthPayLeft =
    monthKiaTotal - affirmMonthTotal - sumCents(Object.values(monthCatTotals));

  return (
    <>
      {/* Month label row */}
      <tr className={styles.monthLabelRow}>
        <td colSpan={3 + CATEGORIES.length + 1} className={styles.monthLabel}>
          {fmtMonthFull(month)}
        </td>
      </tr>

      {/* Week rows */}
      {mondays.map((weekOf) => {
        const week =
          paycheck.find((p) => p.weekOf === weekOf) ?? emptyWeek(weekOf);
        return (
          <WeekRow
            key={weekOf}
            week={week}
            affirmPerWeek={affirmPerWeek}
            onUpsertWeek={onUpsertWeek}
            onAddCheckEntry={onAddCheckEntry}
          />
        );
      })}

      {/* Monthly totals footer */}
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
        <td
          className={`${styles.td} ${styles.mono} ${monthPayLeft < 0 ? styles.negative : styles.positive}`}
        >
          {fmtMoney(monthPayLeft)}
        </td>
      </tr>
    </>
  );
}

// ─── Week Row ─────────────────────────────────────────────────────────────────

function WeekRow({
  week,
  affirmPerWeek,
  onUpsertWeek,
  onAddCheckEntry,
}: {
  week: PaycheckWeek;
  affirmPerWeek: number;
  onUpsertWeek: (week: PaycheckWeek) => void;
  onAddCheckEntry: (entry: KiasCheckEntry) => void;
}) {
  const updateField = (key: CategoryKey | "kiasPay", raw: string) => {
    const cents = toCents(raw);
    const updated = { ...week, [key]: cents };
    onUpsertWeek(updated);
    // Log Kia's pay entry automatically when she enters it
    if (key === "kiasPay" && cents > 0) {
      onAddCheckEntry({ weekOf: week.weekOf, amount: cents });
    }
  };

  const totalAllocated =
    affirmPerWeek + sumCents(CATEGORIES.map((c) => week[c.key]));
  const payLeft = week.kiasPay - totalAllocated;

  const weekLabel = new Date(week.weekOf + "T12:00:00").toLocaleDateString(
    "en-US",
    {
      month: "numeric",
      day: "numeric",
    },
  );

  return (
    <tr className={`${styles.row} ${week.rentWeek ? styles.rowRentWeek : ""}`}>
      {/* Week date */}
      <td className={`${styles.td} ${styles.tdWeek}`}>
        <span className={styles.weekLabel}>{weekLabel}</span>
        {week.rentWeek && <span className={styles.rentTag}>RENT</span>}
      </td>

      {/* Kia's pay — editable */}
      <td className={styles.td}>
        <AmountInput
          value={week.kiasPay}
          onChange={(raw) => updateField("kiasPay", raw)}
          highlight
        />
      </td>

      {/* Affirm — derived, not editable */}
      <td className={`${styles.td} ${styles.tdAfirm}`}>
        <span className={styles.mono}>{fmtMoney(affirmPerWeek)}</span>
      </td>

      {/* Category cells — editable */}
      {CATEGORIES.map((c) => (
        <td key={c.key} className={styles.td}>
          <AmountInput
            value={week[c.key]}
            onChange={(raw) => updateField(c.key, raw)}
          />
        </td>
      ))}

      {/* Pay left — calculated */}
      <td
        className={`${styles.td} ${styles.tdPayLeft} ${payLeft < 0 ? styles.negative : styles.positive}`}
      >
        {fmtMoney(payLeft)}
      </td>
    </tr>
  );
}

// ─── Amount Input ─────────────────────────────────────────────────────────────

function AmountInput({
  value,
  onChange,
  highlight = false,
}: {
  value: number;
  onChange: (raw: string) => void;
  highlight?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [raw, setRaw] = useState("");

  const handleFocus = () => {
    setEditing(true);
    setRaw(value > 0 ? (value / 100).toFixed(2) : "");
  };

  const handleBlur = () => {
    setEditing(false);
    onChange(raw);
  };

  return editing ? (
    <input
      className={`${styles.amountInput} ${highlight ? styles.amountInputHighlight : ""}`}
      value={raw}
      onChange={(e) => setRaw(e.target.value)}
      onBlur={handleBlur}
      autoFocus
      placeholder="0.00"
    />
  ) : (
    <span
      className={`${styles.amountDisplay} ${highlight ? styles.amountDisplayHighlight : ""} ${styles.mono}`}
      onClick={handleFocus}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && handleFocus()}
    >
      {value > 0 ? fmtMoney(value) : <span className={styles.zero}>—</span>}
    </span>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function emptyWeek(weekOf: string): PaycheckWeek {
  return {
    weekOf,
    kiasPay: 0,
    storage: 0,
    rent: 0,
    rentWeek: false,
    jazmin: 0,
    dre: 0,
    savings: 0,
    paypalCC: 0,
    deductions: 0,
  };
}

function getVisibleMonths(from: string, scope: PaycheckViewScope): string[] {
  switch (scope) {
    case "weekly":
    case "monthly":
      return [from];
    case "quarterly":
      return [from, advanceMonth(from, 1), advanceMonth(from, 2)];
    case "yearly":
      return Array.from({ length: 12 }, (_, i) => advanceMonth(from, i));
  }
}
