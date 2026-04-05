"use client";

import { useState } from "react";
import type {
  Bill,
  KiasCheckEntry,
  MonthlyIncome,
  MonthSnapshot,
  PaycheckWeek,
  SavingsEntry,
} from "@/types";
import { fmtMoney } from "@/lib/money";
import { exportBillsCSV } from "@/lib/export";
import { currentMonth, advanceMonth, fmtMonthFull } from "@/lib/dates";
import { useBillChartState } from "@/hooks/useBillChartState";
import { StatCard } from "@/components/ui/StatCard";
import { Modal } from "@/components/ui/Modal";
import { BillGroup } from "./BillGroup";
import { BillForm } from "./BillForm";
import { IncomePanel } from "./IncomePanel";
import { MonthSnapshot as MonthSnapshotPanel } from "./MonthSnapshot";
import styles from "./AccountsTab.module.css";

type SortKey = "due" | "name" | "cents" | "method" | "category";
type SortDir = "asc" | "desc";

type Props = {
  bills: Bill[];
  income: MonthlyIncome[];
  savingsLog: SavingsEntry[];
  checkLog: KiasCheckEntry[];
  paycheck: PaycheckWeek[];
  viewMonth: string;
  onViewMonthChange: (month: string) => void;
  onAdd: (bill: Bill) => void;
  onUpdate: (bill: Bill) => void;
  onDelete: (id: string) => void;
  onTogglePaid: (id: string) => void;
  onUpdateIncome: (income: MonthlyIncome) => void;
  onSaveSnapshot: (snap: MonthSnapshot) => void;
  onRollover: (fromMonth: string, toMonth: string) => void;
};

export function AccountsTab({
  bills,
  income,
  savingsLog,
  checkLog,
  paycheck,
  viewMonth,
  onViewMonthChange: setViewMonth,
  onAdd,
  onUpdate,
  onDelete,
  onTogglePaid,
  onUpdateIncome,
  onSaveSnapshot,
  onRollover,
}: Props) {
  const [showForm, setShowForm] = useState(false);
  const [showSnapshot, setShowSnapshot] = useState(false);
  const [editing, setEditing] = useState<Bill | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>("due");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [rolloverPrompt, setRolloverPrompt] = useState<{
    from: string;
    to: string;
  } | null>(null);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  // All derived values live in the domain hook — no inline computation here.
  const {
    visibleBills,
    kiasBills,
    otherBills,
    kiasBillsCents,
    otherBillsCents,
    paidCents,
    unpaidCents,
    kiasPayCents,
    thisMonthIncome,
    shortfall,
  } = useBillChartState(bills, income, paycheck, viewMonth);

  const navigateMonth = (delta: number) => {
    const next = advanceMonth(viewMonth, delta);
    if (delta > 0) {
      const nextHasBills = bills.some((b) => b.month === next);
      const prevHasRecurring = bills.some(
        (b) => b.month === viewMonth && b.entry === "recurring",
      );
      if (!nextHasBills && prevHasRecurring) {
        setRolloverPrompt({ from: viewMonth, to: next });
        return;
      }
    }
    setViewMonth(next);
  };

  const confirmRollover = () => {
    if (!rolloverPrompt) return;
    onRollover(rolloverPrompt.from, rolloverPrompt.to);
    setViewMonth(rolloverPrompt.to);
    setRolloverPrompt(null);
  };

  const dismissRollover = () => {
    if (!rolloverPrompt) return;
    setViewMonth(rolloverPrompt.to);
    setRolloverPrompt(null);
  };

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const handleEdit = (bill: Bill) => {
    setEditing(bill);
    setShowForm(true);
  };

  const handleFormSave = (bill: Bill) => {
    if (editing) { onUpdate(bill); } else { onAdd(bill); }
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
        <StatCard
          label="Monthly Total"
          color="navy"
          subRows={[
            { label: "From Kia's Pay", value: fmtMoney(kiasBillsCents) },
            { label: "From Other Income", value: fmtMoney(otherBillsCents) },
          ]}
        />
        <StatCard label="Paid"   value={fmtMoney(paidCents)}   color="olive" />
        <StatCard label="Unpaid" value={fmtMoney(unpaidCents)} color="rust" />
        <StatCard
          label={shortfall > 0 ? "Short" : "Surplus"}
          value={fmtMoney(Math.abs(shortfall))}
          color={shortfall > 0 ? "rust" : "olive"}
        />
      </div>

      {/* ── Toolbar ───────────────────────────────────────────────── */}
      <div className={styles.toolbar}>
        <div className={styles.toolbarLeft}>
          <h2 className={styles.heading}>Bill Chart</h2>
          <div className={styles.monthNav}>
            <button
              className={styles.navBtn}
              onClick={() => navigateMonth(-1)}
              aria-label="Previous month"
            >
              ‹
            </button>
            <button
              className={styles.navBtn}
              onClick={() => setViewMonth(advanceMonth(currentMonth(), 1))}
            >
              Today
            </button>
            <button
              className={styles.navBtn}
              onClick={() => navigateMonth(1)}
              aria-label="Next month"
            >
              ›
            </button>
            <span className={styles.monthLabel}>{fmtMonthFull(viewMonth)}</span>
          </div>
        </div>
        <div className={styles.toolbarActions}>
          <button
            className={styles.btnGhost}
            onClick={() => exportBillsCSV(visibleBills)}
          >
            Export CSV
          </button>
          <button
            className={styles.btnGhost}
            onClick={() => setShowSnapshot(true)}
          >
            Month Summary
          </button>
          <button
            className={styles.btnPrimary}
            onClick={() => setShowForm(true)}
          >
            + Add Bill
          </button>
        </div>
      </div>

      {/* ── Rollover Prompt ───────────────────────────────────────── */}
      {rolloverPrompt && (
        <div className={styles.rolloverPrompt}>
          <span className={styles.rolloverMsg}>
            Start {fmtMonthFull(rolloverPrompt.to)} from{" "}
            {fmtMonthFull(rolloverPrompt.from)}&apos;s recurring bills?
          </span>
          <div className={styles.rolloverActions}>
            <button
              className={styles.btnGhost}
              onClick={() => setRolloverPrompt(null)}
            >
              Cancel
            </button>
            <button className={styles.btnGhost} onClick={dismissRollover}>
              Start fresh
            </button>
            <button className={styles.btnPrimary} onClick={confirmRollover}>
              Copy recurring bills
            </button>
          </div>
        </div>
      )}

      {/* ── Group A: Kia's Pay ────────────────────────────────────── */}
      <BillGroup
        label="From Kia's Pay"
        bills={kiasBills}
        sortKey={sortKey}
        sortDir={sortDir}
        isCollapsed={!!collapsed["kias_pay"]}
        onToggle={() => setCollapsed((p) => ({ ...p, kias_pay: !p.kias_pay }))}
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
        isCollapsed={!!collapsed["other_income"]}
        onToggle={() =>
          setCollapsed((p) => ({ ...p, other_income: !p.other_income }))
        }
        onSort={handleSort}
        onEdit={handleEdit}
        onDelete={onDelete}
        onTogglePaid={onTogglePaid}
      />

      {/* ── Income Reconciliation ─────────────────────────────────── */}
      <IncomePanel
        month={viewMonth}
        income={thisMonthIncome}
        kiasPayCents={kiasPayCents}
        totalBillsCents={otherBillsCents}
        onUpdate={onUpdateIncome}
      />

      {/* ── Month Snapshot Modal ──────────────────────────────────── */}
      {showSnapshot && (
        <Modal
          title="Month-End Snapshot"
          onClose={() => setShowSnapshot(false)}
          footer={null}
        >
          <MonthSnapshotPanel
            month={viewMonth}
            bills={bills}
            income={income}
            savingsLog={savingsLog}
            checkLog={checkLog}
            onSave={onSaveSnapshot}
            onClose={() => setShowSnapshot(false)}
          />
        </Modal>
      )}

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
