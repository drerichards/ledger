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
  calcWeekSurplus,
  isCovered,
  isAggregateAffirmBill,
  getVisibleBillsForMonth,
  getMonthlyFixedIncome,
  getSavingsMovedForMonth,
  getKiasPayForMonth,
  getWeeksEnteredForMonth,
  getPaycheckAllocatedForMonth,
  getPlanDueDay,
  getAffirmTotalForMonth,
} from "./household";
import { INCOME_DEFAULTS } from "@/lib/income";
import { getMondaysInMonth } from "@/lib/dates";

jest.mock("@/lib/dates", () => {
  const actual = jest.requireActual("@/lib/dates");
  return {
    __esModule: true,
    ...actual,
    getMondaysInMonth: jest.fn((ym) => actual.getMondaysInMonth(ym)),
  };
});

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

  it("sorts same-day events putting income first", () => {
    const rowsSameDay = projectCashFlowRows({
      startBalance: 10000,
      bills: [makeBill({ id: "water", name: "Water", cents: 5000, due: 17, paid: false })],
      plans: [],
      paycheck: [makeWeek({ weekOf: "2026-04-13", kiasPay: 20000 })],
      checkLog: [makeCheckEntry({ weekOf: "2026-04-13", amount: 25000 })], // Paycheck is Friday 2026-04-17
      month: "2026-04",
      fromDate: "2026-04-17",
      toDate: "2026-04-17",
    });
    // The income event (Kia's Paycheck) should come first, then the bill event (Water)
    expect(rowsSameDay).toHaveLength(2);
    expect(rowsSameDay[0].type).toBe("income");
    expect(rowsSameDay[1].type).toBe("bill");
  });

  it("calculates week surplus and covered status", () => {
    const rows = [
      { date: "2026-04-12", payee: "X", cents: -5000, runningBalance: 95000, type: "bill" as const },
      { date: "2026-04-17", payee: "Y", cents: 25000, runningBalance: 120000, type: "income" as const },
    ];
    expect(calcWeekSurplus(rows)).toBe(20000);
    expect(isCovered(rows)).toBe(true);
    expect(isCovered([{ date: "2026-04-12", cents: -10, runningBalance: -5, payee: "Z", type: "bill" as const }])).toBe(false);
  });

  it("covers utility functions isAggregateAffirmBill and getVisibleBillsForMonth directly", () => {
    // Non-affirm bill should return false
    const bill = makeBill({ name: "Netflix" });
    expect(isAggregateAffirmBill(bill, [])).toBe(false);

    // getVisibleBillsForMonth filters aggregate Affirm bills
    const visibleBills = getVisibleBillsForMonth([bill], [], "2026-04");
    expect(visibleBills).toHaveLength(1);

    // getMonthlyFixedIncome handles missing month entry by returning default values
    const fixedIncome = getMonthlyFixedIncome("2026-05", []);
    expect(fixedIncome.military_pay).toBe(INCOME_DEFAULTS.military_pay);

    // getSavingsMovedForMonth matches entries by date or weekOf
    const savings = [
      makeSavingsEntry({ date: undefined, weekOf: "2026-04-13", amount: 5000 }),
    ];
    expect(getSavingsMovedForMonth("2026-04", savings)).toBe(5000);

    // getKiasPayForMonth and getWeeksEnteredForMonth
    const paycheck = [makeWeek({ weekOf: "2026-04-06", kiasPay: 10000 })];
    const checkLog = [makeCheckEntry({ weekOf: "2026-04-06", amount: 12000 })];
    expect(getKiasPayForMonth("2026-04", paycheck, checkLog)).toBeGreaterThan(0);
    expect(getWeeksEnteredForMonth("2026-04", paycheck, checkLog)).toBeGreaterThan(0);
  });

  it("directly tests getPaycheckAllocatedForMonth with different savings entries", () => {
    const columns = [{ key: "savings" }];
    const paycheck = [makeWeek({ weekOf: "2026-04-06", kiasPay: 10000 })];
    const checkLog = [makeCheckEntry({ weekOf: "2026-04-06", amount: 12000 })];
    const savingsLog = [
      makeSavingsEntry({ date: undefined, weekOf: "2026-04-06", amount: 5000 }),
      makeSavingsEntry({ date: "2026-05-01", amount: 2000 }),
    ];
    const allocated = getPaycheckAllocatedForMonth({
      month: "2026-04",
      paycheck,
      checkLog,
      plans: [],
      savingsLog,
      columns,
    });
    expect(typeof allocated).toBe("number");
  });

  it("covers remaining edge cases and branch conditions in household.ts", () => {
    const columns = [{ key: "savings" }];
    const paycheck = [makeWeek({ weekOf: "2026-04-06", kiasPay: 10000 })];
    const checkLog = [makeCheckEntry({ weekOf: "2026-04-06", amount: 12000 })];

    // 1. Savings log entry with both date and weekOf undefined (covers line 244)
    const savingsLogWithUndefs = [
      makeSavingsEntry({ date: undefined, weekOf: undefined, amount: 5000 }),
    ];
    const allocatedUndef = getPaycheckAllocatedForMonth({
      month: "2026-04",
      paycheck,
      checkLog,
      plans: [],
      savingsLog: savingsLogWithUndefs,
      columns,
    });
    expect(typeof allocatedUndef).toBe("number");

    // 2. Month with 0 Mondays (covers line 251 fallback to 0)
    const allocatedZeroMondays = getPaycheckAllocatedForMonth({
      month: "invalid-month",
      paycheck,
      checkLog,
      plans: [makePlan()],
      savingsLog: [],
      columns,
    });
    expect(allocatedZeroMondays).toBe(0);

    // 3. getUpcomingDueItems sorting on same-day items with different labels (covers line 329)
    const itemsSameDay = getUpcomingDueItems({
      month: "2026-04",
      bills: [
        makeBill({ id: "bill-z", name: "Z-Bill", cents: 100, due: 12, paid: false }),
        makeBill({ id: "bill-a", name: "A-Bill", cents: 200, due: 12, paid: false }),
      ],
      plans: [],
      fromDate: "2026-04-10",
      limit: 10,
    });
    expect(itemsSameDay[0].label).toBe("A-Bill");
    expect(itemsSameDay[1].label).toBe("Z-Bill");

    // 4. projectCashFlowRows with plans starting after or ending before month (covers lines 366-368 and 378)
    // Also include active plans whose due date is outside fromDate/toDate window (covers line 368 return)
    const plansBeforeAfter = [
      makePlan({ id: "plan-future", start: "2026-05", end: "2026-06", dueDay: 12 }),
      makePlan({ id: "plan-past", start: "2026-01", end: "2026-03", dueDay: 12 }),
      makePlan({ id: "plan-early", start: "2026-04", end: "2026-04", dueDay: 5 }), // due 2026-04-05 (< fromDate)
      makePlan({ id: "plan-late", start: "2026-04", end: "2026-04", dueDay: 25 }), // due 2026-04-25 (> toDate)
    ];
    // With aggregateAffirm = true
    const rowsAgg = projectCashFlowRows({
      startBalance: 1000,
      bills: [],
      plans: plansBeforeAfter,
      paycheck: [],
      checkLog: [],
      month: "2026-04",
      fromDate: "2026-04-10",
      toDate: "2026-04-20",
      aggregateAffirm: true,
    });
    expect(rowsAgg).toHaveLength(0);

    // With aggregateAffirm = false
    const rowsNoAgg = projectCashFlowRows({
      startBalance: 1000,
      bills: [],
      plans: plansBeforeAfter,
      paycheck: [],
      checkLog: [],
      month: "2026-04",
      fromDate: "2026-04-10",
      toDate: "2026-04-20",
      aggregateAffirm: false,
    });
    expect(rowsNoAgg).toHaveLength(0);

    // 5. projectCashFlowRows same-day sorting with income, bill, and affirm (covers lines 402-403)
    // Mock getMondaysInMonth to return duplicate Mondays so we compare multiple incomes on the same day.
    (getMondaysInMonth as jest.Mock).mockReturnValueOnce(["2026-04-13", "2026-04-13"]);

    const rowsSameDaySort = projectCashFlowRows({
      startBalance: 10000,
      bills: [makeBill({ id: "bill-1", name: "Bill A", cents: 500, due: 17, paid: false })],
      plans: [makePlan({ id: "plan-1", label: "Affirm Couch", mc: 100, dueDay: 17 })],
      paycheck: [makeWeek({ weekOf: "2026-04-13", kiasPay: 2000 })],
      checkLog: [],
      month: "2026-04",
      fromDate: "2026-04-17",
      toDate: "2026-04-17",
      aggregateAffirm: false,
    });
    expect(rowsSameDaySort).toHaveLength(4); // 2 incomes + 1 bill + 1 plan
    // Incomes must come first
    expect(rowsSameDaySort[0].type).toBe("income");
    expect(rowsSameDaySort[1].type).toBe("income");
    expect(rowsSameDaySort[2].type).not.toBe("income");
    expect(rowsSameDaySort[3].type).not.toBe("income");
  });

  it("calculates getAffirmTotalForMonth and getPlanDueDay correctly", () => {
    // getPlanDueDay with string/label due day
    const planWithLabelDue = makePlan({ dueDay: undefined, label: "Affirm Couch due 15" });
    expect(getPlanDueDay(planWithLabelDue)).toBe(15);

    const planWithNoDue = makePlan({ dueDay: undefined, label: "Affirm Couch" });
    expect(getPlanDueDay(planWithNoDue)).toBe(1);

    // getAffirmTotalForMonth
    const plans = [
      makePlan({ id: "p1", mc: 5000, start: "2026-04", end: "2026-06" }),
      makePlan({ id: "p2", mc: 3000, start: "2026-05", end: "2026-07" }),
    ];
    expect(getAffirmTotalForMonth(plans, "2026-04")).toBe(5000);
    expect(getAffirmTotalForMonth(plans, "2026-05")).toBe(8000);
    expect(getAffirmTotalForMonth(plans, "2026-07")).toBe(3000);
    expect(getAffirmTotalForMonth(plans, "2026-08")).toBe(0);

    // getSavingsMovedForMonth branch coverage
    const savingsLog = [
      makeSavingsEntry({ date: undefined, weekOf: "2026-04-13", amount: 5000 }),
      makeSavingsEntry({ date: undefined, weekOf: undefined, amount: 2000 }),
      makeSavingsEntry({ date: "2026-04-06", amount: 1500 }),
    ];
    expect(getSavingsMovedForMonth("2026-04", savingsLog)).toBe(6500);
  });
});
