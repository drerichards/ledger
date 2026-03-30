"use client";

import { useState } from "react";
import type {
  InstallmentPlan,
  KiasCheckEntry,
  PaycheckViewScope,
  PaycheckWeek,
  SavingsEntry,
} from "@/types";
import { mondayOf } from "@/lib/dates";
import { getAffirmTotalForMonth } from "@/lib/affirm";
import { fmtMoney, sumCents, toCents } from "@/lib/money";
import {
  currentMonth,
  fmtMonthFull,
  getMondaysInMonth,
  advanceMonth,
} from "@/lib/dates";
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

/** Fixed paycheck categories in the order they appear as columns. */
const CATEGORIES = [
  { key: "storage", label: "Storage" },
  { key: "rent", label: "Rent" },
  { key: "jazmin", label: "Jazmin" },
  { key: "dre", label: "Dre" },
  { key: "paypalCC", label: "PayPal CC" },
  { key: "deductions", label: "Deductions" },
] as const;

type CategoryKey = (typeof CATEGORIES)[number]["key"];

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
  const [currentMonthStr, setCurrentMonthStr] = useState(() => advanceMonth(currentMonth(), 1));
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const template = [...paycheck].sort((a, b) => b.weekOf.localeCompare(a.weekOf))[0];

  const toggleMonth = (month: string) =>
    setCollapsed((prev) => ({ ...prev, [month]: !prev[month] }));

  // Derive the months shown based on the view scope
  const visibleMonths = getVisibleMonths(currentMonthStr, viewScope);

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
                  checkLog={checkLog}
                  savingsLog={savingsLog}
                  affirmPerWeek={affirmPerWeek}
                  affirmMonthTotal={affirmTotal}
                  isCollapsed={!!collapsed[month]}
                  onToggle={() => toggleMonth(month)}
                  onUpsertWeek={onUpsertWeek}
                  onAddCheckEntry={onAddCheckEntry}
                  onDeleteCheckEntry={onDeleteCheckEntry}
                  template={template}
                />
              );
            })}
          </tbody>
        </table>
      </div>

    </div>
  );
}

// ─── Month Block ──────────────────────────────────────────────────────────────

function MonthBlock({
  month,
  mondays,
  paycheck,
  checkLog,
  savingsLog,
  affirmPerWeek,
  affirmMonthTotal,
  isCollapsed,
  onToggle,
  onUpsertWeek,
  onAddCheckEntry,
  onDeleteCheckEntry,
  template,
}: {
  month: string;
  mondays: string[];
  paycheck: PaycheckWeek[];
  checkLog: KiasCheckEntry[];
  savingsLog: SavingsEntry[];
  affirmPerWeek: number;
  affirmMonthTotal: number;
  isCollapsed: boolean;
  onToggle: () => void;
  onUpsertWeek: (week: PaycheckWeek) => void;
  onAddCheckEntry: (entry: KiasCheckEntry) => void;
  onDeleteCheckEntry: (weekOf: string) => void;
  template: PaycheckWeek | undefined;
}) {
  // If check log has entries for this month, use them as rows (shows actual payday dates).
  // Otherwise fall back to Monday-anchored weeks.
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

  // Build per-week savings map from savingsLog (actual date → its Monday)
  const savingsByWeek = new Map<string, number>();
  savingsLog
    .filter((e) => e.weekOf.startsWith(month))
    .forEach((e) => {
      const monday = mondayOf(e.weekOf);
      savingsByWeek.set(monday, (savingsByWeek.get(monday) ?? 0) + e.amount);
    });

  // Monthly totals for footer
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
    monthKiaTotal - affirmMonthTotal - sumCents(Object.values(monthCatTotals)) - monthSavingsTotal;

  return (
    <>
      {/* Month label row */}
      <tr className={styles.monthLabelRow} onClick={onToggle} style={{ cursor: "pointer" }}>
        <td colSpan={3 + CATEGORIES.length + 2} className={styles.monthLabel}>
          <span className={styles.collapseIcon}>{isCollapsed ? "►" : "▼"}</span>
          {fmtMonthFull(month)}
        </td>
      </tr>

      {!isCollapsed && (
        <>
          {/* Week rows */}
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
}

// ─── Week Row ─────────────────────────────────────────────────────────────────

function WeekRow({
  week,
  displayDate,
  affirmPerWeek,
  savingsForWeek,
  onUpsertWeek,
  onAddCheckEntry,
  onDeleteCheckEntry,
}: {
  week: PaycheckWeek;
  displayDate: string;
  affirmPerWeek: number;
  savingsForWeek: number;
  onUpsertWeek: (week: PaycheckWeek) => void;
  onAddCheckEntry: (entry: KiasCheckEntry) => void;
  onDeleteCheckEntry: (weekOf: string) => void;
}) {
  const updateField = (key: CategoryKey | "kiasPay", raw: string) => {
    const cents = toCents(raw);
    const updated = { ...week, [key]: cents };
    onUpsertWeek(updated);
    if (key === "kiasPay") {
      // Always clear the old entry first, then re-add if amount > 0
      onDeleteCheckEntry(week.weekOf);
      if (cents > 0) {
        onAddCheckEntry({ weekOf: week.weekOf, amount: cents });
      }
    }
  };

  const totalAllocated =
    affirmPerWeek + savingsForWeek + sumCents(CATEGORIES.map((c) => week[c.key]));
  const payLeft = week.kiasPay - totalAllocated;

  const weekLabel = new Date(displayDate + "T12:00:00").toLocaleDateString(
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

      {/* Savings — derived from Savings Tab, not editable */}
      <td className={`${styles.td} ${styles.tdAfirm}`}>
        <span className={styles.mono}>{savingsForWeek > 0 ? fmtMoney(savingsForWeek) : <span className={styles.zero}>—</span>}</span>
      </td>

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

function emptyWeek(weekOf: string, template?: PaycheckWeek, kiasPay = 0): PaycheckWeek {
  return {
    weekOf,
    kiasPay,
    storage: template?.storage ?? 0,
    rent: template?.rent ?? 0,
    rentWeek: false,
    jazmin: template?.jazmin ?? 0,
    dre: template?.dre ?? 0,
    savings: 0,
    paypalCC: template?.paypalCC ?? 0,
    deductions: template?.deductions ?? 0,
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
