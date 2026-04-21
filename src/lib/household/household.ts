import type {
  Bill,
  InstallmentPlan,
  KiasCheckEntry,
  MonthlyIncome,
  MonthSnapshot,
  PaycheckWeek,
  SavingsEntry,
} from "@/types";
import { getMondaysInMonth, mondayOf } from "@/lib/dates";
import { INCOME_DEFAULTS } from "@/lib/income";
import { calcShortfall, sumCents } from "@/lib/money";
import { sumWeekColumns } from "@/lib/paycheck";

export type HouseholdMonthSummary = {
  month: string;
  visibleBills: Bill[];
  kiasBills: Bill[];
  otherBills: Bill[];
  kiasBillsCents: number;
  otherBillsCents: number;
  fixedBillsCents: number;
  affirmBurdenCents: number;
  totalExpenseCents: number;
  paidBillsCents: number;
  kiasPayCents: number;
  fixedIncome: MonthlyIncome;
  fixedIncomeCents: number;
  totalIncomeCents: number;
  shortfallCents: number;
  savingsMovedCents: number;
  weeksEntered: number;
};

export type CashFlowRow = {
  date: string;
  payee: string;
  cents: number;
  runningBalance: number;
  type: "income" | "bill" | "affirm";
};

export type DueItem = {
  id: string;
  date: string;
  label: string;
  cents: number;
  kind: "bill" | "affirm";
};

function fridayOf(weekOf: string): string {
  const [y, m, d] = weekOf.split("-").map(Number);
  const date = new Date(y, m - 1, d + 4);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate(),
  ).padStart(2, "0")}`;
}

function clampDueDay(day: number): number {
  return Math.min(Math.max(day, 1), 31);
}

function monthDate(month: string, day: number): string {
  const [year, monthNum] = month.split("-").map(Number);
  const lastDay = new Date(year, monthNum, 0).getDate();
  return `${month}-${String(Math.min(day, lastDay)).padStart(2, "0")}`;
}

function findWeekAmount(
  monday: string,
  paycheck: PaycheckWeek[],
  checkLog: KiasCheckEntry[],
): number {
  const checkEntry = checkLog.find((entry) => mondayOf(entry.weekOf) === monday);
  if (checkEntry) return checkEntry.amount;
  return paycheck.find((week) => week.weekOf === monday)?.kiasPay ?? 0;
}

function planDueDayFromLabel(label: string): number | null {
  const match = label.match(/due\s+(\d{1,2})/i);
  if (!match) return null;
  return clampDueDay(Number(match[1]));
}

export function getPlanDueDay(plan: InstallmentPlan): number {
  if (typeof plan.dueDay === "number") return clampDueDay(plan.dueDay);
  return planDueDayFromLabel(plan.label) ?? 1;
}

export function isAggregateAffirmBill(
  bill: Bill,
  plans: InstallmentPlan[],
): boolean {
  if (bill.name.trim().toLowerCase() !== "affirm") return false;
  const monthTotal = getAffirmTotalForMonth(plans, bill.month);
  return monthTotal > 0 && bill.cents === monthTotal;
}

export function getAffirmTotalForMonth(
  plans: InstallmentPlan[],
  month: string,
): number {
  return sumCents(
    plans
      .filter((plan) => plan.start <= month && plan.end >= month)
      .map((plan) => plan.mc),
  );
}

export function getVisibleBillsForMonth(
  bills: Bill[],
  plans: InstallmentPlan[],
  month: string,
): Bill[] {
  return bills.filter(
    (bill) => bill.month === month && !isAggregateAffirmBill(bill, plans),
  );
}

export function getMonthlyFixedIncome(
  month: string,
  income: MonthlyIncome[],
): MonthlyIncome {
  const record = income.find((entry) => entry.month === month);
  return {
    month,
    kias_pay: 0,
    military_pay: record?.military_pay ?? INCOME_DEFAULTS.military_pay,
    retirement: record?.retirement ?? INCOME_DEFAULTS.retirement,
    social_security: record?.social_security ?? INCOME_DEFAULTS.social_security,
  };
}

export function getKiasPayForMonth(
  month: string,
  paycheck: PaycheckWeek[],
  checkLog: KiasCheckEntry[],
): number {
  return sumCents(
    getMondaysInMonth(month).map((monday) => findWeekAmount(monday, paycheck, checkLog)),
  );
}

export function getWeeksEnteredForMonth(
  month: string,
  paycheck: PaycheckWeek[],
  checkLog: KiasCheckEntry[],
): number {
  return getMondaysInMonth(month).filter(
    (monday) => findWeekAmount(monday, paycheck, checkLog) > 0,
  ).length;
}

export function getSavingsMovedForMonth(
  month: string,
  savingsLog: SavingsEntry[],
): number {
  return sumCents(
    savingsLog
      .filter((entry) => (entry.date ?? entry.weekOf ?? "").startsWith(month))
      .map((entry) => entry.amount),
  );
}

export function getHouseholdMonthSummary(params: {
  month: string;
  bills: Bill[];
  income: MonthlyIncome[];
  paycheck: PaycheckWeek[];
  checkLog: KiasCheckEntry[];
  savingsLog: SavingsEntry[];
  plans: InstallmentPlan[];
}): HouseholdMonthSummary {
  const { month, bills, income, paycheck, checkLog, savingsLog, plans } = params;
  const visibleBills = getVisibleBillsForMonth(bills, plans, month);
  const kiasBills = visibleBills.filter((bill) => bill.group === "kias_pay");
  const otherBills = visibleBills.filter((bill) => bill.group === "other_income");
  const kiasBillsCents = sumCents(kiasBills.map((bill) => bill.cents));
  const otherBillsCents = sumCents(otherBills.map((bill) => bill.cents));
  const fixedBillsCents = kiasBillsCents + otherBillsCents;
  const affirmBurdenCents = getAffirmTotalForMonth(plans, month);
  const paidBillsCents = sumCents(
    visibleBills.filter((bill) => bill.paid).map((bill) => bill.cents),
  );
  const fixedIncome = getMonthlyFixedIncome(month, income);
  const fixedIncomeCents = sumCents([
    fixedIncome.military_pay,
    fixedIncome.retirement,
    fixedIncome.social_security,
  ]);
  const kiasPayCents = getKiasPayForMonth(month, paycheck, checkLog);
  const totalIncomeCents = kiasPayCents + fixedIncomeCents;
  const totalExpenseCents = fixedBillsCents + affirmBurdenCents;
  const shortfallCents = calcShortfall(totalExpenseCents, totalIncomeCents);
  const savingsMovedCents = getSavingsMovedForMonth(month, savingsLog);
  const weeksEntered = getWeeksEnteredForMonth(month, paycheck, checkLog);

  return {
    month,
    visibleBills,
    kiasBills,
    otherBills,
    kiasBillsCents,
    otherBillsCents,
    fixedBillsCents,
    affirmBurdenCents,
    totalExpenseCents,
    paidBillsCents,
    kiasPayCents,
    fixedIncome,
    fixedIncomeCents,
    totalIncomeCents,
    shortfallCents,
    savingsMovedCents,
    weeksEntered,
  };
}

export function getMonthSnapshotFromSummary(
  summary: HouseholdMonthSummary,
): MonthSnapshot {
  return {
    month: summary.month,
    totalBilled: summary.totalExpenseCents,
    totalPaid: summary.paidBillsCents,
    shortfall: summary.shortfallCents,
    savingsMoved: summary.savingsMovedCents,
    kiasPayActual: summary.kiasPayCents,
  };
}

export function getPaycheckAllocatedForMonth(params: {
  month: string;
  paycheck: PaycheckWeek[];
  checkLog: KiasCheckEntry[];
  plans: InstallmentPlan[];
  savingsLog: SavingsEntry[];
  columns: Array<{ key: string }>;
}): number {
  const { month, paycheck, checkLog, plans, savingsLog, columns } = params;
  const mondays = getMondaysInMonth(month);
  const savingsByWeek = new Map<string, number>();
  savingsLog.forEach((entry) => {
    const date = entry.date ?? entry.weekOf ?? "";
    if (!date.startsWith(month)) return;
    const monday = mondayOf(date);
    savingsByWeek.set(monday, (savingsByWeek.get(monday) ?? 0) + entry.amount);
  });

  const affirmPerWeek =
    mondays.length > 0 ? Math.round(getAffirmTotalForMonth(plans, month) / mondays.length) : 0;

  return sumCents(
    mondays.map((monday) => {
      const week =
        paycheck.find((entry) => entry.weekOf === monday) ?? {
          weekOf: monday,
          kiasPay: findWeekAmount(monday, paycheck, checkLog),
          storage: 0,
          rent: 0,
          jazmin: 0,
          dre: 0,
          savings: 0,
          paypalCC: 0,
          deductions: 0,
          extra: {},
        };
      return sumWeekColumns(
        week,
        columns as never,
        affirmPerWeek,
        savingsByWeek.get(monday) ?? 0,
      );
    }),
  );
}

export function getUpcomingDueItems(params: {
  month: string;
  bills: Bill[];
  plans: InstallmentPlan[];
  fromDate: string;
  limit: number;
  aggregateAffirm?: boolean;
}): DueItem[] {
  const { month, bills, plans, fromDate, limit, aggregateAffirm = false } = params;
  const billItems: DueItem[] = getVisibleBillsForMonth(bills, plans, month)
    .filter((bill) => !bill.paid)
    .map((bill) => ({
      id: bill.id,
      date: monthDate(month, bill.due),
      label: bill.name,
      cents: bill.cents,
      kind: "bill" as const,
    }));

  const planItems: DueItem[] = plans
    .filter((plan) => plan.start <= month && plan.end >= month)
    .map((plan) => ({
      id: plan.id,
      date: monthDate(month, getPlanDueDay(plan)),
      label: plan.label,
      cents: plan.mc,
      kind: "affirm" as const,
    }));

  const upcomingPlanItems = aggregateAffirm
    ? Array.from(
        planItems.reduce((groups, item) => {
          const current = groups.get(item.date);
          if (current) {
            current.cents += item.cents;
            return groups;
          }
          groups.set(item.date, {
            id: `affirm-${item.date}`,
            date: item.date,
            label: "Affirm Payments",
            cents: item.cents,
            kind: "affirm" as const,
          });
          return groups;
        }, new Map<string, DueItem>()).values(),
      )
    : planItems;

  return [...billItems, ...upcomingPlanItems]
    .filter((item) => item.date >= fromDate)
    .sort((a, b) => a.date.localeCompare(b.date) || a.label.localeCompare(b.label))
    .slice(0, limit);
}

export function projectCashFlowRows(params: {
  startBalance: number;
  bills: Bill[];
  plans: InstallmentPlan[];
  paycheck: PaycheckWeek[];
  checkLog: KiasCheckEntry[];
  month: string;
  fromDate: string;
  toDate: string;
  aggregateAffirm?: boolean;
}): CashFlowRow[] {
  const {
    startBalance,
    bills,
    plans,
    paycheck,
    checkLog,
    month,
    fromDate,
    toDate,
    aggregateAffirm = false,
  } = params;
  const events: Omit<CashFlowRow, "runningBalance">[] = [];

  getVisibleBillsForMonth(bills, plans, month).forEach((bill) => {
    const date = monthDate(month, bill.due);
    if (date >= fromDate && date <= toDate) {
      events.push({ date, payee: bill.name, cents: -bill.cents, type: "bill" });
    }
  });

  if (aggregateAffirm) {
    const totalsByDate = plans.reduce((groups, plan) => {
      if (plan.start > month || plan.end < month) return groups;
      const date = monthDate(month, getPlanDueDay(plan));
      if (date < fromDate || date > toDate) return groups;
      groups.set(date, (groups.get(date) ?? 0) + plan.mc);
      return groups;
    }, new Map<string, number>());

    totalsByDate.forEach((cents, date) => {
      events.push({ date, payee: "Affirm Payments", cents: -cents, type: "affirm" });
    });
  } else {
    plans.forEach((plan) => {
      if (plan.start > month || plan.end < month) return;
      const date = monthDate(month, getPlanDueDay(plan));
      if (date >= fromDate && date <= toDate) {
        events.push({ date, payee: plan.label, cents: -plan.mc, type: "affirm" });
      }
    });
  }

  getMondaysInMonth(month).forEach((monday) => {
    const cents = findWeekAmount(monday, paycheck, checkLog);
    if (cents <= 0) return;
    const payDate = fridayOf(monday);
    if (payDate >= fromDate && payDate <= toDate) {
      events.push({
        date: payDate,
        payee: "Kia's Paycheck",
        cents,
        type: "income",
      });
    }
  });

  events.sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date);
    const aRank = a.type === "income" ? 0 : 1;
    const bRank = b.type === "income" ? 0 : 1;
    return aRank - bRank;
  });

  let runningBalance = startBalance;
  return events.map((event) => {
    runningBalance += event.cents;
    return { ...event, runningBalance };
  });
}

export function calcWeekSurplus(rows: CashFlowRow[]): number {
  return rows.reduce((sum, row) => sum + row.cents, 0);
}

export function isCovered(rows: CashFlowRow[]): boolean {
  return rows.every((row) => row.runningBalance >= 0);
}
