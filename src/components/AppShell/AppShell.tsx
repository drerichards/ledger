"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { currentMonth, fmtMonthFull } from "@/lib/dates";
import { useAppState } from "@/hooks/useAppState";
import { useAffirmNotifications } from "@/hooks/useAffirmNotifications";
import { createClient } from "@/lib/supabase/client";
import { withErrorBoundary } from "@/components/ui/withErrorBoundary/withErrorBoundary";
import { Header } from "@/components/AppShell/Header/Header";
import {
  buildAccountsTabProps,
  buildAffirmTabProps,
  buildPaycheckTabProps,
  buildSavingsTabProps,
} from "@/components/AppShell/types";
import { AccountsTab } from "@/components/AccountsTab";
import { AffirmTab } from "@/components/AffirmTab/AffirmTab";
import { PaycheckTab } from "@/components/PaycheckTab/PaycheckTab";
import { SavingsTab } from "@/components/SavingsTab/SavingsTab";
import { SnapshotsTab } from "@/components/SnapshotsTab";
import { ActivityTab } from "@/components/ActivityTab";
import styles from "./AppShell.module.css";

type Tab = "accounts" | "paycheck" | "affirm" | "savings" | "snapshots" | "activity";

const TABS: { id: Tab; label: string }[] = [
  { id: "accounts", label: "Accounts" },
  { id: "paycheck", label: "Paycheck" },
  { id: "affirm", label: "Affirm" },
  { id: "savings", label: "Savings" },
  { id: "snapshots", label: "Snapshots" },
  { id: "activity", label: "Activity" },
];

// Wrap each tab in an isolated error boundary so one crash doesn't kill the shell.
const SafeAccountsTab = withErrorBoundary(AccountsTab, "AccountsTab");
const SafeAffirmTab = withErrorBoundary(AffirmTab, "AffirmTab");
const SafePaycheckTab = withErrorBoundary(PaycheckTab, "PaycheckTab");
const SafeSavingsTab = withErrorBoundary(SavingsTab, "SavingsTab");
const SafeSnapshotsTab = withErrorBoundary(SnapshotsTab, "SnapshotsTab");
const SafeActivityTab = withErrorBoundary(ActivityTab, "ActivityTab");

export function AppShell() {
  const [activeTab, setActiveTab] = useState<Tab>("accounts");
  const [printAll, setPrintAll] = useState(false);
  const [viewMonth, setViewMonth] = useState(() => currentMonth());
  const [userName, setUserName] = useState<string | null>(null);
  const appState = useAppState();
  const router = useRouter();
  const printTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch logged-in user's first name
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        const fullName =
          user.user_metadata?.full_name ||
          user.user_metadata?.name ||
          user.email?.split("@")[0] ||
          null;
        const firstName = fullName?.split(" ")[0] ?? null;
        setUserName(firstName);
      }
    });
  }, []);

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

  const accountsTabProps = buildAccountsTabProps(deps);
  const affirmTabProps = buildAffirmTabProps(deps);
  const paycheckTabProps = buildPaycheckTabProps(
    deps,
    () => setActiveTab("affirm"),
    () => setActiveTab("savings")
  );
  const savingsTabProps = buildSavingsTabProps(deps, () => setActiveTab("paycheck"));

  return (
    <div className={styles.shell}>
      <div className={styles.stickyTop} data-print-hide>
        <Header
          userName={userName}
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
          <time className={styles.viewMonth} dateTime={currentMonth()}>
            {fmtMonthFull(currentMonth())}
          </time>
        </nav>
      </div>

      <main className={styles.content}>
        {printAll ? (
          <>
            <SafeAccountsTab {...accountsTabProps} />
            <div className={styles.printPageBreak} />
            <SafePaycheckTab {...paycheckTabProps} />
            <div className={styles.printPageBreak} />
            <SafeAffirmTab {...affirmTabProps} />
            <div className={styles.printPageBreak} />
            <SafeSavingsTab {...savingsTabProps} />
            <div className={styles.printPageBreak} />
            <SafeSnapshotsTab snapshots={s.snapshots} />
            {/* TODO: Add Activity tab content to print */}
          </>
        ) : (
          <>
            <div className={`${styles.tabPanel} ${activeTab === "accounts" ? styles.tabPanelActive : ""}`}>
              <SafeAccountsTab {...accountsTabProps} />
            </div>
            <div className={`${styles.tabPanel} ${activeTab === "paycheck" ? styles.tabPanelActive : ""}`}>
              <SafePaycheckTab {...paycheckTabProps} />
            </div>
            <div className={`${styles.tabPanel} ${activeTab === "affirm" ? styles.tabPanelActive : ""}`}>
              <SafeAffirmTab {...affirmTabProps} />
            </div>
            <div className={`${styles.tabPanel} ${activeTab === "savings" ? styles.tabPanelActive : ""}`}>
              <SafeSavingsTab {...savingsTabProps} />
            </div>
            <div className={`${styles.tabPanel} ${activeTab === "snapshots" ? styles.tabPanelActive : ""}`}>
              <SafeSnapshotsTab snapshots={s.snapshots} />
            </div>
            <div className={`${styles.tabPanel} ${activeTab === "activity" ? styles.tabPanelActive : ""}`}>
              <SafeActivityTab />
            </div>
          </>
        )}
      </main>
    </div>
  );
}
