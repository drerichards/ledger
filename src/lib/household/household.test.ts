import type {
  Bill,
  InstallmentPlan,
  KiasCheckEntry,
  MonthlyIncome,
  PaycheckWeek,
  SavingsEntry,
} from "@/types";
import {
  getHouseholdMonthSummary,
  getMonthSnapshotFromSummary,
  getUpcomingDueItems,
  projectCashFlowRows,
} from "./household";

function makeBill(overrides: Partial<Bill> = {}): Bill {
  return {
    id: "bill-1",
    month: "2026-04",
    name: "Rent",
    cents: 100000,
    due: 1,
    paid: false,
    method: "autopay",
    group: "other_income",
    entry: "recurring",
    category: "Housing",
    flagged: false,
    notes: "",
    amountHistory: [],
    ...overrides,
  };
}

function makePlan(overrides: Partial<InstallmentPlan> = {}): InstallmentPlan {
  return {
    id: "plan-1",
    label: "Affirm Couch",
    mc: 5000,
    start: "2026-04",
    end: "2026-06",
    dueDay: 12,
    ...overrides,
  };
}

function makeIncome(overrides: Partial<MonthlyIncome> = {}): MonthlyIncome {
  return {
    month: "2026-04",
    kias_pay: 0,
    military_pay: 10000,
    retirement: 2000,
    social_security: 3000,
    ...overrides,
  };
}

function makeWeek(overrides: Partial<PaycheckWeek> = {}): PaycheckWeek {
  return {
    weekOf: "2026-04-06",
    kiasPay: 10000,
    storage: 0,
    rent: 0,
    jazmin: 0,
    dre: 0,
    savings: 0,
    paypalCC: 0,
    deductions: 0,
    extra: {},
    ...overrides,
  };
}

function makeCheckEntry(overrides: Partial<KiasCheckEntry> = {}): KiasCheckEntry {
  return {
    weekOf: "2026-04-13",
    amount: 25000,
    ...overrides,
  };
}

function makeSavingsEntry(overrides: Partial<SavingsEntry> = {}): SavingsEntry {
  return {
    id: "s1",
    date: "2026-04-06",
    amount: 1500,
    ...overrides,
  };
}

describe("household money engine", () => {
  it("uses same-month actuals, filters aggregate Affirm bills, and derives snapshot totals from one summary", () => {
    const summary = getHouseholdMonthSummary({
      month: "2026-04",
      bills: [
        makeBill({ id: "rent", paid: true }),
        makeBill({
          id: "utility",
          name: "Electric",
          cents: 20000,
          due: 20,
          paid: false,
        }),
        makeBill({
          id: "aggregate-affirm",
          name: "Affirm",
          cents: 5000,
          due: 12,
          paid: false,
          method: "autopay",
          category: "Loans",
        }),
      ],
      income: [makeIncome()],
      paycheck: [makeWeek(), makeWeek({ weekOf: "2026-04-13", kiasPay: 20000 })],
      checkLog: [makeCheckEntry()],
      savingsLog: [makeSavingsEntry()],
      plans: [makePlan()],
    });

    expect(summary.visibleBills.map((bill) => bill.id)).toEqual(["rent", "utility"]);
    expect(summary.fixedBillsCents).toBe(120000);
    expect(summary.affirmBurdenCents).toBe(5000);
    expect(summary.kiasPayCents).toBe(35000);
    expect(summary.fixedIncomeCents).toBe(15000);
    expect(summary.totalIncomeCents).toBe(50000);
    expect(summary.totalExpenseCents).toBe(125000);
    expect(summary.shortfallCents).toBe(75000);
    expect(summary.paidBillsCents).toBe(100000);
    expect(summary.savingsMovedCents).toBe(1500);
    expect(summary.weeksEntered).toBe(2);

    expect(getMonthSnapshotFromSummary(summary)).toEqual({
      month: "2026-04",
      totalBilled: 125000,
      totalPaid: 100000,
      shortfall: 75000,
      savingsMoved: 1500,
      kiasPayActual: 35000,
    });
  });

  it("builds upcoming due items from unpaid bills and plan-derived payments", () => {
    const items = getUpcomingDueItems({
      month: "2026-04",
      bills: [
        makeBill({ id: "paid-rent", paid: true }),
        makeBill({ id: "phone", name: "Phone", cents: 18000, due: 20, paid: false }),
        makeBill({
          id: "aggregate-affirm",
          name: "Affirm",
          cents: 5000,
          due: 12,
          paid: false,
          method: "autopay",
          category: "Loans",
        }),
      ],
      plans: [makePlan()],
      fromDate: "2026-04-10",
      limit: 3,
    });

    expect(items).toEqual([
      {
        id: "plan-1",
        date: "2026-04-12",
        label: "Affirm Couch",
        cents: 5000,
        kind: "affirm",
      },
      {
        id: "phone",
        date: "2026-04-20",
        label: "Phone",
        cents: 18000,
        kind: "bill",
      },
    ]);
  });

  it("aggregates multiple affirm due items on Home when requested", () => {
    const items = getUpcomingDueItems({
      month: "2026-04",
      bills: [makeBill({ id: "phone", name: "Phone", cents: 18000, due: 20, paid: false })],
      plans: [
        makePlan({ id: "plan-1", label: "Affirm Couch", mc: 5000, dueDay: 12 }),
        makePlan({ id: "plan-2", label: "Affirm Desk", mc: 7000, dueDay: 12 }),
      ],
      fromDate: "2026-04-10",
      limit: 3,
      aggregateAffirm: true,
    });

    expect(items).toEqual([
      {
        id: "affirm-2026-04-12",
        date: "2026-04-12",
        label: "Affirm Payments",
        cents: 12000,
        kind: "affirm",
      },
      {
        id: "phone",
        date: "2026-04-20",
        label: "Phone",
        cents: 18000,
        kind: "bill",
      },
    ]);
  });

  it("projects running cash flow using plan due days and Friday paycheck deposits", () => {
    const rows = projectCashFlowRows({
      startBalance: 100000,
      bills: [makeBill({ id: "phone", name: "Phone", cents: 18000, due: 20, paid: false })],
      plans: [makePlan()],
      paycheck: [makeWeek({ weekOf: "2026-04-13", kiasPay: 20000 })],
      checkLog: [makeCheckEntry({ weekOf: "2026-04-13", amount: 25000 })],
      month: "2026-04",
      fromDate: "2026-04-10",
      toDate: "2026-04-20",
    });

    expect(rows).toEqual([
      {
        date: "2026-04-12",
        payee: "Affirm Couch",
        cents: -5000,
        runningBalance: 95000,
        type: "affirm",
      },
      {
        date: "2026-04-17",
        payee: "Kia's Paycheck",
        cents: 25000,
        runningBalance: 120000,
        type: "income",
      },
      {
        date: "2026-04-20",
        payee: "Phone",
        cents: -18000,
        runningBalance: 102000,
        type: "bill",
      },
    ]);
  });

  it("aggregates affirm cash-flow rows by due date on Home when requested", () => {
    const rows = projectCashFlowRows({
      startBalance: 100000,
      bills: [makeBill({ id: "phone", name: "Phone", cents: 18000, due: 20, paid: false })],
      plans: [
        makePlan({ id: "plan-1", label: "Affirm Couch", mc: 5000, dueDay: 12 }),
        makePlan({ id: "plan-2", label: "Affirm Desk", mc: 7000, dueDay: 12 }),
      ],
      paycheck: [makeWeek({ weekOf: "2026-04-13", kiasPay: 20000 })],
      checkLog: [makeCheckEntry({ weekOf: "2026-04-13", amount: 25000 })],
      month: "2026-04",
      fromDate: "2026-04-10",
      toDate: "2026-04-20",
      aggregateAffirm: true,
    });

    expect(rows).toEqual([
      {
        date: "2026-04-12",
        payee: "Affirm Payments",
        cents: -12000,
        runningBalance: 88000,
        type: "affirm",
      },
      {
        date: "2026-04-17",
        payee: "Kia's Paycheck",
        cents: 25000,
        runningBalance: 113000,
        type: "income",
      },
      {
        date: "2026-04-20",
        payee: "Phone",
        cents: -18000,
        runningBalance: 95000,
        type: "bill",
      },
    ]);
  });
});
