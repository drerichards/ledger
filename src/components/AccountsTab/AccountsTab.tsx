"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
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

  // Toggling the only open group swaps to the other (close one → the other
  // auto-expands); otherwise just toggle. Both can be open; both can't be closed.
  const handleKiasToggle = () => {
    if (kiasOpen && !otherOpen) {
      setKiasOpen(false);
      setOtherOpen(true);
    } else {
      setKiasOpen((open) => !open);
    }
  };

  const handleOtherToggle = () => {
    if (otherOpen && !kiasOpen) {
      setOtherOpen(false);
      setKiasOpen(true);
    } else {
      setOtherOpen((open) => !open);
    }
  };

  // ── Accordion layout ────────────────────────────────────────────────────────
  // Give each bill group an explicit height so the two move as one piece: an open
  // group sizes to its content (no blank above its subtotal), a collapsed group
  // shows its chrome (header + subtotal) plus any leftover space as a peek of
  // rows. The heights always sum to the container, so the divider slides smoothly.
  const billGroupsRef = useRef<HTMLDivElement>(null);
  const firstLayout = useRef(true);
  useLayoutEffect(() => {
    const container = billGroupsRef.current;
    if (!container) return;
    const groups = Array.from(container.querySelectorAll<HTMLElement>("[data-acc-group]"));
    if (groups.length === 0) return;

    const runLayout = () => {
      const GAP = 8; // matches .billGroups gap (--space-2)
      const stageH = container.clientHeight - GAP * (groups.length - 1);
      const info = groups.map((el) => {
        const chrome = Array.from(el.querySelectorAll<HTMLElement>("[data-acc-chrome]")).reduce(
          (sum, c) => sum + c.offsetHeight,
          0,
        );
        const list = el.querySelector<HTMLElement>("[data-acc-list]");
        return { el, open: el.dataset.accOpen === "true", chrome, content: chrome + (list?.scrollHeight ?? 0) };
      });

      // Every group's chrome (header + subtotal bar) is reserved FIRST so its
      // subtotal is always on-screen; collapsed groups take only their chrome.
      // Open groups then share the remaining height in proportion to how much
      // content each wants. Targets always sum to exactly stageH, so no group's
      // box (and therefore no subtotal bar) is ever pushed below the stage — the
      // rows scroll inside each open group instead.
      const openCount = info.filter((g) => g.open).length;

      let targets: number[];
      if (openCount > 1) {
        // Multiple groups open → each gets an EQUAL share of the stage (50/50 for
        // two). Rows scroll inside; chrome (header + subtotal) is always visible.
        const share = stageH / openCount;
        targets = info.map((g) => (g.open ? share : g.chrome));
        // Collapsed groups still need their chrome; take it from the open shares.
        const collapsedChrome = info.reduce((sum, g) => sum + (g.open ? 0 : g.chrome), 0);
        if (collapsedChrome > 0) {
          const perOpen = collapsedChrome / openCount;
          targets = info.map((g) => (g.open ? share - perOpen : g.chrome));
        }
      } else {
        // One (or zero) group open → it sizes to its content, the collapsed
        // sibling takes its chrome plus any leftover as a peek of rows.
        const totalChrome = info.reduce((sum, g) => sum + g.chrome, 0);
        targets = info.map((g) => {
          if (!g.open) return g.chrome;
          return Math.min(g.content, stageH - (totalChrome - g.chrome));
        });
        const leftover = stageH - targets.reduce((sum, h) => sum + h, 0);
        if (leftover > 0) {
          const closedIdx = info.findIndex((g) => !g.open);
          targets[closedIdx >= 0 ? closedIdx : info.length - 1] += leftover;
        }
      }

      const animate = !firstLayout.current;
      firstLayout.current = false;
      info.forEach((g, i) => {
        if (!animate) g.el.style.transition = "none";
        g.el.style.height = `${Math.max(0, targets[i])}px`;
        if (!animate) requestAnimationFrame(() => {
          g.el.style.transition = "";
        });
      });
    };

    runLayout();
    window.addEventListener("resize", runLayout);
    return () => window.removeEventListener("resize", runLayout);
  }, [kiasOpen, otherOpen, viewMonth, bills]);

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
              label={shortfall > 0 ? "Gap" : "Est. Surplus"}
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

        <div ref={billGroupsRef} className={styles.billGroups}>
          <BillGroup
            label="From Kia's Pay"
            variant="navy"
            footerLabel="Subtotal"
            bills={kiasBills}
            sortKey={sortKey}
            sortDir={sortDir}
            isCollapsed={kiasCollapsed}
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
