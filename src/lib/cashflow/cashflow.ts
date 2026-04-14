import type { Bill, InstallmentPlan, KiasCheckEntry } from "@/types";

export type CashFlowRow = {
  date: string; // YYYY-MM-DD
  payee: string;
  cents: number; // positive = income, negative = expense
  runningBalance: number; // cents
  type: "income" | "bill" | "affirm";
};

/** Returns YYYY-MM-DD for the Friday of the week starting on a Monday. */
function fridayOf(weekOf: string): string {
  const [y, m, d] = weekOf.split("-").map(Number);
  const date = new Date(y, m - 1, d + 4);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

/** Returns YYYY-MM-DD for a bill's due day in the given month. Clamps to month end. */
function billDate(month: string, due: number): string {
  const [y, m] = month.split("-").map(Number);
  const lastDay = new Date(y, m, 0).getDate();
  const day = Math.min(due, lastDay);
  return `${month}-${String(day).padStart(2, "0")}`;
}

/**
 * Projects cash flow rows for a date window.
 * Income rows sort before expense rows on the same day (paycheck arrives before bills hit).
 */
export function projectWeekRows(params: {
  startBalance: number; // cents — the checking balance at fromDate
  bills: Bill[]; // all bills (filtered internally by month + date window)
  plans: InstallmentPlan[]; // installment plans active this month
  checkLog: KiasCheckEntry[]; // check entries whose Friday falls in the window
  month: string; // YYYY-MM — current month
  fromDate: string; // YYYY-MM-DD — inclusive start
  toDate: string; // YYYY-MM-DD — inclusive end
}): CashFlowRow[] {
  const { startBalance, bills, plans, checkLog, month, fromDate, toDate } = params;

  const events: Omit<CashFlowRow, "runningBalance">[] = [];

  for (const bill of bills) {
    if (bill.month !== month) continue;
    const date = billDate(month, bill.due);
    if (date >= fromDate && date <= toDate) {
      events.push({ date, payee: bill.name, cents: -bill.cents, type: "bill" });
    }
  }

  for (const plan of plans) {
    if (plan.start <= month && plan.end >= month) {
      const date = billDate(month, 1);
      if (date >= fromDate && date <= toDate) {
        events.push({ date, payee: plan.label, cents: -plan.mc, type: "affirm" });
      }
    }
  }

  for (const entry of checkLog) {
    const friday = fridayOf(entry.weekOf);
    if (friday >= fromDate && friday <= toDate) {
      events.push({ date: friday, payee: "Kia's Paycheck", cents: entry.amount, type: "income" });
    }
  }

  // Sort: by date ASC, income before expenses on same day
  events.sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date);
    if (a.type === "income" && b.type !== "income") return -1;
    if (a.type !== "income" && b.type === "income") return 1;
    return 0;
  });

  let balance = startBalance;
  return events.map((e) => {
    balance += e.cents;
    return { ...e, runningBalance: balance };
  });
}

/** Net change for a slice of rows. Positive = surplus. */
export function calcWeekSurplus(rows: CashFlowRow[]): number {
  return rows.reduce((sum, r) => sum + r.cents, 0);
}

/** True if no row's running balance goes negative. */
export function isCovered(rows: CashFlowRow[]): boolean {
  return rows.every((r) => r.runningBalance >= 0);
}
