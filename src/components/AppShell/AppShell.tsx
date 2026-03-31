"use client";

import { useState } from "react";
import { advanceMonth, currentMonth, fmtMonthFull } from "@/lib/dates";
import { useAppState } from "@/hooks/useAppState";
import { withErrorBoundary } from "@/components/ui/withErrorBoundary/withErrorBoundary";
import { BillChart } from "@/components/BillChartTab/BillChart";
import { AffirmTab } from "@/components/AffirmTab/AffirmTab";
import { PaycheckTab } from "@/components/PaycheckTab/PaycheckTab";
import { SavingsTab } from "@/components/SavingsTab/SavingsTab";
import { HistoryTab } from "@/components/HistoryTab/HistoryTab";
import styles from "./AppShell.module.css";

type Tab = "bills" | "affirm" | "paycheck" | "savings" | "history";

const TABS: { id: Tab; label: string }[] = [
  { id: "bills", label: "Bill Chart" },
  { id: "affirm", label: "Affirm Plans" },
  { id: "paycheck", label: "Paycheck" },
  { id: "savings", label: "Savings" },
  { id: "history", label: "History" },
];

// Wrap each tab in an isolated error boundary so one crash doesn't kill the shell.
const SafeBillChart    = withErrorBoundary(BillChart,    "BillChart");
const SafeAffirmTab    = withErrorBoundary(AffirmTab,    "AffirmTab");
const SafePaycheckTab  = withErrorBoundary(PaycheckTab,  "PaycheckTab");
const SafeSavingsTab   = withErrorBoundary(SavingsTab,   "SavingsTab");
const SafeHistoryTab   = withErrorBoundary(HistoryTab,   "HistoryTab");

export function AppShell() {
  const [activeTab, setActiveTab] = useState<Tab>("bills");
  const [printAll, setPrintAll] = useState(false);
  const [viewMonth, setViewMonth] = useState(() =>
    advanceMonth(currentMonth(), 1),
  );
  const appState = useAppState();

  const handlePrintAll = () => {
    setPrintAll(true);
    setTimeout(() => {
      window.print();
      setPrintAll(false);
    }, 150);
  };

  const billChartProps = {
    bills: appState.state.bills,
    income: appState.state.income,
    savingsLog: appState.state.savingsLog,
    checkLog: appState.state.checkLog,
    paycheck: appState.state.paycheck,
    viewMonth,
    onViewMonthChange: setViewMonth,
    onAdd: appState.addBill,
    onUpdate: appState.updateBill,
    onDelete: appState.deleteBill,
    onTogglePaid: appState.toggleBillPaid,
    onUpdateIncome: appState.upsertIncome,
    onSaveSnapshot: appState.addSnapshot,
    onRollover: appState.rolloverBills,
  };

  const affirmTabProps = {
    plans: appState.state.plans,
    onAdd: appState.addPlan,
    onDelete: appState.deletePlan,
  };

  const paycheckTabProps = {
    paycheck: appState.state.paycheck,
    checkLog: appState.state.checkLog,
    savingsLog: appState.state.savingsLog,
    plans: appState.state.plans,
    viewScope: appState.state.paycheckViewScope,
    onUpsertWeek: appState.upsertPaycheckWeek,
    onAddCheckEntry: appState.addCheckEntry,
    onDeleteCheckEntry: appState.deleteCheckEntry,
    onSetViewScope: appState.setPaycheckViewScope,
  };

  const savingsTabProps = {
    plans: appState.state.plans,
    checking: appState.state.checkLog,
    savingsLog: appState.state.savingsLog,
    checkLog: appState.state.checkLog,
    paycheck: appState.state.paycheck,
    onAddCheckEntry: appState.addCheckEntry,
    onDeleteCheckEntry: appState.deleteCheckEntry,
    onAddSavings: appState.addSavingsEntry,
  };

  return (
    <div className={styles.shell}>
      <div className={styles.stickyTop} data-print-hide>
        <Header onPrintAll={handlePrintAll} viewMonth={viewMonth} />
        <nav className={styles.tabBar}>
          {TABS.map((tab) => (
            <button
              key={tab.id}
              className={`${styles.tabButton} ${activeTab === tab.id ? styles.tabButtonActive : ""}`}
              onClick={() => setActiveTab(tab.id)}
              aria-selected={activeTab === tab.id}
              role="tab"
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      <main className={styles.content}>
        {printAll ? (
          <>
            <SafeBillChart {...billChartProps} />
            <div className={styles.printPageBreak} />
            <SafeAffirmTab {...affirmTabProps} />
            <div className={styles.printPageBreak} />
            <SafePaycheckTab {...paycheckTabProps} />
            <div className={styles.printPageBreak} />
            <SafeSavingsTab {...savingsTabProps} />
            <div className={styles.printPageBreak} />
            <SafeHistoryTab snapshots={appState.state.snapshots} />
          </>
        ) : (
          <>
            {activeTab === "bills"    && <SafeBillChart    {...billChartProps} />}
            {activeTab === "affirm"   && <SafeAffirmTab    {...affirmTabProps} />}
            {activeTab === "paycheck" && <SafePaycheckTab  {...paycheckTabProps} />}
            {activeTab === "savings"  && <SafeSavingsTab   {...savingsTabProps} />}
            {activeTab === "history"  && <SafeHistoryTab   snapshots={appState.state.snapshots} />}
          </>
        )}
      </main>
    </div>
  );
}

function Header({
  onPrintAll,
  viewMonth,
}: {
  onPrintAll: () => void;
  viewMonth: string;
}) {
  return (
    <header className={styles.header}>
      <div>
        <h1 className={styles.appName}>Ledger</h1>
        <p className={styles.appSubtitle}>Household Finance Tracker</p>
      </div>
      <div className={styles.headerRight} data-print-hide>
        <button
          className={styles.printBtn}
          onClick={() => window.print()}
          aria-label="Print current view"
        >
          Print This Tab
        </button>
        <button className={styles.printBtn} onClick={onPrintAll}>
          Print All
        </button>
        <time className={styles.currentMonth}>{fmtMonthFull(viewMonth)}</time>
      </div>
    </header>
  );
}
