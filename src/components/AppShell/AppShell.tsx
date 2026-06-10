"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { fmtMoney } from "@/lib/money";
import { currentMonth, fmtMonthFull } from "@/lib/dates";
import { useAppState } from "@/hooks/useAppState";
import { useIdleTimeout } from "@/hooks/useIdleTimeout";
import { useMilestones } from "@/hooks/useMilestones";
import { getMilestoneLabel, getUnseenMilestones } from "@/lib/milestones";
import { getHouseholdMonthSummary } from "@/lib/household/household";
import { createClient } from "@/lib/supabase/client";
import { withErrorBoundary } from "@/components/ui/withErrorBoundary/withErrorBoundary";
import { Header } from "@/components/AppShell/Header/Header";
import { ActiveTabProvider } from "@/components/AppShell/ActiveTabContext";
import {
  buildAccountsTabProps,
  buildAffirmTabProps,
  buildHomeTabProps,
  buildPaycheckTabProps,
} from "@/components/AppShell/types";
import { HomeTab } from "@/components/HomeTab/HomeTab";
import { AccountsTab } from "@/components/AccountsTab";
import { AffirmTab } from "@/components/AffirmTab/AffirmTab";
import { PaycheckTab } from "@/components/PaycheckTab/PaycheckTab";
import { SnapshotsTab } from "@/components/SnapshotsTab";
import styles from "./AppShell.module.css";

type Tab = "home" | "accounts" | "paycheck" | "affirm" | "snapshots";

const DEFAULT_LOCAL_USER_NAME = "Adriane";

const TABS: { id: Tab; label: string }[] = [
  { id: "home",      label: "Home" },
  { id: "accounts",  label: "Accounts" },
  { id: "paycheck",  label: "Income" },
  { id: "affirm",    label: "Payoff" },
  { id: "snapshots", label: "Snapshots" },
];

// Wrap each tab in an isolated error boundary so one crash doesn't kill the shell.
const SafeHomeTab = withErrorBoundary(HomeTab, "HomeTab");
const SafeAccountsTab = withErrorBoundary(AccountsTab, "AccountsTab");
const SafeAffirmTab = withErrorBoundary(AffirmTab, "AffirmTab");
const SafePaycheckTab = withErrorBoundary(PaycheckTab, "PaycheckTab");
const SafeSnapshotsTab = withErrorBoundary(SnapshotsTab, "SnapshotsTab");

function isWithin24Hrs(isoDatetime: string): boolean {
  return Date.now() - new Date(isoDatetime).getTime() < 86_400_000;
}

export function AppShell() {
  const [activeTab, setActiveTab] = useState<Tab>("home");
  const [viewMonth, setViewMonth] = useState(() => currentMonth());
  const [userName, setUserName] = useState(DEFAULT_LOCAL_USER_NAME);
  const [navMessageIndex, setNavMessageIndex] = useState(0);
  const appState = useAppState();
  const router = useRouter();

  // Auto-logout after inactivity: real financial data must not stay
  // authenticated on an unattended device (council-flagged, Phase-1 security).
  useIdleTimeout();

  // Fetch logged-in user's first name
  useEffect(() => {
    const supabase = createClient();
    supabase.auth
      .getUser()
      .then(({ data: { user } }) => {
        if (!user) {
          return;
        }
        const fullName =
          user.user_metadata?.full_name ||
          user.user_metadata?.name ||
          user.email?.split("@")[0] ||
          DEFAULT_LOCAL_USER_NAME;
        const firstName = fullName.split(" ")[0] ?? DEFAULT_LOCAL_USER_NAME;
        if (firstName !== DEFAULT_LOCAL_USER_NAME) {
          setUserName(firstName);
        }
      })
      .catch(() => {});
  }, []);

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  };

  const { state: s, ...actions } = appState;

  // Derive notifications from paid-off Affirm plans
  // Derive new milestones from state changes and persist them
  useMilestones(s, actions.addMilestone);
  const unseenMilestones = getUnseenMilestones(s);
  const last24hrMilestones = unseenMilestones.filter((m) => isWithin24Hrs(m.achievedAt));
  const milestoneMessages = (last24hrMilestones.length > 0 ? last24hrMilestones : unseenMilestones)
    .slice(0, 4)
    .map((m) => getMilestoneLabel(m));
  const activeMonthSummary = getHouseholdMonthSummary({
    month: viewMonth,
    bills: s.bills,
    income: s.income,
    paycheck: s.paycheck,
    checkLog: s.checkLog,
    savingsLog: s.savingsLog,
    plans: s.plans,
  });
  const latestSnapshot = s.snapshots.at(-1) ?? null;
  const tabMessages = useMemo(() => {
    switch (activeTab) {
      case "home":
        return [
          activeMonthSummary.shortfallCents > 0
            ? `${fmtMoney(activeMonthSummary.shortfallCents)} short this month`
            : `${fmtMoney(Math.abs(activeMonthSummary.shortfallCents))} left this month`,
          activeMonthSummary.weeksEntered > 0
            ? `${activeMonthSummary.weeksEntered} weeks entered`
            : "Log this week's check",
        ];
      case "accounts":
        return [
          activeMonthSummary.shortfallCents > 0
            ? `${fmtMoney(activeMonthSummary.shortfallCents)} still needs coverage`
            : `${fmtMoney(Math.abs(activeMonthSummary.shortfallCents))} available after bills`,
          `${fmtMoney(activeMonthSummary.totalExpenseCents)} total obligations`,
        ];
      case "paycheck":
        return [
          activeMonthSummary.weeksEntered > 0
            ? `${activeMonthSummary.weeksEntered} weeks entered`
            : "Add this week's check",
          `${fmtMoney(activeMonthSummary.kiasPayCents)} from Kia's pay`,
        ];
      case "affirm":
        return [
          `${s.plans.length} active plan${s.plans.length === 1 ? "" : "s"}`,
          `${fmtMoney(activeMonthSummary.affirmBurdenCents)} current burden`,
        ];
      case "snapshots":
        return latestSnapshot
          ? [
              `Latest snapshot: ${fmtMonthFull(latestSnapshot.month)}`,
              latestSnapshot.shortfall > 0
                ? `${fmtMoney(latestSnapshot.shortfall)} short at close`
                : `${fmtMoney(Math.abs(latestSnapshot.shortfall))} left at close`,
            ]
          : ["No snapshots yet", "Close a month to save history"];
    }
  }, [activeMonthSummary, activeTab, latestSnapshot, s.plans.length]);

  const [prevTab, setPrevTab] = useState(activeTab);
  if (prevTab !== activeTab) {
    setPrevTab(activeTab);
    setNavMessageIndex(0);
  }

  useEffect(() => {
    if (tabMessages.length <= 1) return;
    let rotateTimer: number | undefined;
    const startTimer = window.setTimeout(() => {
      rotateTimer = window.setInterval(() => {
        setNavMessageIndex((prev) => (prev + 1) % tabMessages.length);
      }, 3000);
    }, 500);
    return () => {
      window.clearTimeout(startTimer);
      if (rotateTimer) window.clearInterval(rotateTimer);
    };
  }, [activeTab, tabMessages]);

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
  );

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

  const renderActiveTab = () => {
    switch (activeTab) {
      case "home":
        return <SafeHomeTab {...homeTabProps} />;
      case "accounts":
        return <SafeAccountsTab {...accountsTabProps} />;
      case "paycheck":
        return <SafePaycheckTab {...paycheckTabProps} />;
      case "affirm":
        return <SafeAffirmTab {...affirmTabProps} />;
      case "snapshots":
        return <SafeSnapshotsTab snapshots={s.snapshots} />;
    }
  };

  return (
    <ActiveTabProvider value={activeTab}>
    <div className={styles.shell}>
      <div className={styles.bgOrbs} aria-hidden="true">
        <div className={`${styles.orb} ${styles.orb1}`} />
        <div className={`${styles.orb} ${styles.orb2}`} />
        <div className={`${styles.orb} ${styles.orb3}`} />
      </div>
      <div className={styles.stickyTop}>
        <Header
          userName={userName}
          onSignOut={handleSignOut}
          milestones={last24hrMilestones}
          unseenCount={unseenMilestones.length}
        />
        <nav className={styles.tabBar}>
          {TABS.map((tab) => (
            <button
              key={tab.id}
              className={`${styles.tabButton} ${activeTab === tab.id ? styles.tabButtonActive : ""}`}
              onClick={(e) => handleTabClick(tab.id, e)}
              disabled={activeTab === tab.id}
              aria-selected={activeTab === tab.id}
              aria-current={activeTab === tab.id ? "page" : undefined}
              role="tab"
            >
              {tab.label}
            </button>
          ))}
          <div className={styles.navStatus} aria-live="polite">
            <div className={styles.navTicker}>
              <div className={styles.navTickerTrack}>
                <span key={`${activeTab}-${navMessageIndex}`} className={styles.navMessage}>
                  {tabMessages[navMessageIndex] ?? milestoneMessages[0] ?? "All caught up"}
                </span>
              </div>
            </div>
          </div>
          <time className={styles.viewMonth} dateTime={viewMonth}>
            {fmtMonthFull(viewMonth)}
          </time>
        </nav>
      </div>

      <main className={styles.content}>
        <div key={activeTab} className={`${styles.tabPanel} ${styles.tabPanelActive}`}>
          {renderActiveTab()}
        </div>
      </main>
    </div>
    </ActiveTabProvider>
  );
}
