"use client";

import { useState } from "react";

type SortKey = "due" | "name" | "cents" | "method" | "category";
type SortDir = "asc" | "desc";
import type { Bill, MonthlyIncome, MonthSnapshot, SavingsEntry } from "@/types";
import { sumCents, calcShortfall, fmtMoney } from "@/lib/money";
import { exportBillsCSV } from "@/lib/export";
import { currentMonth } from "@/lib/dates";
import { BillRow } from "./BillRow";
import { BillForm } from "./BillForm";
import { IncomePanel } from "./IncomePanel";
import { MonthSnapshot as MonthSnapshotPanel } from "./MonthSnapshot";
import styles from "./BillChart.module.css";

type Props = {
  bills: Bill[];
  income: MonthlyIncome[];
  snapshots: MonthSnapshot[];
  savingsLog: SavingsEntry[];
  onAdd: (bill: Bill) => void;
  onUpdate: (bill: Bill) => void;
  onDelete: (id: string) => void;
  onTogglePaid: (id: string) => void;
  onUpdateIncome: (income: MonthlyIncome) => void;
  onSaveSnapshot: (snap: MonthSnapshot) => void;
};

export function BillChart({
  bills,
  income,
  snapshots,
  savingsLog,
  onAdd,
  onUpdate,
  onDelete,
  onTogglePaid,
  onUpdateIncome,
  onSaveSnapshot,
}: Props) {
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Bill | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>("due");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const month = currentMonth();
  const currentViewMonth = month;

  const visibleBills = bills.filter((b) => b.month === currentViewMonth);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  // Split bills into the two groups
  const kiasBills = visibleBills.filter((b) => b.group === "kias_pay");
  const otherBills = visibleBills.filter((b) => b.group === "other_income");

  // Totals
  const totalCents = sumCents(visibleBills.map((b) => b.cents));
  const paidCents = sumCents(visibleBills.filter((b) => b.paid).map((b) => b.cents));
  const unpaidCents = totalCents - paidCents;

  // Income reconciliation
  const thisMonthIncome = income.find((i) => i.month === month);
  const totalIncomeCents = thisMonthIncome
    ? sumCents([
        thisMonthIncome.kias_pay,
        thisMonthIncome.military_pay,
        thisMonthIncome.retirement,
        thisMonthIncome.social_security,
      ])
    : 0;
  const shortfall = calcShortfall(totalCents, totalIncomeCents);

  const handleEdit = (bill: Bill) => {
    setEditing(bill);
    setShowForm(true);
  };

  const handleFormSave = (bill: Bill) => {
    editing ? onUpdate(bill) : onAdd(bill);
    setShowForm(false);
    setEditing(null);
  };

  const handleFormClose = () => {
    setShowForm(false);
    setEditing(null);
  };

  return (
    <div className={styles.container}>
      {/* ── Summary Cards ─────────────────────────────────────────── */}
      <div className={styles.summaryRow}>
        <SummaryCard
          label="Monthly Total"
          value={fmtMoney(totalCents)}
          color="navy"
        />
        <SummaryCard label="Paid" value={fmtMoney(paidCents)} color="olive" />
        <SummaryCard
          label="Unpaid"
          value={fmtMoney(unpaidCents)}
          color="rust"
        />
        <SummaryCard
          label={shortfall > 0 ? "Short" : "Surplus"}
          value={fmtMoney(Math.abs(shortfall))}
          color={shortfall > 0 ? "rust" : "olive"}
        />
      </div>

      {/* ── Toolbar ───────────────────────────────────────────────── */}
      <div className={styles.toolbar}>
        <h2 className={styles.heading}>Bill Chart</h2>
        <div className={styles.toolbarActions}>
          <button
            className={styles.btnGhost}
            onClick={() => exportBillsCSV(visibleBills)}
          >
            Export CSV
          </button>
          <button
            className={styles.btnPrimary}
            onClick={() => setShowForm(true)}
          >
            + Add Bill
          </button>
        </div>
      </div>

      {/* ── Group A: Kia's Pay ────────────────────────────────────── */}
      <BillGroup
        label="From Kia's Pay"
        bills={kiasBills}
        sortKey={sortKey}
        sortDir={sortDir}
        onSort={handleSort}
        onEdit={handleEdit}
        onDelete={onDelete}
        onTogglePaid={onTogglePaid}
      />

      {/* ── Group B: Other Income ─────────────────────────────────── */}
      <BillGroup
        label="From Other Income"
        bills={otherBills}
        sortKey={sortKey}
        sortDir={sortDir}
        onSort={handleSort}
        onEdit={handleEdit}
        onDelete={onDelete}
        onTogglePaid={onTogglePaid}
      />

      {/* ── Income Reconciliation ─────────────────────────────────── */}
      <IncomePanel
        month={month}
        income={thisMonthIncome}
        totalBillsCents={totalCents}
        onUpdate={onUpdateIncome}
      />

      {/* ── Month Snapshot ────────────────────────────────────────── */}
      <MonthSnapshotPanel
        bills={bills}
        income={income}
        savingsLog={savingsLog}
        snapshots={snapshots}
        onSave={onSaveSnapshot}
      />

      {/* ── Add / Edit Modal ──────────────────────────────────────── */}
      {showForm && (
        <BillForm
          initial={editing}
          onSave={handleFormSave}
          onClose={handleFormClose}
        />
      )}
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SummaryCard({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: "navy" | "olive" | "rust";
}) {
  return (
    <div className={`${styles.summaryCard} ${styles[`summaryCard_${color}`]}`}>
      <span className={styles.summaryLabel}>{label}</span>
      <span className={styles.summaryValue}>{value}</span>
    </div>
  );
}

function sortBills(bills: Bill[], key: SortKey, dir: SortDir): Bill[] {
  return [...bills].sort((a, b) => {
    let comparison = 0;
    switch (key) {
      case "due":      comparison = a.due - b.due; break;
      case "name":     comparison = a.name.localeCompare(b.name); break;
      case "cents":    comparison = a.cents - b.cents; break;
      case "method":   comparison = a.method.localeCompare(b.method); break;
      case "category": comparison = a.category.localeCompare(b.category); break;
    }
    return dir === "asc" ? comparison : -comparison;
  });
}

function BillGroup({
  label,
  bills,
  sortKey,
  sortDir,
  onSort,
  onEdit,
  onDelete,
  onTogglePaid,
}: {
  label: string;
  bills: Bill[];
  sortKey: SortKey;
  sortDir: SortDir;
  onSort: (key: SortKey) => void;
  onEdit: (bill: Bill) => void;
  onDelete: (id: string) => void;
  onTogglePaid: (id: string) => void;
}) {
  const sorted = sortBills(bills, sortKey, sortDir);

  return (
    <div className={styles.group}>
      <div className={styles.groupHeader}>{label}</div>
      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th scope="col" className={`${styles.th} ${styles.thSortable}`} onClick={() => onSort("due")} aria-sort={sortKey === "due" ? (sortDir === "asc" ? "ascending" : "descending") : undefined}>
                Date {sortKey === "due" ? (sortDir === "asc" ? "↑" : "↓") : ""}
              </th>
              <th scope="col" className={`${styles.th} ${styles.thSortable}`} onClick={() => onSort("method")} aria-sort={sortKey === "method" ? (sortDir === "asc" ? "ascending" : "descending") : undefined}>
                Method {sortKey === "method" ? (sortDir === "asc" ? "↑" : "↓") : ""}
              </th>
              <th scope="col" className={`${styles.th} ${styles.thSortable}`} onClick={() => onSort("name")} aria-sort={sortKey === "name" ? (sortDir === "asc" ? "ascending" : "descending") : undefined}>
                Payee {sortKey === "name" ? (sortDir === "asc" ? "↑" : "↓") : ""}
              </th>
              <th scope="col" className={`${styles.th} ${styles.thRight} ${styles.thSortable}`} onClick={() => onSort("cents")} aria-sort={sortKey === "cents" ? (sortDir === "asc" ? "ascending" : "descending") : undefined}>
                Amount {sortKey === "cents" ? (sortDir === "asc" ? "↑" : "↓") : ""}
              </th>
              <th scope="col" className={`${styles.th} ${styles.thCenter}`}>
                Paid
              </th>
              <th scope="col" className={styles.th}>
                Notes
              </th>
              <th scope="col" className={`${styles.th} ${styles.thCenter}`}>
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((bill) => (
              <BillRow
                key={bill.id}
                bill={bill}
                onEdit={onEdit}
                onDelete={onDelete}
                onTogglePaid={onTogglePaid}
              />
            ))}
            {sorted.length === 0 && (
              <tr>
                <td colSpan={7} className={styles.emptyState}>
                  No bills yet — click + Add Bill to get started.
                </td>
              </tr>
            )}
          </tbody>
          {sorted.length > 0 && (
            <tfoot>
              <tr className={styles.totalRow}>
                <td colSpan={3} className={styles.totalLabel}>
                  Group Total
                </td>
                <td className={`${styles.totalValue} ${styles.thRight}`}>
                  {fmtMoney(sumCents(bills.map((b) => b.cents)))}
                </td>
                <td colSpan={3} />
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}
