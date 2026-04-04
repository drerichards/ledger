import { renderHook } from "@testing-library/react";
import { useBillChartState } from "./useBillChartState";
import type { Bill, MonthlyIncome, PaycheckWeek } from "@/types";

// ─── Factories ────────────────────────────────────────────────────────────────

function makeBill(overrides: Partial<Bill> = {}): Bill {
  return {
    id: "bill-1",
    month: "2026-04",
    name: "T-Mobile",
    cents: 10800,
    due: 15,
    paid: false,
    method: "autopay",
    group: "kias_pay",
    entry: "recurring",
    category: "Utilities",
    flagged: false,
    notes: "",
    amountHistory: [],
    ...overrides,
  };
}

function makeIncome(overrides: Partial<MonthlyIncome> = {}): MonthlyIncome {
  return {
    month: "2026-04",
    kias_pay: 0,
    military_pay: 124190,
    retirement: 33447,
    social_security: 77500,
    ...overrides,
  };
}

function makeWeek(overrides: Partial<PaycheckWeek> = {}): PaycheckWeek {
  return {
    weekOf: "2026-03-02",  // prior month by default — feeds into April kiasPay
    kiasPay: 76423,
    storage: 14000,
    rent: 0,
    jazmin: 20000,
    dre: 20000,
    savings: 0,
    paypalCC: 5000,
    deductions: 0,
    ...overrides,
  };
}

function setup(
  bills: Bill[] = [],
  income: MonthlyIncome[] = [],
  paycheck: PaycheckWeek[] = [],
  viewMonth = "2026-04",
) {
  return renderHook(() => useBillChartState(bills, income, paycheck, viewMonth));
}

// ─── Bill filtering ───────────────────────────────────────────────────────────

describe("useBillChartState — bill filtering", () => {
  it("only includes bills for the viewMonth", () => {
    const bills = [
      makeBill({ id: "b1", month: "2026-04" }),
      makeBill({ id: "b2", month: "2026-05" }),
    ];
    const { result } = setup(bills);
    expect(result.current.visibleBills).toHaveLength(1);
    expect(result.current.visibleBills[0].id).toBe("b1");
  });

  it("returns empty visibleBills when no bills match viewMonth", () => {
    const bills = [makeBill({ month: "2026-05" })];
    const { result } = setup(bills);
    expect(result.current.visibleBills).toHaveLength(0);
  });

  it("splits kias_pay and other_income bills into separate arrays", () => {
    const bills = [
      makeBill({ id: "b1", group: "kias_pay" }),
      makeBill({ id: "b2", group: "other_income" }),
      makeBill({ id: "b3", group: "kias_pay" }),
    ];
    const { result } = setup(bills);
    expect(result.current.kiasBills).toHaveLength(2);
    expect(result.current.otherBills).toHaveLength(1);
  });
});

// ─── Totals ───────────────────────────────────────────────────────────────────

describe("useBillChartState — totals", () => {
  it("sums kiasBillsCents correctly", () => {
    const bills = [
      makeBill({ id: "b1", group: "kias_pay", cents: 10000 }),
      makeBill({ id: "b2", group: "kias_pay", cents: 5000 }),
    ];
    const { result } = setup(bills);
    expect(result.current.kiasBillsCents).toBe(15000);
  });

  it("sums otherBillsCents correctly", () => {
    const bills = [
      makeBill({ id: "b1", group: "other_income", cents: 20000 }),
      makeBill({ id: "b2", group: "other_income", cents: 30000 }),
    ];
    const { result } = setup(bills);
    expect(result.current.otherBillsCents).toBe(50000);
  });

  it("totalCents is the sum of both groups", () => {
    const bills = [
      makeBill({ id: "b1", group: "kias_pay", cents: 10000 }),
      makeBill({ id: "b2", group: "other_income", cents: 20000 }),
    ];
    const { result } = setup(bills);
    expect(result.current.totalCents).toBe(30000);
  });

  it("paidCents sums only paid bills", () => {
    const bills = [
      makeBill({ id: "b1", cents: 10000, paid: true }),
      makeBill({ id: "b2", cents: 5000, paid: false }),
    ];
    const { result } = setup(bills);
    expect(result.current.paidCents).toBe(10000);
  });

  it("unpaidCents is totalCents minus paidCents", () => {
    const bills = [
      makeBill({ id: "b1", cents: 10000, paid: true }),
      makeBill({ id: "b2", cents: 5000, paid: false }),
    ];
    const { result } = setup(bills);
    expect(result.current.unpaidCents).toBe(5000);
  });

  it("all zero when no bills match viewMonth", () => {
    const { result } = setup([], [], [], "2026-04");
    expect(result.current.totalCents).toBe(0);
    expect(result.current.paidCents).toBe(0);
    expect(result.current.unpaidCents).toBe(0);
  });
});

// ─── Kia's pay (from previous month paycheck) ─────────────────────────────────

describe("useBillChartState — kiasPayCents", () => {
  it("sums kiasPay from the PREVIOUS month's paycheck weeks", () => {
    // viewMonth = 2026-04, so prevMonth = 2026-03
    const paycheck = [
      makeWeek({ weekOf: "2026-03-02", kiasPay: 76423 }),
      makeWeek({ weekOf: "2026-03-09", kiasPay: 80000 }),
    ];
    const { result } = setup([], [], paycheck, "2026-04");
    expect(result.current.kiasPayCents).toBe(76423 + 80000);
  });

  it("does NOT include paycheck weeks from the viewMonth itself", () => {
    const paycheck = [
      makeWeek({ weekOf: "2026-04-06", kiasPay: 99999 }), // current month — excluded
    ];
    const { result } = setup([], [], paycheck, "2026-04");
    expect(result.current.kiasPayCents).toBe(0);
  });

  it("returns 0 when no paycheck weeks exist for the previous month", () => {
    const { result } = setup([], [], [], "2026-04");
    expect(result.current.kiasPayCents).toBe(0);
  });
});

// ─── Income & shortfall ───────────────────────────────────────────────────────

describe("useBillChartState — income and shortfall", () => {
  it("sums military_pay + retirement + social_security as otherIncomeCents", () => {
    const income = [makeIncome({ military_pay: 124190, retirement: 33447, social_security: 77500 })];
    const { result } = setup([], income);
    expect(result.current.otherIncomeCents).toBe(124190 + 33447 + 77500);
  });

  it("returns 0 otherIncomeCents when no income record exists for viewMonth", () => {
    const income = [makeIncome({ month: "2026-05" })]; // different month
    const { result } = setup([], income, [], "2026-04");
    expect(result.current.otherIncomeCents).toBe(0);
  });

  it("shortfall is positive when other income bills exceed other income", () => {
    const bills = [makeBill({ group: "other_income", cents: 300000, paid: false })];
    const income = [makeIncome({ military_pay: 100000, retirement: 0, social_security: 0 })];
    const { result } = setup(bills, income);
    // shortfall = otherBillsCents - otherIncomeCents = 300000 - 100000 = 200000
    expect(result.current.shortfall).toBeGreaterThan(0);
  });

  it("shortfall is negative (surplus) when other income exceeds other bills", () => {
    const bills = [makeBill({ group: "other_income", cents: 50000 })];
    const income = [makeIncome({ military_pay: 200000, retirement: 0, social_security: 0 })];
    const { result } = setup(bills, income);
    expect(result.current.shortfall).toBeLessThan(0);
  });

  it("shortfall does NOT include kias_pay bills", () => {
    // kias_pay bills should not affect shortfall at all
    const bills = [
      makeBill({ id: "b1", group: "kias_pay", cents: 999999 }),  // huge kias bill
      makeBill({ id: "b2", group: "other_income", cents: 50000 }),
    ];
    const income = [makeIncome({ military_pay: 100000, retirement: 0, social_security: 0 })];
    const { result } = setup(bills, income);
    // shortfall = 50000 - 100000 = -50000 (surplus), NOT affected by 999999
    expect(result.current.shortfall).toBe(-50000);
  });

  it("thisMonthIncome is undefined when no record exists for viewMonth", () => {
    const { result } = setup([], [], [], "2026-04");
    expect(result.current.thisMonthIncome).toBeUndefined();
  });
});

// ─── Memoization ─────────────────────────────────────────────────────────────

describe("useBillChartState — memoization", () => {
  it("returns same reference when all inputs are stable", () => {
    const bills: Bill[] = [];
    const income: MonthlyIncome[] = [];
    const paycheck: PaycheckWeek[] = [];
    const { result, rerender } = renderHook(
      ({ b, i, p, m }: { b: Bill[]; i: MonthlyIncome[]; p: PaycheckWeek[]; m: string }) =>
        useBillChartState(b, i, p, m),
      { initialProps: { b: bills, i: income, p: paycheck, m: "2026-04" } },
    );
    const first = result.current;
    rerender({ b: bills, i: income, p: paycheck, m: "2026-04" });
    expect(result.current).toBe(first);
  });
});
