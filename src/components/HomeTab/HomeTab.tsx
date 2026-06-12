"use client";

import { useState } from "react";
import type {
  BankAccount,
  Bill,
  BillCategory,
  InstallmentPlan,
  KiasCheckEntry,
  MonthlyIncome,
  PaycheckWeek,
  SavingsEntry,
  SavingsGoal,
} from "@/types";
import { fmtMoney, sumCents } from "@/lib/money";
import { today, mondayOf, addDays, fmtDayMonth, fmtMonthFull } from "@/lib/dates";
import {
  getAffirmTotalForMonth,
  getHouseholdMonthSummary,
  getUpcomingDueItems,
  projectCashFlowRows,
} from "@/lib/household/household";
import { ActionStrip } from "./ActionStrip";
import { SpendingDonut } from "./SpendingDonut";
import type { DonutSegment } from "./SpendingDonut";
import { DayDetail } from "./DayDetail";
import type { DayItem } from "./DayDetail";
import { MomentumGauges } from "./MomentumGauges";
import type { GaugeData } from "./MomentumGauges";
import type { GaugeTone } from "./GaugeMeter";
import styles from "./HomeTab.module.css";

type Props = {
  checkingBalance: number; // cents — legacy fallback when no bankAccounts
  checkingBalanceDate: string; // YYYY-MM-DD or "" — legacy fallback
  bankAccounts: BankAccount[];
  bills: Bill[];
  income: MonthlyIncome[];
  plans: InstallmentPlan[];
  paycheck: PaycheckWeek[];
  checkLog: KiasCheckEntry[];
  savingsLog: SavingsEntry[];
  goals: SavingsGoal[];
  onSetBalance: (balance: number, date: string) => void;
  onAddBankAccount: (account: BankAccount) => void;
  onUpdateBankAccount: (account: BankAccount) => void;
  onDeleteBankAccount: (id: string) => void;
  onTogglePaid: (id: string) => void;
  onGoToPayoff?: () => void;
};

const WEEKDAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

// All nine BillCategory values — donut groups this month's bills by these.
const DONUT_CATEGORIES: BillCategory[] = [
  "Housing",
  "Utilities",
  "Insurance",
  "Transfers",
  "Subscriptions",
  "Credit Cards",
  "Loans",
  "Savings",
  "Other",
];

// ── Main HomeTab ───────────────────────────────────────────────────────────────

export function HomeTab({
  checkingBalance,
  bankAccounts,
  bills,
  income,
  plans,
  paycheck,
  checkLog,
  savingsLog,
  goals,
  onTogglePaid,
  onGoToPayoff,
}: Props) {
  const [activeDate, setActiveDate] = useState("");

  const todayStr = today();
  const currentMonday = mondayOf(todayStr);
  const currentSunday = addDays(currentMonday, 6);
  const month = todayStr.slice(0, 7);
  const todayDom = Number(todayStr.slice(8, 10));

  const monthSummary = getHouseholdMonthSummary({
    month,
    bills,
    income,
    paycheck,
    checkLog,
    savingsLog,
    plans,
  });

  // Effective checking balance: sum of bank accounts when present, else legacy single balance.
  const bankAccountsTotal =
    bankAccounts.length > 0 ? sumCents(bankAccounts.map((a) => a.balanceCents)) : checkingBalance;

  const thisWeekRows = projectCashFlowRows({
    startBalance: bankAccountsTotal,
    bills,
    plans,
    paycheck,
    checkLog,
    month,
    fromDate: currentMonday,
    toDate: currentSunday,
    aggregateAffirm: true,
  });

  // ── Verdict hero — month-level answer-first summary ──
  const isCoveredMonth = monthSummary.shortfallCents <= 0;
  const amountLeftCents = Math.abs(monthSummary.shortfallCents);

  // ── Bills handled (progress bar + gauge) ──
  const monthBills = bills.filter((b) => b.month === month);
  const paidCount = monthBills.filter((b) => b.paid).length;
  const totalBills = monthBills.length;
  const handledPct = totalBills > 0 ? paidCount / totalBills : 0;

  // ── Action strip data ──
  const upcoming = getUpcomingDueItems({
    month,
    bills,
    plans,
    fromDate: todayStr,
    limit: 20,
    aggregateAffirm: true,
  });
  const nextBillItem = upcoming.find((i) => i.kind === "bill") ?? null;
  const nextBill = nextBillItem
    ? { id: nextBillItem.id, name: nextBillItem.label, cents: nextBillItem.cents }
    : null;

  const nextIncomeRow = thisWeekRows.find((r) => r.type === "income" && r.date >= todayStr);
  const nextPaycheck = nextIncomeRow
    ? { whenLabel: fmtDayMonth(nextIncomeRow.date), cents: nextIncomeRow.cents }
    : null;

  const overdueBills = monthBills.filter((b) => !b.paid && b.method === "transfer" && b.due < todayDom);
  const overdue = { count: overdueBills.length, cents: sumCents(overdueBills.map((b) => b.cents)) };

  // ── Donut — this month's bills grouped by category ──
  const donutSegments: DonutSegment[] = DONUT_CATEGORIES.map((category) => ({
    category,
    cents: sumCents(monthBills.filter((b) => b.category === category).map((b) => b.cents)),
  })).filter((s) => s.cents > 0);
  const donutSubtitle = `${fmtMonthFull(month)} so far`;

  // ── Week rail + day detail ──
  type WeekDay = {
    key: string;
    name: string;
    date: string;
    payday: boolean;
    paycheck: number; // cents
    items: DayItem[];
    endBalance: number; // cents
  };
  const weekDays = WEEKDAY_NAMES.reduce<WeekDay[]>((acc, name, i) => {
    const date = addDays(currentMonday, i);
    const dom = Number(date.slice(8, 10));
    const rows = thisWeekRows.filter((r) => r.date === date);
    const incomeCents = rows.filter((r) => r.type === "income").reduce((a, r) => a + r.cents, 0);
    const prevEnd = acc.length ? acc[acc.length - 1].endBalance : bankAccountsTotal;
    const endBalance = rows.length ? rows[rows.length - 1].runningBalance : prevEnd;
    const items: DayItem[] = monthBills
      .filter((b) => b.due === dom)
      .map((b) => ({
        id: b.id,
        name: b.name,
        kind: (b.method === "transfer" ? "pay" : "auto") as "pay" | "auto",
        amt: b.cents,
      }));
    acc.push({
      key: date,
      name,
      date: fmtDayMonth(date),
      payday: incomeCents > 0,
      paycheck: incomeCents,
      items,
      endBalance,
    });
    return acc;
  }, []);
  const activeKey = activeDate || todayStr;
  const activeDay = weekDays.find((d) => d.key === activeKey) ?? weekDays[0];

  // ── Momentum gauges ──
  const affirmThisMonth = getAffirmTotalForMonth(plans, month);
  const activePlans = plans.filter((p) => p.start <= month && p.end >= month).length;

  const primaryGoal = goals[0] ?? null;
  const goalSaved = primaryGoal ? sumCents(savingsLog.map((e) => e.amount)) : 0;
  const goalTarget = primaryGoal?.targetCents ?? 0;
  const goalPct = goalTarget > 0 ? Math.min(1, goalSaved / goalTarget) : 0;
  const goalTone: GaugeTone = goalPct > 0.6 ? "olive" : goalPct >= 0.3 ? "amber" : "rust";

  const gauges: [GaugeData, GaugeData, GaugeData] = [
    {
      value: handledPct,
      tone: handledPct >= 0.66 ? "olive" : handledPct >= 0.33 ? "amber" : "rust",
      big: `${paidCount}/${totalBills}`,
      label: "Bills handled",
      tag: handledPct >= 0.66 ? "ON TRACK" : handledPct >= 0.33 ? "GETTING THERE" : "EARLY",
    },
    {
      value: activePlans > 0 ? 0.5 : 1,
      tone: activePlans > 0 ? "amber" : "olive",
      big: activePlans > 0 ? fmtMoney(affirmThisMonth) : "—",
      label: "Next payoff",
      tag: activePlans > 0 ? "SOON" : "CLEAR",
      onClick: onGoToPayoff, // links to the Payoff tab totals
    },
    {
      value: goalPct,
      tone: primaryGoal ? goalTone : "navy",
      big: primaryGoal ? `${Math.round(goalPct * 100)}%` : "—",
      label: primaryGoal ? primaryGoal.label : "No goal yet",
      // No "set one" call-to-action — goals are entered from Savings, not nudged here.
      tag: primaryGoal ? (goalPct >= 0.6 ? "CLOSE" : goalPct >= 0.3 ? "BUILDING" : "EARLY") : "",
    },
  ];

  return (
    <div className={styles.bento}>
      {/* ── 1. The answer — verdict ──────────────────────────────────── */}
      <div className={`${styles.tile} ${styles.tileAnswer}`}>
        <div className={`${styles.verdict} ${isCoveredMonth ? styles.verdictGood : styles.verdictBad}`}>
          <span className={styles.vBadge}>
            <span className={styles.vPulse} aria-hidden="true" />
            THE ANSWER
          </span>
          <p className={styles.vLabel}>{isCoveredMonth ? "You're covered" : "You'll need to add"}</p>
          <p className={styles.vNum}>{fmtMoney(amountLeftCents)}</p>
          <p className={styles.vSub}>
            {isCoveredMonth ? "left after all bills this month" : "to cover every bill this month"}
          </p>

          <div className={styles.vProgress}>
            <progress
              className={styles.vProgressBar}
              value={paidCount}
              max={totalBills || 1}
              aria-label={`${paidCount} of ${totalBills} bills handled this month`}
            />
            <span className={styles.vProgressLabel}>
              {paidCount} of {totalBills} bills handled this month
            </span>
          </div>
        </div>
      </div>

      {/* ── 2. Action stats ──────────────────────────────────────────── */}
      <div className={`${styles.tile} ${styles.tileStats}`}>
        <ActionStrip
          nextBill={nextBill}
          nextPaycheck={nextPaycheck}
          overdue={overdue}
          onMarkPaid={onTogglePaid}
        />
      </div>

      {/* ── 3. Where your money goes — donut ─────────────────────────── */}
      <div className={`${styles.tile} ${styles.tileDonut}`}>
        <SpendingDonut segments={donutSegments} subtitle={donutSubtitle} />
      </div>

      {/* ── 4. This week — day rail ──────────────────────────────────── */}
      <div className={`${styles.tile} ${styles.tileWeek}`}>
        <section className={styles.week}>
          <div className={styles.weekHead}>
            <p className={styles.panelTitle}>This week</p>
            <p className={styles.panelMeta}>
              {fmtDayMonth(currentMonday)} – {fmtDayMonth(currentSunday)} · tap a day
            </p>
          </div>
          <div className={styles.weekGrid}>
            {weekDays.map((d) => {
              const total = d.items.reduce((a, b) => a + b.amt, 0);
              const status = d.payday
                ? "olive"
                : d.items.some((i) => i.kind === "pay")
                  ? "rust"
                  : d.items.some((i) => i.kind === "auto")
                    ? "gray"
                    : "none";
              return (
                <button
                  key={d.key}
                  type="button"
                  className={`${styles.wday} ${d.key === activeKey ? styles.wdayOn : ""}`}
                  onClick={() => setActiveDate(d.key)}
                  aria-pressed={d.key === activeKey}
                >
                  <span className={styles.wdayHead}>
                    <span className={styles.wdayName}>{d.name}</span>
                    <span className={styles.wdayDate}>{d.date.replace(/^\w+\s/, "")}</span>
                  </span>
                  {d.payday && <span className={styles.wdayPayday}>+{fmtMoney(d.paycheck)}</span>}
                  {total > 0 ? (
                    <span className={styles.wdayTotal}>{fmtMoney(total)}</span>
                  ) : !d.payday ? (
                    <span className={styles.wdayNothing}>—</span>
                  ) : null}
                  {d.items.length > 0 && (
                    <span className={styles.wdayCount}>
                      {d.items.length} bill{d.items.length !== 1 ? "s" : ""}
                    </span>
                  )}
                  <span className={`${styles.wdayDot} ${styles[`dot_${status}`]}`} aria-hidden="true" />
                </button>
              );
            })}
          </div>
        </section>
      </div>

      {/* ── 5. Selected day detail ───────────────────────────────────── */}
      <div className={`${styles.tile} ${styles.tileDetail}`}>
        {activeDay && <DayDetail day={activeDay} onMarkPaid={onTogglePaid} />}
      </div>

      {/* ── 6. Momentum — gauges ─────────────────────────────────────── */}
      <div className={`${styles.tile} ${styles.tileMom}`}>
        <MomentumGauges gauges={gauges} />
      </div>
    </div>
  );
}
