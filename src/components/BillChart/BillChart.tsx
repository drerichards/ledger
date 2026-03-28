"use client";

import { useState } from "react";
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

  const month = currentMonth();

  // Split bills into the two groups
  const kiasBills = bills.filter((b) => b.group === "kias_pay");
  const otherBills = bills.filter((b) => b.group === "other_income");

  // Totals
  const totalCents = sumCents(bills.map((b) => b.cents));
  const paidCents = sumCents(bills.filter((b) => b.paid).map((b) => b.cents));
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
            onClick={() => exportBillsCSV(bills)}
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
        onEdit={handleEdit}
        onDelete={onDelete}
        onTogglePaid={onTogglePaid}
      />

      {/* ── Group B: Other Income ─────────────────────────────────── */}
      <BillGroup
        label="From Other Income"
        bills={otherBills}
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

function BillGroup({
  label,
  bills,
  onEdit,
  onDelete,
  onTogglePaid,
}: {
  label: string;
  bills: Bill[];
  onEdit: (bill: Bill) => void;
  onDelete: (id: string) => void;
  onTogglePaid: (id: string) => void;
}) {
  const sorted = [...bills].sort((a, b) => a.due - b.due);

  return (
    <div className={styles.group}>
      <div className={styles.groupHeader}>{label}</div>
      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th scope="col" className={styles.th}>
                Date
              </th>
              <th scope="col" className={styles.th}>
                Method
              </th>
              <th scope="col" className={styles.th}>
                Payee
              </th>
              <th scope="col" className={`${styles.th} ${styles.thRight}`}>
                Amount
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
