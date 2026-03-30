"use client";

import { useState } from "react";
import { useAppState } from "@/hooks/useAppState";
import { BillChart } from "../BillChart/BillChart";
import { AffirmGrid } from "@/components/AffirmGrid/AffirmGrid";
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

export function AppShell() {
  const [activeTab, setActiveTab] = useState<Tab>("bills");
  const [printAll, setPrintAll] = useState(false);
  const appState = useAppState();

  const handlePrintAll = () => {
    setPrintAll(true);
    // Give React one frame to render all tabs before printing
    setTimeout(() => {
      window.print();
      setPrintAll(false);
    }, 150);
  };

  return (
    <div className={styles.shell}>
      <div className={styles.stickyTop} data-print-hide>
        <Header onPrintAll={handlePrintAll} />
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
            <BillChart
              bills={appState.state.bills}
              income={appState.state.income}
              savingsLog={appState.state.savingsLog}
              paycheck={appState.state.paycheck}
              onAdd={appState.addBill}
              onUpdate={appState.updateBill}
              onDelete={appState.deleteBill}
              onTogglePaid={appState.toggleBillPaid}
              onUpdateIncome={appState.upsertIncome}
              onSaveSnapshot={appState.addSnapshot}
              onRollover={appState.rolloverBills}
            />
            <div className={styles.printPageBreak} />
            <AffirmGrid
              plans={appState.state.plans}
              onAdd={appState.addPlan}
              onDelete={appState.deletePlan}
            />
            <div className={styles.printPageBreak} />
            <PaycheckTab
              paycheck={appState.state.paycheck}
              checkLog={appState.state.checkLog}
              savingsLog={appState.state.savingsLog}
              plans={appState.state.plans}
              viewScope={appState.state.paycheckViewScope}
              onUpsertWeek={appState.upsertPaycheckWeek}
              onAddCheckEntry={appState.addCheckEntry}
              onDeleteCheckEntry={appState.deleteCheckEntry}
              onSetViewScope={appState.setPaycheckViewScope}
            />
            <div className={styles.printPageBreak} />
            <SavingsTab
              plans={appState.state.plans}
              checking={appState.state.checkLog}
              savingsLog={appState.state.savingsLog}
              paycheck={appState.state.paycheck}
              onAddCheckEntry={appState.addCheckEntry}
              onDeleteCheckEntry={appState.deleteCheckEntry}
              onAddSavings={appState.addSavingsEntry}
            />
            <div className={styles.printPageBreak} />
            <HistoryTab snapshots={appState.state.snapshots} />
          </>
        ) : (
          <>
            {activeTab === "bills" && (
              <BillChart
                bills={appState.state.bills}
                income={appState.state.income}
                savingsLog={appState.state.savingsLog}
                paycheck={appState.state.paycheck}
                onAdd={appState.addBill}
                onUpdate={appState.updateBill}
                onDelete={appState.deleteBill}
                onTogglePaid={appState.toggleBillPaid}
                onUpdateIncome={appState.upsertIncome}
                onSaveSnapshot={appState.addSnapshot}
                onRollover={appState.rolloverBills}
              />
            )}
            {activeTab === "affirm" && (
              <AffirmGrid
                plans={appState.state.plans}
                onAdd={appState.addPlan}
                onDelete={appState.deletePlan}
              />
            )}
            {activeTab === "paycheck" && (
              <PaycheckTab
                paycheck={appState.state.paycheck}
                checkLog={appState.state.checkLog}
                savingsLog={appState.state.savingsLog}
                plans={appState.state.plans}
                viewScope={appState.state.paycheckViewScope}
                onUpsertWeek={appState.upsertPaycheckWeek}
                onAddCheckEntry={appState.addCheckEntry}
                onDeleteCheckEntry={appState.deleteCheckEntry}
                onSetViewScope={appState.setPaycheckViewScope}
              />
            )}
            {activeTab === "savings" && (
              <SavingsTab
                plans={appState.state.plans}
                checking={appState.state.checkLog}
                savingsLog={appState.state.savingsLog}
                paycheck={appState.state.paycheck}
                onAddCheckEntry={appState.addCheckEntry}
                onDeleteCheckEntry={appState.deleteCheckEntry}
                onAddSavings={appState.addSavingsEntry}
              />
            )}
            {activeTab === "history" && (
              <HistoryTab snapshots={appState.state.snapshots} />
            )}
          </>
        )}
      </main>
    </div>
  );
}

function Header({ onPrintAll }: { onPrintAll: () => void }) {
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
        <time className={styles.currentMonth}>
          {new Date().toLocaleDateString("en-US", {
            month: "long",
            year: "numeric",
          })}
        </time>
      </div>
    </header>
  );
}
