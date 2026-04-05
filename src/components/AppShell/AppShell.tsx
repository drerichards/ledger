"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { advanceMonth, currentMonth, fmtMonthFull } from "@/lib/dates";
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
import { PaycheckTab } from "@/components/PaycheckTab/PaycheckTab";
import { AffirmTab } from "@/components/AffirmTab/AffirmTab";
import { SavingsTab } from "@/components/SavingsTab/SavingsTab";
import { HistoryTab } from "@/components/HistoryTab/HistoryTab";
import { ActivityTab } from "@/components/ActivityTab/ActivityTab";
import styles from "./AppShell.module.css";

type Tab = "bills" | "paycheck" | "affirm" | "savings" | "history" | "activity";

const TABS: { id: Tab; label: string }[] = [
  { id: "bills",    label: "Accounts"  },
  { id: "paycheck", label: "Paycheck"  },
  { id: "affirm",   label: "Affirm"    },
  { id: "savings",  label: "Savings"   },
  { id: "history",  label: "Snapshots" },
  { id: "activity", label: "Activity"  },
];

// Wrap each tab in an isolated error boundary so one crash doesn't kill the shell.
const SafeBillChart = withErrorBoundary(BillChart, "BillChart");
const SafePaycheckTab = withErrorBoundary(PaycheckTab, "PaycheckTab");
const SafeAffirmTab = withErrorBoundary(AffirmTab, "AffirmTab");
const SafeSavingsTab = withErrorBoundary(SavingsTab, "SavingsTab");
const SafeActivityTab = withErrorBoundary(ActivityTab, "ActivityTab");
const SafeHistoryTab = withErrorBoundary(HistoryTab, "HistoryTab");

export function AppShell() {
  // Always start with "bills" so server and client render identically (no hydration mismatch).
  // After hydration, read the URL and jump to the correct tab.
  const [activeTab, setActiveTab] = useState<Tab>("bills");

  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get(
      "tab",
    ) as Tab | null;
    if (t && TABS.some((tab) => tab.id === t)) {
      setActiveTab(t);
    }
  }, []);
  const [printAll, setPrintAll] = useState(false);
  const [viewMonth, setViewMonth] = useState(() =>
    advanceMonth(currentMonth(), 1),
  );
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

  const handleTabChange = (tab: Tab) => {
    setActiveTab(tab);
    const url = new URL(window.location.href);
    url.searchParams.set("tab", tab);
    window.history.replaceState(null, "", url.toString());
  };

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
  const paycheckTabProps = buildPaycheckTabProps(deps);
  const affirmTabProps = buildAffirmTabProps(deps);
  const savingsTabProps = buildSavingsTabProps(deps);

  return (
    <div className={styles.shell}>
      <div className={styles.stickyTop} data-print-hide>
        <Header
          userName={userName}
          notifications={notifications}
          seenNotificationIds={s.seenNotificationIds ?? []}
          onMarkNotificationsSeen={actions.markNotificationsSeen}
          onNavigateToAffirm={() => handleTabChange("affirm")}
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
              onClick={() => handleTabChange(tab.id)}
              aria-selected={activeTab === tab.id}
              role="tab"
            >
              {tab.label}
            </button>
          ))}
          <time className={styles.viewMonth} dateTime={viewMonth}>
            {fmtMonthFull(viewMonth)}
          </time>
        </nav>
      </div>

      <main className={styles.content}>
        {printAll ? (
          <>
            <SafeBillChart {...billChartProps} />
            <div className={styles.printPageBreak} />
            <SafePaycheckTab {...paycheckTabProps} />
            <div className={styles.printPageBreak} />
            <SafeAffirmTab {...affirmTabProps} />
            <div className={styles.printPageBreak} />
            <SafeSavingsTab {...savingsTabProps} />
            <div className={styles.printPageBreak} />
            <SafeActivityTab bills={s.bills} />
            <div className={styles.printPageBreak} />
            <SafeHistoryTab snapshots={s.snapshots} />
          </>
        ) : (
          <>
            {activeTab === "bills" && <SafeBillChart {...billChartProps} />}
            {activeTab === "paycheck" && (
              <SafePaycheckTab {...paycheckTabProps} />
            )}
            {activeTab === "affirm" && <SafeAffirmTab {...affirmTabProps} />}
            {activeTab === "savings" && <SafeSavingsTab {...savingsTabProps} />}
            {activeTab === "activity" && <SafeActivityTab bills={s.bills} />}
            {activeTab === "history" && (
              <SafeHistoryTab snapshots={s.snapshots} />
            )}
          </>
        )}
      </main>
    </div>
  );
}
