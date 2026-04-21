"use client";

import { useState } from "react";
import type {
  Bill,
  InstallmentPlan,
  KiasCheckEntry,
  MonthlyIncome,
  MonthSnapshot,
  PaycheckWeek,
  SavingsEntry,
} from "@/types";
import { fmtMoney } from "@/lib/money";
import { currentMonth, advanceMonth, fmtMonthFull } from "@/lib/dates";
import { getHouseholdMonthSummary } from "@/lib/household/household";
import { StatCard } from "@/components/ui/StatCard";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DateToggle } from "@/components/ui/DateToggle";
import { ActionToast } from "@/components/ui/ActionToast/ActionToast";
import { BillGroup } from "./BillGroup";
import { BillForm } from "./BillForm";
import { IncomePanel } from "./IncomePanel";
import { MonthSnapshot as MonthSnapshotPanel } from "./MonthSnapshot";
import styles from "./AccountsTab.module.css";

type SortKey = "due" | "name" | "cents" | "method" | "category";
type SortDir = "asc" | "desc";
type PanelMode = "both" | "kias" | "other";

type Props = {
  bills: Bill[];
  income: MonthlyIncome[];
  plans?: InstallmentPlan[];
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
  plans = [],
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
  const [panelMode, setPanelMode] = useState<PanelMode>("both");
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const monthSummary = getHouseholdMonthSummary({
    month: viewMonth,
    bills,
    income,
    paycheck,
    checkLog,
    savingsLog,
    plans,
  });
  const visibleBills = monthSummary.visibleBills;
  const kiasBills = monthSummary.kiasBills;
  const otherBills = monthSummary.otherBills;
  const kiasBillsCents = monthSummary.kiasBillsCents;
  const otherBillsCents = monthSummary.otherBillsCents;
  const paidCents = monthSummary.paidBillsCents;
  const unpaidCents = monthSummary.totalExpenseCents - monthSummary.paidBillsCents;
  const kiasPayCents = monthSummary.kiasPayCents;
  const thisMonthIncome = monthSummary.fixedIncome;
  const shortfall = monthSummary.shortfallCents;

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
    // istanbul ignore next — confirmRollover only callable when rolloverPrompt is set; guard is unreachable via UI
    if (!rolloverPrompt) return;
    onRollover(rolloverPrompt.from, rolloverPrompt.to);
    setViewMonth(rolloverPrompt.to);
    setRolloverPrompt(null);
  };

  const dismissRollover = () => {
    // istanbul ignore next — dismissRollover only callable when rolloverPrompt is set; guard is unreachable via UI
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
    setToastMessage(editing ? "Bill updated" : "Bill added");
  };

  const handleFormClose = () => {
    setShowForm(false);
    setEditing(null);
  };

  const kiasCollapsed = panelMode === "other";
  const otherCollapsed = panelMode === "kias";
  const splitGroups = panelMode === "both";

  const handleKiasToggle = () => {
    setPanelMode((current) => (current === "other" ? "both" : "other"));
  };

  const handleOtherToggle = () => {
    setPanelMode((current) => (current === "kias" ? "both" : "kias"));
  };

  return (
    <div className={styles.container}>
      {/* ── Toolbar ───────────────────────────────────────────────── */}
      <div className={styles.toolbar}>
        <DateToggle
          label={fmtMonthFull(viewMonth)}
          onPrev={() => navigateMonth(-1)}
          onNext={() => navigateMonth(1)}
          onToday={() => setViewMonth(currentMonth())}
          canToday={viewMonth !== currentMonth()}
          prevAriaLabel="Previous month"
          nextAriaLabel="Next month"
        />

        <div className={styles.toolbarActions}>
          <button
            className={`${styles.toolBtn} ${styles.toolBtnPrimary}`}
            onClick={() => setShowForm(true)}
          >
            + Add Bill
          </button>
          <button
            className={styles.toolBtn}
            onClick={() => setShowSnapshot(true)}
          >
            Close Month
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

      {/* ── Stat row ─────────────────────────────────────────────── */}
      {(() => {
        const totalCents = monthSummary.totalExpenseCents;
        const paidPct   = totalCents > 0 ? (paidCents   / totalCents) * 100 : 0;
        const unpaidPct = totalCents > 0 ? (unpaidCents / totalCents) * 100 : 0;
        return (
          <div className={styles.statsRow}>
            <StatCard
              label="Monthly Total"
              color="navy"
              value={fmtMoney(totalCents)}
              subRows={[
                { label: "From Kia's Pay",     value: fmtMoney(kiasBillsCents) },
                { label: "From Other Income",  value: fmtMoney(otherBillsCents) },
                { label: "Affirm Plans",       value: fmtMoney(monthSummary.affirmBurdenCents) },
              ]}
              progress={100}
            />
            <StatCard
              label="Paid"
              value={fmtMoney(paidCents)}
              color="olive"
              progress={paidPct}
            />
            <StatCard
              label="Unpaid"
              value={fmtMoney(unpaidCents)}
              color="rust"
              progress={unpaidPct}
            />
            <StatCard
              label={shortfall > 0 ? "Short" : "Est. Surplus"}
              value={fmtMoney(Math.abs(shortfall))}
              color="gold"
            />
          </div>
        );
      })()}

      {/* ── Income & Reconciliation ──────────────────────────────── */}
      <div className={styles.bento}>
        <div className={styles.leftRail}>
          <div className={styles.incomePanelWrap}>
            <IncomePanel
              month={viewMonth}
              income={thisMonthIncome}
              kiasPayCents={kiasPayCents}
              totalExpenseCents={monthSummary.totalExpenseCents}
              weeksEntered={monthSummary.weeksEntered}
              onUpdate={onUpdateIncome}
              compact
            />
          </div>
        </div>

        <div className={styles.billGroups}>
          <BillGroup
            label="From Kia's Pay"
            variant="navy"
            footerLabel="Subtotal"
            bills={kiasBills}
            sortKey={sortKey}
            sortDir={sortDir}
            isCollapsed={kiasCollapsed}
            split={splitGroups}
            onToggle={handleKiasToggle}
            onSort={handleSort}
            onEdit={handleEdit}
            onDelete={onDelete}
            onTogglePaid={onTogglePaid}
          />
          <BillGroup
            label="From Other Income"
            variant="olive"
            footerLabel="Subtotal"
            bills={otherBills}
            sortKey={sortKey}
            sortDir={sortDir}
            isCollapsed={otherCollapsed}
            split={splitGroups}
            onToggle={handleOtherToggle}
            onSort={handleSort}
            onEdit={handleEdit}
            onDelete={onDelete}
            onTogglePaid={onTogglePaid}
          />
        </div>
      </div>

      {/* ── Month Snapshot Modal ──────────────────────────────────── */}
      <Dialog open={showSnapshot} onOpenChange={setShowSnapshot}>
        <DialogContent className={styles.snapshotDialog}>
          <DialogHeader className="sr-only">
            <DialogTitle>Month-End Snapshot</DialogTitle>
            <DialogDescription>
              Review the closeout numbers for this month, then confirm to save the snapshot.
            </DialogDescription>
          </DialogHeader>
          <MonthSnapshotPanel
            month={viewMonth}
            bills={bills}
            income={income}
            plans={plans}
            savingsLog={savingsLog}
            checkLog={checkLog}
            paycheck={paycheck}
            onSave={(snap) => {
              onSaveSnapshot(snap);
              setToastMessage("Snapshot saved");
            }}
            onClose={() => setShowSnapshot(false)}
          />
        </DialogContent>
      </Dialog>

      {/* ── Add / Edit Modal ──────────────────────────────────────── */}
      {showForm && (
        <BillForm
          initial={editing}
          onSave={handleFormSave}
          onClose={handleFormClose}
        />
      )}
      <ActionToast message={toastMessage} onDone={() => setToastMessage(null)} />
    </div>
  );
}
