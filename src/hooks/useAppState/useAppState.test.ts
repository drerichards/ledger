import { renderHook, act } from "@testing-library/react";
import { useAppState } from "@/hooks/useAppState";
import type {
  Bill,
  InstallmentPlan,
  KiasCheckEntry,
  MonthlyIncome,
  MonthSnapshot,
  PaycheckWeek,
  SavingsEntry,
} from "@/types";

// ─── Mock storage ──────────────────────────────────────────────────────────────
// useAppState hydrates from localStorage on mount and persists on every change.
// We mock the entire storage module so tests are isolated and don't touch disk.

const CLEAN_STATE = {
  bills: [],
  plans: [],
  checkLog: [],
  savingsLog: [],
  income: [],
  paycheck: [],
  snapshots: [],
  paycheckViewScope: "monthly" as const,
};

jest.mock("@/lib/storage", () => ({
  INITIAL_STATE: {
    bills: [],
    plans: [],
    checkLog: [],
    savingsLog: [],
    income: [],
    paycheck: [],
    snapshots: [],
    paycheckViewScope: "monthly",
  },
  loadState: jest.fn(() => ({
    bills: [],
    plans: [],
    checkLog: [],
    savingsLog: [],
    income: [],
    paycheck: [],
    snapshots: [],
    paycheckViewScope: "monthly",
  })),
  saveState: jest.fn(),
  clearState: jest.fn(),
}));

// ─── Factories ─────────────────────────────────────────────────────────────────

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

function makePlan(overrides: Partial<InstallmentPlan> = {}): InstallmentPlan {
  return {
    id: "plan-1",
    label: "Amazon Card",
    mc: 5000,
    start: "2026-01",
    end: "2026-06",
    ...overrides,
  };
}

function makeCheckEntry(overrides: Partial<KiasCheckEntry> = {}): KiasCheckEntry {
  return { weekOf: "2026-04-06", amount: 76423, ...overrides };
}

function makeSavingsEntry(overrides: Partial<SavingsEntry> = {}): SavingsEntry {
  return { weekOf: "2026-04-06", amount: 5000, ...overrides };
}

function makeIncome(overrides: Partial<MonthlyIncome> = {}): MonthlyIncome {
  return {
    month: "2026-04",
    kias_pay: 0,
    military_pay: 124190,
    retirement: 33437,
    social_security: 77500,
    ...overrides,
  };
}

function makeWeek(overrides: Partial<PaycheckWeek> = {}): PaycheckWeek {
  return {
    weekOf: "2026-04-06",
    kiasPay: 76423,
    storage: 14000,
    affirm: 37652,
    rent: 0,
    jazmin: 20000,
    dre: 20000,
    savings: 0,
    paypalCC: 5000,
    deductions: 0,
    ...overrides,
  };
}

function makeSnapshot(overrides: Partial<MonthSnapshot> = {}): MonthSnapshot {
  return {
    month: "2026-04",
    totalBills: 259863,
    totalIncome: 235137,
    shortfall: 24726,
    ...overrides,
  };
}

// ─── Helper: get fresh hook result ────────────────────────────────────────────

function setup() {
  return renderHook(() => useAppState());
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("useAppState — ADD_BILL", () => {
  it("appends a bill to an empty list", () => {
    const { result } = setup();
    const bill = makeBill();
    act(() => { result.current.addBill(bill); });
    expect(result.current.state.bills).toHaveLength(1);
    expect(result.current.state.bills[0]).toEqual(bill);
  });

  it("appends multiple bills in order", () => {
    const { result } = setup();
    const b1 = makeBill({ id: "b1", name: "Bill 1" });
    const b2 = makeBill({ id: "b2", name: "Bill 2" });
    act(() => { result.current.addBill(b1); });
    act(() => { result.current.addBill(b2); });
    expect(result.current.state.bills).toHaveLength(2);
    expect(result.current.state.bills[1].name).toBe("Bill 2");
  });
});

describe("useAppState — UPDATE_BILL", () => {
  it("updates the matching bill", () => {
    const { result } = setup();
    const original = makeBill({ id: "b1", name: "Old Name", cents: 5000 });
    act(() => { result.current.addBill(original); });

    const updated = { ...original, name: "New Name", cents: 5000 };
    act(() => { result.current.updateBill(updated); });

    expect(result.current.state.bills[0].name).toBe("New Name");
  });

  it("does not affect other bills", () => {
    const { result } = setup();
    const b1 = makeBill({ id: "b1", name: "Bill 1" });
    const b2 = makeBill({ id: "b2", name: "Bill 2" });
    act(() => { result.current.addBill(b1); result.current.addBill(b2); });

    act(() => { result.current.updateBill({ ...b1, name: "Updated Bill 1" }); });

    expect(result.current.state.bills[1].name).toBe("Bill 2");
  });

  it("logs the previous amount to amountHistory when amount changes", () => {
    const { result } = setup();
    const original = makeBill({ id: "b1", cents: 5000, amountHistory: [] });
    act(() => { result.current.addBill(original); });

    act(() => { result.current.updateBill({ ...original, cents: 6000 }); });

    const history = result.current.state.bills[0].amountHistory;
    expect(history).toHaveLength(1);
    expect(history[0].cents).toBe(5000); // the OLD amount was logged
  });

  it("does not log to amountHistory when amount is unchanged", () => {
    const { result } = setup();
    const original = makeBill({ id: "b1", cents: 5000, amountHistory: [] });
    act(() => { result.current.addBill(original); });

    act(() => { result.current.updateBill({ ...original, name: "New Name" }); });

    expect(result.current.state.bills[0].amountHistory).toHaveLength(0);
  });
});

describe("useAppState — DELETE_BILL", () => {
  it("removes the bill with the given id", () => {
    const { result } = setup();
    const b1 = makeBill({ id: "b1" });
    const b2 = makeBill({ id: "b2" });
    act(() => { result.current.addBill(b1); result.current.addBill(b2); });

    act(() => { result.current.deleteBill("b1"); });

    expect(result.current.state.bills).toHaveLength(1);
    expect(result.current.state.bills[0].id).toBe("b2");
  });

  it("does nothing when id does not exist", () => {
    const { result } = setup();
    act(() => { result.current.addBill(makeBill({ id: "b1" })); });

    act(() => { result.current.deleteBill("nonexistent"); });

    expect(result.current.state.bills).toHaveLength(1);
  });
});

describe("useAppState — TOGGLE_BILL_PAID", () => {
  it("flips paid from false to true", () => {
    const { result } = setup();
    act(() => { result.current.addBill(makeBill({ id: "b1", paid: false })); });

    act(() => { result.current.toggleBillPaid("b1"); });

    expect(result.current.state.bills[0].paid).toBe(true);
  });

  it("flips paid from true to false", () => {
    const { result } = setup();
    act(() => { result.current.addBill(makeBill({ id: "b1", paid: true })); });

    act(() => { result.current.toggleBillPaid("b1"); });

    expect(result.current.state.bills[0].paid).toBe(false);
  });

  it("does not affect other bills", () => {
    const { result } = setup();
    act(() => {
      result.current.addBill(makeBill({ id: "b1", paid: false }));
      result.current.addBill(makeBill({ id: "b2", paid: false }));
    });

    act(() => { result.current.toggleBillPaid("b1"); });

    expect(result.current.state.bills[1].paid).toBe(false);
  });
});

describe("useAppState — ADD_PLAN / DELETE_PLAN", () => {
  it("appends a plan", () => {
    const { result } = setup();
    act(() => { result.current.addPlan(makePlan()); });
    expect(result.current.state.plans).toHaveLength(1);
  });

  it("removes a plan by id", () => {
    const { result } = setup();
    const p1 = makePlan({ id: "p1" });
    const p2 = makePlan({ id: "p2", label: "Other Plan" });
    act(() => { result.current.addPlan(p1); result.current.addPlan(p2); });

    act(() => { result.current.deletePlan("p1"); });

    expect(result.current.state.plans).toHaveLength(1);
    expect(result.current.state.plans[0].id).toBe("p2");
  });
});

describe("useAppState — ADD_CHECK_ENTRY / DELETE_CHECK_ENTRY", () => {
  it("appends a check entry", () => {
    const { result } = setup();
    act(() => { result.current.addCheckEntry(makeCheckEntry()); });
    expect(result.current.state.checkLog).toHaveLength(1);
  });

  it("deletes check entries in the same week", () => {
    const { result } = setup();
    // Both entries fall on the week of 2026-04-06 (Monday)
    act(() => {
      result.current.addCheckEntry({ weekOf: "2026-04-06", amount: 76423 });
      result.current.addCheckEntry({ weekOf: "2026-04-07", amount: 50000 }); // same week
    });

    act(() => { result.current.deleteCheckEntry("2026-04-06"); });

    expect(result.current.state.checkLog).toHaveLength(0);
  });

  it("also deletes savings entries in the same week as the check entry", () => {
    const { result } = setup();
    act(() => {
      result.current.addCheckEntry({ weekOf: "2026-04-06", amount: 76423 });
      result.current.addSavingsEntry({ weekOf: "2026-04-06", amount: 5000 });
    });

    act(() => { result.current.deleteCheckEntry("2026-04-06"); });

    expect(result.current.state.checkLog).toHaveLength(0);
    expect(result.current.state.savingsLog).toHaveLength(0);
  });
});

describe("useAppState — UPSERT_INCOME", () => {
  it("inserts income when no record exists for the month", () => {
    const { result } = setup();
    act(() => { result.current.upsertIncome(makeIncome({ month: "2026-04" })); });
    expect(result.current.state.income).toHaveLength(1);
    expect(result.current.state.income[0].month).toBe("2026-04");
  });

  it("replaces income when a record for the month already exists", () => {
    const { result } = setup();
    act(() => { result.current.upsertIncome(makeIncome({ month: "2026-04", military_pay: 100000 })); });
    act(() => { result.current.upsertIncome(makeIncome({ month: "2026-04", military_pay: 200000 })); });

    expect(result.current.state.income).toHaveLength(1);
    expect(result.current.state.income[0].military_pay).toBe(200000);
  });

  it("keeps income for different months separate", () => {
    const { result } = setup();
    act(() => {
      result.current.upsertIncome(makeIncome({ month: "2026-04" }));
      result.current.upsertIncome(makeIncome({ month: "2026-05" }));
    });
    expect(result.current.state.income).toHaveLength(2);
  });
});

describe("useAppState — UPSERT_PAYCHECK_WEEK", () => {
  it("inserts a new week when weekOf does not exist", () => {
    const { result } = setup();
    act(() => { result.current.upsertPaycheckWeek(makeWeek({ weekOf: "2026-04-06" })); });
    expect(result.current.state.paycheck).toHaveLength(1);
  });

  it("replaces an existing week with the same weekOf", () => {
    const { result } = setup();
    act(() => { result.current.upsertPaycheckWeek(makeWeek({ weekOf: "2026-04-06", kiasPay: 76423 })); });
    act(() => { result.current.upsertPaycheckWeek(makeWeek({ weekOf: "2026-04-06", kiasPay: 90000 })); });

    expect(result.current.state.paycheck).toHaveLength(1);
    expect(result.current.state.paycheck[0].kiasPay).toBe(90000);
  });
});

describe("useAppState — ADD_SNAPSHOT", () => {
  it("appends a new snapshot", () => {
    const { result } = setup();
    act(() => { result.current.addSnapshot(makeSnapshot({ month: "2026-04" })); });
    expect(result.current.state.snapshots).toHaveLength(1);
  });

  it("replaces an existing snapshot for the same month", () => {
    const { result } = setup();
    act(() => { result.current.addSnapshot(makeSnapshot({ month: "2026-04", totalBills: 100000 })); });
    act(() => { result.current.addSnapshot(makeSnapshot({ month: "2026-04", totalBills: 200000 })); });

    expect(result.current.state.snapshots).toHaveLength(1);
    expect(result.current.state.snapshots[0].totalBills).toBe(200000);
  });
});

describe("useAppState — ROLLOVER_BILLS", () => {
  it("copies recurring bills from fromMonth to toMonth with paid reset to false", () => {
    const { result } = setup();
    const bill = makeBill({ id: "b1", month: "2026-04", entry: "recurring", paid: true });
    act(() => { result.current.addBill(bill); });

    act(() => { result.current.rolloverBills("2026-04", "2026-05"); });

    const mayBills = result.current.state.bills.filter((b) => b.month === "2026-05");
    expect(mayBills).toHaveLength(1);
    expect(mayBills[0].paid).toBe(false); // paid is reset
    expect(mayBills[0].month).toBe("2026-05");
    expect(mayBills[0].amountHistory).toEqual([]); // fresh history
  });

  it("does not copy manual bills during rollover", () => {
    const { result } = setup();
    act(() => {
      result.current.addBill(makeBill({ id: "b1", month: "2026-04", entry: "recurring" }));
      result.current.addBill(makeBill({ id: "b2", month: "2026-04", entry: "manual" }));
    });

    act(() => { result.current.rolloverBills("2026-04", "2026-05"); });

    const mayBills = result.current.state.bills.filter((b) => b.month === "2026-05");
    expect(mayBills).toHaveLength(1); // only the recurring one
  });

  it("does not rollover if toMonth already has bills", () => {
    const { result } = setup();
    act(() => {
      result.current.addBill(makeBill({ id: "b1", month: "2026-04", entry: "recurring" }));
      result.current.addBill(makeBill({ id: "b2", month: "2026-05", entry: "recurring" }));
    });

    const countBefore = result.current.state.bills.length;
    act(() => { result.current.rolloverBills("2026-04", "2026-05"); });

    // No new bills should have been added
    expect(result.current.state.bills).toHaveLength(countBefore);
  });

  it("assigns a new id to rolled-over bills", () => {
    const { result } = setup();
    act(() => { result.current.addBill(makeBill({ id: "original-id", month: "2026-04", entry: "recurring" })); });

    act(() => { result.current.rolloverBills("2026-04", "2026-05"); });

    const mayBill = result.current.state.bills.find((b) => b.month === "2026-05");
    expect(mayBill?.id).not.toBe("original-id"); // must be a fresh id
  });
});
