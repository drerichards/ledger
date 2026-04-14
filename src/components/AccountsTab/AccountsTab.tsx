"use client";

import { useState, useRef, useEffect } from "react";
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
import { DateToggle } from "@/components/ui/DateToggle";
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
  const [kiasCollapsed, setKiasCollapsed] = useState(false);
  const [otherCollapsed, setOtherCollapsed] = useState(false);
  const [showMore, setShowMore] = useState(false);
  const [showIncome, setShowIncome] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showMore) return;
    const handler = (e: MouseEvent) => {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) {
        setShowMore(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showMore]);

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
  };

  const handleFormClose = () => {
    setShowForm(false);
    setEditing(null);
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
          prevAriaLabel="Previous month"
          nextAriaLabel="Next month"
        />

        <div className={styles.toolbarActions}>
          <button
            className={styles.toolBtn}
            onClick={() => setShowForm(true)}
          >
            + Add Bill
          </button>

        {/* More menu */}
        <div className={styles.moreWrapper} ref={moreRef}>
          <button
            className={`${styles.toolBtn} ${showMore ? styles.toolBtnActive : ""}`}
            onClick={() => setShowMore((v) => !v)}
            aria-expanded={showMore}
            aria-haspopup="menu"
          >
            <svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor" aria-hidden="true">
              <path d="M9.5 13a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0zm0-5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0zm0-5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0z"/>
            </svg>
            More
          </button>
          {showMore && (
            <div className={styles.moreDropdown} role="menu">
              <button
                className={styles.moreItem}
                role="menuitem"
                onClick={() => { exportBillsCSV(visibleBills); setShowMore(false); }}
              >
                Export CSV
              </button>
              <button
                className={styles.moreItem}
                role="menuitem"
                onClick={() => { setShowSnapshot(true); setShowMore(false); }}
              >
                Month Summary
              </button>
            </div>
          )}
        </div>
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
        const totalCents = kiasBillsCents + otherBillsCents;
        const paidPct   = totalCents > 0 ? (paidCents   / totalCents) * 100 : 0;
        const unpaidPct = totalCents > 0 ? (unpaidCents / totalCents) * 100 : 0;
        return (
          <div className={styles.statsRow}>
            <StatCard
              label="Monthly Total"
              color="navy"
              subRows={[
                { label: "From Kia's Pay",     value: fmtMoney(kiasBillsCents) },
                { label: "From Other Income",  value: fmtMoney(otherBillsCents) },
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

      {/* ── Income & Reconciliation (collapsible) ────────────────── */}
      <div className={styles.incomeAccordion}>
        <button
          className={styles.incomeToggle}
          onClick={() => setShowIncome((v) => !v)}
          aria-expanded={showIncome}
        >
          <span>Income &amp; Reconciliation</span>
          <span className={styles.incomeToggleIcon}>{showIncome ? "▲" : "▼"}</span>
        </button>
        {showIncome && (
          <div className={styles.incomePanelWrap}>
            <IncomePanel
              month={viewMonth}
              income={thisMonthIncome}
              kiasPayCents={kiasPayCents}
              totalBillsCents={otherBillsCents}
              onUpdate={onUpdateIncome}
            />
          </div>
        )}
      </div>

      {/* ── Bill groups — full width ──────────────────────────────── */}
      <div className={styles.billGroups}>
        <BillGroup
          label="From Kia's Pay"
          variant="navy"
          footerLabel="Subtotal"
          bills={kiasBills}
          sortKey={sortKey}
          sortDir={sortDir}
          isCollapsed={kiasCollapsed}
          onToggle={() => {
            // Never allow both groups collapsed simultaneously
            if (!kiasCollapsed && otherCollapsed) return;
            setKiasCollapsed((c) => !c);
          }}
          onSort={handleSort}
          onEdit={handleEdit}
          onDelete={onDelete}
          onTogglePaid={onTogglePaid}
        />
        <BillGroup
          label="From Other Income"
          variant="olive"
          footerLabel="Affirm Total"
          bills={otherBills}
          sortKey={sortKey}
          sortDir={sortDir}
          isCollapsed={otherCollapsed}
          onToggle={() => {
            // Never allow both groups collapsed simultaneously
            if (!otherCollapsed && kiasCollapsed) return;
            setOtherCollapsed((c) => !c);
          }}
          onSort={handleSort}
          onEdit={handleEdit}
          onDelete={onDelete}
          onTogglePaid={onTogglePaid}
        />
      </div>

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
