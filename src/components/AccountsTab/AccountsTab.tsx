"use client";

import { useEffect, useState } from "react";
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
  // Each group expands/collapses independently, with one invariant: at least
  // one group is always open (closing the only-open group is a no-op).
  const [kiasOpen, setKiasOpen] = useState(true);
  const [otherOpen, setOtherOpen] = useState(true);
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
      // Auto-carry: recurring payees + amounts roll forward into a new empty
      // month with no prompt (they persist until deselected or removed).
      if (!nextHasBills && prevHasRecurring) {
        onRollover(viewMonth, next);
      }
    }
    setViewMonth(next);
  };

  // Auto-fill an empty current/future month from the most recent prior month
  // that has recurring bills, so payees carry forward with no manual step.
  // (ROLLOVER_BILLS no-ops if the target month already has bills, so this is
  // safe to run on every render; it fires at most once per empty month.)
  useEffect(() => {
    if (viewMonth < currentMonth()) return; // don't backfill history
    if (bills.some((b) => b.month === viewMonth)) return;
    const priorRecurringMonths = bills
      .filter((b) => b.entry === "recurring" && b.month < viewMonth)
      .map((b) => b.month)
      .sort();
    const source = priorRecurringMonths.at(-1);
    if (source) onRollover(source, viewMonth);
  }, [bills, viewMonth, onRollover]);

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

  const kiasCollapsed = !kiasOpen;
  const otherCollapsed = !otherOpen;
  const splitGroups = kiasOpen && otherOpen;

  // Toggle a group, but never let both collapse — keep at least one open.
  const handleKiasToggle = () => {
    setKiasOpen((open) => (open && !otherOpen ? open : !open));
  };

  const handleOtherToggle = () => {
    setOtherOpen((open) => (open && !kiasOpen ? open : !open));
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
          {/* Close Month hidden for v1 — re-enable post-ship. Snapshot dialog + handler kept intact. */}
          {/* <button
            className={styles.toolBtn}
            onClick={() => setShowSnapshot(true)}
          >
            Close Month
          </button> */}
        </div>
      </div>

      {/* ── Rollover Prompt ───────────────────────────────────────── */}

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
              noHover
            />
            <StatCard
              label="Paid"
              value={fmtMoney(paidCents)}
              color="olive"
              progress={paidPct}
              noHover
            />
            <StatCard
              label="Unpaid"
              value={fmtMoney(unpaidCents)}
              color="rust"
              progress={unpaidPct}
              noHover
            />
            <StatCard
              label={shortfall > 0 ? "Gap" : "Est. Surplus"}
              value={fmtMoney(Math.abs(shortfall))}
              color="gold"
              noHover
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
