import { projectWeekRows, calcWeekSurplus, isCovered } from "./cashflow";
import type { Bill, InstallmentPlan, KiasCheckEntry } from "@/types";

// ─── Factories ────────────────────────────────────────────────────────────────

function makeBill(overrides: Partial<Bill> = {}): Bill {
  return {
    id: "b1",
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

function makePlan(overrides: Partial<InstallmentPlan> = {}): InstallmentPlan {
  return {
    id: "p1",
    label: "Samsung TV",
    mc: 15000,
    start: "2026-01",
    end: "2026-06",
    ...overrides,
  };
}

function makeCheck(overrides: Partial<KiasCheckEntry> = {}): KiasCheckEntry {
  return {
    weekOf: "2026-04-06", // Monday
    amount: 120000,
    ...overrides,
  };
}

// ─── projectWeekRows ──────────────────────────────────────────────────────────

describe("projectWeekRows — bill filtering", () => {
  it("returns an empty array when no events fall in the window", () => {
    const rows = projectWeekRows({
      startBalance: 50000,
      bills: [],
      plans: [],
      checkLog: [],
      month: "2026-04",
      fromDate: "2026-04-01",
      toDate: "2026-04-07",
    });
    expect(rows).toEqual([]);
  });

  it("excludes bills from a different month even if their due date falls in the window", () => {
    // Bill.month = "2026-03" but due day 15 → skipped
    const rows = projectWeekRows({
      startBalance: 50000,
      bills: [makeBill({ month: "2026-03", due: 15 })],
      plans: [],
      checkLog: [],
      month: "2026-04",
      fromDate: "2026-04-01",
      toDate: "2026-04-30",
    });
    expect(rows).toEqual([]);
  });

  it("excludes bills whose due date falls outside the window", () => {
    const rows = projectWeekRows({
      startBalance: 50000,
      bills: [makeBill({ due: 20 })], // 2026-04-20
      plans: [],
      checkLog: [],
      month: "2026-04",
      fromDate: "2026-04-01",
      toDate: "2026-04-15",
    });
    expect(rows).toEqual([]);
  });

  it("includes a bill whose due date falls in the window (as negative cents)", () => {
    const rows = projectWeekRows({
      startBalance: 50000,
      bills: [makeBill({ due: 15, cents: 10800, name: "T-Mobile" })],
      plans: [],
      checkLog: [],
      month: "2026-04",
      fromDate: "2026-04-13",
      toDate: "2026-04-19",
    });
    expect(rows).toHaveLength(1);
    expect(rows[0].date).toBe("2026-04-15");
    expect(rows[0].payee).toBe("T-Mobile");
    expect(rows[0].cents).toBe(-10800);
    expect(rows[0].type).toBe("bill");
    expect(rows[0].runningBalance).toBe(50000 - 10800);
  });

  it("clamps a bill's due day to the last day of the month (Feb 30 → Feb 28)", () => {
    const rows = projectWeekRows({
      startBalance: 50000,
      bills: [makeBill({ month: "2026-02", due: 30, name: "Late Rent" })],
      plans: [],
      checkLog: [],
      month: "2026-02",
      fromDate: "2026-02-01",
      toDate: "2026-02-28",
    });
    expect(rows).toHaveLength(1);
    expect(rows[0].date).toBe("2026-02-28");
  });
});

describe("projectWeekRows — installment plans", () => {
  it("skips plans whose start month is after the target month", () => {
    const rows = projectWeekRows({
      startBalance: 50000,
      bills: [],
      plans: [makePlan({ start: "2026-05", end: "2026-10" })],
      checkLog: [],
      month: "2026-04",
      fromDate: "2026-04-01",
      toDate: "2026-04-30",
    });
    expect(rows).toEqual([]);
  });

  it("skips plans whose end month is before the target month", () => {
    const rows = projectWeekRows({
      startBalance: 50000,
      bills: [],
      plans: [makePlan({ start: "2026-01", end: "2026-03" })],
      checkLog: [],
      month: "2026-04",
      fromDate: "2026-04-01",
      toDate: "2026-04-30",
    });
    expect(rows).toEqual([]);
  });

  it("includes an active plan as a day-1 expense row", () => {
    const rows = projectWeekRows({
      startBalance: 50000,
      bills: [],
      plans: [makePlan({ start: "2026-01", end: "2026-06", mc: 15000, label: "Samsung TV" })],
      checkLog: [],
      month: "2026-04",
      fromDate: "2026-04-01",
      toDate: "2026-04-07",
    });
    expect(rows).toHaveLength(1);
    expect(rows[0].date).toBe("2026-04-01");
    expect(rows[0].payee).toBe("Samsung TV");
    expect(rows[0].cents).toBe(-15000);
    expect(rows[0].type).toBe("affirm");
  });

  it("excludes an active plan when its day-1 date is outside the window", () => {
    const rows = projectWeekRows({
      startBalance: 50000,
      bills: [],
      plans: [makePlan({ start: "2026-01", end: "2026-06" })],
      checkLog: [],
      month: "2026-04",
      fromDate: "2026-04-02", // excludes the 1st
      toDate: "2026-04-30",
    });
    expect(rows).toEqual([]);
  });
});

describe("projectWeekRows — check log (income)", () => {
  it("emits a Kia's Paycheck row on Friday for a check whose weekOf falls in the window", () => {
    // Monday 2026-04-06 → Friday 2026-04-10
    const rows = projectWeekRows({
      startBalance: 50000,
      bills: [],
      plans: [],
      checkLog: [makeCheck({ weekOf: "2026-04-06", amount: 120000 })],
      month: "2026-04",
      fromDate: "2026-04-06",
      toDate: "2026-04-12",
    });
    expect(rows).toHaveLength(1);
    expect(rows[0].date).toBe("2026-04-10");
    expect(rows[0].payee).toBe("Kia's Paycheck");
    expect(rows[0].cents).toBe(120000);
    expect(rows[0].type).toBe("income");
    expect(rows[0].runningBalance).toBe(50000 + 120000);
  });

  it("excludes a check whose Friday falls outside the window", () => {
    // Friday 2026-04-10 — window ends 2026-04-09
    const rows = projectWeekRows({
      startBalance: 50000,
      bills: [],
      plans: [],
      checkLog: [makeCheck({ weekOf: "2026-04-06" })],
      month: "2026-04",
      fromDate: "2026-04-06",
      toDate: "2026-04-09",
    });
    expect(rows).toEqual([]);
  });

  it("handles Friday week spanning a month boundary (fridayOf month-rollover)", () => {
    // Monday 2026-03-30 → Friday 2026-04-03
    const rows = projectWeekRows({
      startBalance: 50000,
      bills: [],
      plans: [],
      checkLog: [makeCheck({ weekOf: "2026-03-30", amount: 100000 })],
      month: "2026-04",
      fromDate: "2026-04-01",
      toDate: "2026-04-07",
    });
    expect(rows).toHaveLength(1);
    expect(rows[0].date).toBe("2026-04-03");
  });
});

describe("projectWeekRows — sort order", () => {
  it("sorts income before expenses on the same day", () => {
    // Put an Affirm plan (day 1, expense) and a Monday check (weekOf 2026-04-01,
    // but Friday lands on 2026-04-03, so they won't collide). Use Monday check
    // 2026-03-28 → Friday 2026-04-01 to force a collision with the Affirm row.
    const rows = projectWeekRows({
      startBalance: 100000,
      bills: [],
      plans: [makePlan({ start: "2026-04", end: "2026-04", mc: 25000, label: "Affirm" })],
      checkLog: [makeCheck({ weekOf: "2026-03-28", amount: 80000 })],
      month: "2026-04",
      fromDate: "2026-04-01",
      toDate: "2026-04-07",
    });
    expect(rows).toHaveLength(2);
    // income first
    expect(rows[0].type).toBe("income");
    expect(rows[0].cents).toBe(80000);
    expect(rows[0].runningBalance).toBe(180000);
    // then the expense
    expect(rows[1].type).toBe("affirm");
    expect(rows[1].cents).toBe(-25000);
    expect(rows[1].runningBalance).toBe(155000);
  });

  it("handles two income rows on the same day (bRank truthy branch)", () => {
    // Two check entries on the same weekOf → two income rows on Friday 2026-04-10.
    // This forces the sort to call compare(income, income), exercising both ternary
    // branches of the type-rank lookup.
    const rows = projectWeekRows({
      startBalance: 100000,
      bills: [makeBill({ id: "b1", name: "Bill A", cents: 5000, due: 10 })],
      plans: [],
      checkLog: [
        makeCheck({ weekOf: "2026-04-06", amount: 80000 }),
        makeCheck({ weekOf: "2026-04-06", amount: 20000 }),
      ],
      month: "2026-04",
      fromDate: "2026-04-06",
      toDate: "2026-04-12",
    });
    // 2 incomes (sort first) + 1 bill (expense)
    expect(rows).toHaveLength(3);
    expect(rows[0].type).toBe("income");
    expect(rows[1].type).toBe("income");
    expect(rows[2].type).toBe("bill");
    // Running balance: 100000 + 80000 + 20000 - 5000 = 195000
    expect(rows[2].runningBalance).toBe(195000);
  });

  it("preserves input order when two events share the same day and type (comparator returns 0)", () => {
    const rows = projectWeekRows({
      startBalance: 100000,
      bills: [
        makeBill({ id: "b1", name: "Bill A", cents: 5000, due: 15 }),
        makeBill({ id: "b2", name: "Bill B", cents: 7000, due: 15 }),
      ],
      plans: [],
      checkLog: [],
      month: "2026-04",
      fromDate: "2026-04-15",
      toDate: "2026-04-15",
    });
    expect(rows).toHaveLength(2);
    expect(rows[0].payee).toBe("Bill A");
    expect(rows[1].payee).toBe("Bill B");
  });

  it("sorts events across different days in ascending date order", () => {
    const rows = projectWeekRows({
      startBalance: 100000,
      bills: [
        makeBill({ id: "b1", name: "Late", due: 20 }),
        makeBill({ id: "b2", name: "Early", due: 5 }),
      ],
      plans: [],
      checkLog: [],
      month: "2026-04",
      fromDate: "2026-04-01",
      toDate: "2026-04-30",
    });
    expect(rows).toHaveLength(2);
    expect(rows[0].payee).toBe("Early");
    expect(rows[1].payee).toBe("Late");
  });
});

describe("projectWeekRows — running balance", () => {
  it("threads running balance through a multi-event window", () => {
    const rows = projectWeekRows({
      startBalance: 100000,
      bills: [makeBill({ name: "Internet", cents: 8000, due: 10 })],
      plans: [makePlan({ start: "2026-04", end: "2026-04", mc: 15000, label: "TV" })],
      checkLog: [makeCheck({ weekOf: "2026-04-06", amount: 50000 })], // Friday 2026-04-10
      month: "2026-04",
      fromDate: "2026-04-01",
      toDate: "2026-04-30",
    });
    // Day 1: TV -15000 → 85000
    // Day 10: Income 50000 (sorts first) → 135000, then Internet -8000 → 127000
    expect(rows).toHaveLength(3);
    expect(rows[0]).toMatchObject({ date: "2026-04-01", type: "affirm", runningBalance: 85000 });
    expect(rows[1]).toMatchObject({ date: "2026-04-10", type: "income", runningBalance: 135000 });
    expect(rows[2]).toMatchObject({ date: "2026-04-10", type: "bill", runningBalance: 127000 });
  });
});

// ─── calcWeekSurplus ──────────────────────────────────────────────────────────

describe("calcWeekSurplus", () => {
  it("returns 0 for an empty row set", () => {
    expect(calcWeekSurplus([])).toBe(0);
  });

  it("sums positive and negative cents into a surplus figure", () => {
    const rows = [
      { date: "2026-04-10", payee: "Income", cents: 100000, runningBalance: 100000, type: "income" as const },
      { date: "2026-04-15", payee: "Bill",   cents: -30000, runningBalance: 70000,  type: "bill"   as const },
      { date: "2026-04-20", payee: "TV",     cents: -20000, runningBalance: 50000,  type: "affirm" as const },
    ];
    expect(calcWeekSurplus(rows)).toBe(50000);
  });

  it("returns a negative number when expenses exceed income", () => {
    const rows = [
      { date: "2026-04-10", payee: "Rent", cents: -80000, runningBalance: -80000, type: "bill" as const },
    ];
    expect(calcWeekSurplus(rows)).toBe(-80000);
  });
});

// ─── isCovered ────────────────────────────────────────────────────────────────

describe("isCovered", () => {
  it("returns true for an empty row set (vacuous truth)", () => {
    expect(isCovered([])).toBe(true);
  });

  it("returns true when every row's running balance is non-negative", () => {
    const rows = [
      { date: "2026-04-10", payee: "Income", cents: 100000, runningBalance: 100000, type: "income" as const },
      { date: "2026-04-15", payee: "Bill",   cents: -40000, runningBalance: 60000,  type: "bill"   as const },
    ];
    expect(isCovered(rows)).toBe(true);
  });

  it("returns true when a row lands at exactly 0", () => {
    const rows = [
      { date: "2026-04-10", payee: "Income", cents: 10000, runningBalance: 10000, type: "income" as const },
      { date: "2026-04-15", payee: "Bill",   cents: -10000, runningBalance: 0,    type: "bill"   as const },
    ];
    expect(isCovered(rows)).toBe(true);
  });

  it("returns false when any row's running balance goes negative", () => {
    const rows = [
      { date: "2026-04-10", payee: "Bill", cents: -5000, runningBalance: -5000, type: "bill" as const },
    ];
    expect(isCovered(rows)).toBe(false);
  });
});
