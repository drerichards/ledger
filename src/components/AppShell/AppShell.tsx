"use client";

import { useState } from "react";
import { useAppState } from "@/hooks/useAppState";
import { BillChart } from "../BillChart/BillChart";
import { AffirmGrid } from "@/components/AffirmGrid/AffirmGrid";
import { PaycheckTab } from "@/components/PaycheckTab/PaycheckTab";
import styles from "./AppShell.module.css";

type Tab = "bills" | "affirm" | "paycheck";

const TABS: { id: Tab; label: string }[] = [
  { id: "bills", label: "Bill Chart" },
  { id: "affirm", label: "Affirm Plans" },
  { id: "paycheck", label: "Paycheck" },
];

export function AppShell() {
  const [activeTab, setActiveTab] = useState<Tab>("bills");
  const appState = useAppState();

  return (
    <div className={styles.shell}>
      <Header />
      <nav className={styles.tabBar} data-print-hide>
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
      <main className={styles.content}>
        {activeTab === "bills" && (
          <BillChart
            bills={appState.state.bills}
            income={appState.state.income}
            snapshots={appState.state.snapshots}
            savingsLog={appState.state.savingsLog}
            onAdd={appState.addBill}
            onUpdate={appState.updateBill}
            onDelete={appState.deleteBill}
            onTogglePaid={appState.toggleBillPaid}
            onUpdateIncome={appState.upsertIncome}
            onSaveSnapshot={appState.addSnapshot}
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
            plans={appState.state.plans}
            checkLog={appState.state.checkLog}
            savingsLog={appState.state.savingsLog}
            viewScope={appState.state.paycheckViewScope}
            onUpsertWeek={appState.upsertPaycheckWeek}
            onAddCheckEntry={appState.addCheckEntry}
            onAddSavings={appState.addSavingsEntry}
            onSetViewScope={appState.setPaycheckViewScope}
          />
        )}
      </main>
    </div>
  );
}

function Header() {
  return (
    <header className={styles.header}>
      <div>
        <h1 className={styles.appName}>Ledger</h1>
        <p className={styles.appSubtitle}>Household Finance Tracker</p>
      </div>
      <div className={styles.headerRight}>
        <button
          className={styles.printBtn}
          onClick={() => window.print()}
          data-print-hide
          aria-label="Print current view"
        >
          Print
        </button>
        <time className={styles.currentMonth}>
          {new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" })}
        </time>
      </div>
    </header>
  );
}
