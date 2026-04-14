"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { currentMonth, fmtMonthFull } from "@/lib/dates";
import { useAppState } from "@/hooks/useAppState";
import { useMilestones } from "@/hooks/useMilestones";
import { MilestoneToast } from "@/components/ui/MilestoneToast";
import { getUnseenMilestones } from "@/lib/milestones";
import { createClient } from "@/lib/supabase/client";
import { withErrorBoundary } from "@/components/ui/withErrorBoundary/withErrorBoundary";
import { Header } from "@/components/AppShell/Header/Header";
import {
  buildAccountsTabProps,
  buildAffirmTabProps,
  buildHomeTabProps,
  buildPaycheckTabProps,
  buildSavingsTabProps,
} from "@/components/AppShell/types";
import { HomeTab } from "@/components/HomeTab/HomeTab";
import { AccountsTab } from "@/components/AccountsTab";
import { AffirmTab } from "@/components/AffirmTab/AffirmTab";
import { PaycheckTab } from "@/components/PaycheckTab/PaycheckTab";
import { SavingsTab } from "@/components/SavingsTab/SavingsTab";
import { SnapshotsTab } from "@/components/SnapshotsTab";
import { ActivityTab } from "@/components/ActivityTab";
import styles from "./AppShell.module.css";

type Tab = "home" | "accounts" | "paycheck" | "affirm" | "savings" | "snapshots" | "activity";

const TABS: { id: Tab; label: string }[] = [
  { id: "home",      label: "Home" },
  { id: "accounts",  label: "Bills" },
  { id: "paycheck",  label: "Income" },
  { id: "affirm",    label: "Debt" },
  { id: "savings",   label: "Goals" },
  { id: "snapshots", label: "Snapshots" },
  { id: "activity",  label: "Activity" },
];

// Wrap each tab in an isolated error boundary so one crash doesn't kill the shell.
const SafeHomeTab = withErrorBoundary(HomeTab, "HomeTab");
const SafeAccountsTab = withErrorBoundary(AccountsTab, "AccountsTab");
const SafeAffirmTab = withErrorBoundary(AffirmTab, "AffirmTab");
const SafePaycheckTab = withErrorBoundary(PaycheckTab, "PaycheckTab");
const SafeSavingsTab = withErrorBoundary(SavingsTab, "SavingsTab");
const SafeSnapshotsTab = withErrorBoundary(SnapshotsTab, "SnapshotsTab");
const SafeActivityTab = withErrorBoundary(ActivityTab, "ActivityTab");

function isWithin24Hrs(isoDatetime: string): boolean {
  return Date.now() - new Date(isoDatetime).getTime() < 86_400_000;
}

export function AppShell() {
  const [activeTab, setActiveTab] = useState<Tab>("home");
  const [viewMonth, setViewMonth] = useState(() => currentMonth());
  const [userName, setUserName] = useState<string | null>(null);
  const appState = useAppState();
  const router = useRouter();

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

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  };

  const handleDevReset = async () => {
    if (!confirm("Reset all data to seed state? This cannot be undone.")) return;
    await actions.resetToSeed();
  };

  const { state: s, ...actions } = appState;

  // Derive notifications from paid-off Affirm plans
  // Derive new milestones from state changes and persist them
  useMilestones(s, actions.addMilestone);
  const unseenMilestones = getUnseenMilestones(s);
  const last24hrMilestones = unseenMilestones.filter((m) => isWithin24Hrs(m.achievedAt));

  const deps = {
    state: s,
    actions,
    viewMonth,
    onViewMonthChange: setViewMonth,
  };

  const homeTabProps = buildHomeTabProps(deps);
  const accountsTabProps = buildAccountsTabProps(deps);
  const affirmTabProps = buildAffirmTabProps(deps);
  const paycheckTabProps = buildPaycheckTabProps(
    deps,
    () => setActiveTab("affirm"),
    () => setActiveTab("savings")
  );
  const savingsTabProps = buildSavingsTabProps(deps, () => setActiveTab("paycheck"));

  const handleTabClick = (tabId: Tab, e: React.MouseEvent<HTMLButtonElement>) => {
    setActiveTab(tabId);
    const btn = e.currentTarget;
    const rect = btn.getBoundingClientRect();
    const ripple = document.createElement("span");
    ripple.className = "ripple";
    ripple.style.left = `${e.clientX - rect.left - 10}px`;
    ripple.style.top = `${e.clientY - rect.top - 10}px`;
    btn.style.position = "relative";
    btn.style.overflow = "hidden";
    btn.appendChild(ripple);
    ripple.addEventListener("animationend", () => ripple.remove(), { once: true });
  };

  return (
    <div className={styles.shell}>
      <div className={styles.bgOrbs} aria-hidden="true" data-print-hide>
        <div className={`${styles.orb} ${styles.orb1}`} />
        <div className={`${styles.orb} ${styles.orb2}`} />
        <div className={`${styles.orb} ${styles.orb3}`} />
      </div>
      <div className={styles.stickyTop} data-print-hide>
        <Header
          userName={userName}
          onSignOut={handleSignOut}
          onResetToSeed={handleDevReset}
          milestones={last24hrMilestones}
          unseenCount={unseenMilestones.length}
          onGoToActivity={() => setActiveTab("activity")}
        />
        <nav className={styles.tabBar}>
          {TABS.map((tab) => (
            <button
              key={tab.id}
              className={`${styles.tabButton} ${activeTab === tab.id ? styles.tabButtonActive : ""}`}
              onClick={(e) => handleTabClick(tab.id, e)}
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
        <div className={`${styles.tabPanel} ${activeTab === "home" ? styles.tabPanelActive : ""}`}>
          <SafeHomeTab {...homeTabProps} />
        </div>
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
      </main>
      <MilestoneToast
        milestones={unseenMilestones}
        onDismiss={actions.markMilestoneSeen}
      />
    </div>
  );
}
