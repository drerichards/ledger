"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { advanceMonth, currentMonth } from "@/lib/dates";
import { useAppState } from "@/hooks/useAppState";
import { useAffirmNotifications } from "@/hooks/useAffirmNotifications";
import { createClient } from "@/lib/supabase/client";
import { withErrorBoundary } from "@/components/ui/withErrorBoundary/withErrorBoundary";
import { Header } from "@/components/AppShell/Header/Header";
import {
  buildBillChartProps,
  buildAffirmTabProps,
  buildPaycheckTabProps,
  buildSavingsTabProps,
} from "@/components/AppShell/types";
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
const SafeBillChart = withErrorBoundary(BillChart, "BillChart");
const SafeAffirmTab = withErrorBoundary(AffirmTab, "AffirmTab");
const SafePaycheckTab = withErrorBoundary(PaycheckTab, "PaycheckTab");
const SafeSavingsTab = withErrorBoundary(SavingsTab, "SavingsTab");
const SafeHistoryTab = withErrorBoundary(HistoryTab, "HistoryTab");

export function AppShell() {
  const [activeTab, setActiveTab] = useState<Tab>("bills");
  const [printAll, setPrintAll] = useState(false);
  const [viewMonth, setViewMonth] = useState(() =>
    advanceMonth(currentMonth(), 1),
  );
  const appState = useAppState();
  const router = useRouter();
  const printTimerRef = useRef<NodeJS.Timeout | null>(null);

  const handlePrintTab = () => window.print();

  const handlePrintAll = () => {
    setPrintAll(true);
    printTimerRef.current = setTimeout(() => {
      window.print();
      setPrintAll(false);
    }, 150);
  };

  // Cleanup timeout if component unmounts during print delay
  useEffect(() => {
    return () => {
      if (printTimerRef.current) clearTimeout(printTimerRef.current);
    };
  }, []);

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  };

  const { state: s, ...actions } = appState;

  // Derive notifications from paid-off Affirm plans
  const notifications = useAffirmNotifications(s.plans);

  const deps = {
    state: s,
    actions,
    viewMonth,
    onViewMonthChange: setViewMonth,
  };

  const billChartProps = buildBillChartProps(deps);
  const affirmTabProps = buildAffirmTabProps(deps);
  const paycheckTabProps = buildPaycheckTabProps(deps);
  const savingsTabProps = buildSavingsTabProps(deps);

  return (
    <div className={styles.shell}>
      <div className={styles.stickyTop} data-print-hide>
        <Header
          viewMonth={viewMonth}
          notifications={notifications}
          seenNotificationIds={s.seenNotificationIds ?? []}
          onMarkNotificationsSeen={actions.markNotificationsSeen}
          onNavigateToAffirm={() => setActiveTab("affirm")}
          onViewAllNotifications={() => router.push("/notifications")}
          onPrintTab={handlePrintTab}
          onPrintAll={handlePrintAll}
          onSignOut={handleSignOut}
        />
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
            <SafeHistoryTab snapshots={s.snapshots} />
          </>
        ) : (
          <>
            {activeTab === "bills" && <SafeBillChart {...billChartProps} />}
            {activeTab === "affirm" && <SafeAffirmTab {...affirmTabProps} />}
            {activeTab === "paycheck" && (
              <SafePaycheckTab {...paycheckTabProps} />
            )}
            {activeTab === "savings" && <SafeSavingsTab {...savingsTabProps} />}
            {activeTab === "history" && (
              <SafeHistoryTab snapshots={s.snapshots} />
            )}
          </>
        )}
      </main>
    </div>
  );
}
