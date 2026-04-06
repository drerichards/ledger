import { renderHook, act } from "@testing-library/react";
import { useAppState } from "@/hooks/useAppState";
import { DEFAULT_PAYCHECK_COLUMNS } from "@/lib/paycheck";
import type {
  Bill,
  InstallmentPlan,
  KiasCheckEntry,
  MonthlyIncome,
  MonthSnapshot,
  PaycheckWeek,
} from "@/types";

// ─── Mock storage ──────────────────────────────────────────────────────────────
// useAppState hydrates from localStorage on mount and persists on every change.
// We mock the entire storage module so tests are isolated and don't touch disk.

// Mock Supabase sync — tests are unit tests; no network calls allowed.
// All functions resolve immediately as no-ops. Silent-fail behavior mirrors production.
jest.mock("@/lib/supabase/sync", () => ({
  loadFromSupabase: jest.fn(() => Promise.resolve(null)),
  syncStateToSupabase: jest.fn(() => Promise.resolve()),
  deleteBillRemote: jest.fn(() => Promise.resolve()),
  deletePlanRemote: jest.fn(() => Promise.resolve()),
  deleteCheckEntryRemote: jest.fn(() => Promise.resolve()),
}));

const mockInitialState = {
  bills: [],
  plans: [],
  checkLog: [],
  savingsLog: [],
  income: [],
  paycheck: [],
  snapshots: [],
  paycheckViewScope: "monthly" as const,
  paycheckColumns: DEFAULT_PAYCHECK_COLUMNS,
  seenNotificationIds: [],
  checkEditWarningAcked: false,
};

jest.mock("@/lib/storage", () => ({
  get INITIAL_STATE() { return mockInitialState; },
  loadState: jest.fn(() => ({ ...mockInitialState })),
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
    weekOf: "2026-04-06",
    kiasPay: 76423,
    storage: 14000,
    // affirm is derived from InstallmentPlan[] at render time — not stored on PaycheckWeek
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
    totalBilled: 259863, // total cents billed that month
    totalPaid: 0,        // cents marked paid
    shortfall: 24726,    // positive = short, negative = surplus
    savingsMoved: 0,     // cents moved to savings
    kiasPayActual: 0,    // sum of checkLog entries for the month
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
      result.current.addSavingsEntry({ id: "s1", date: "2026-04-06", amount: 5000 });
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

  it("preserves non-matching income records when upserting (line 162 inner ternary false branch)", () => {
    const { result } = setup();
    act(() => {
      result.current.upsertIncome(makeIncome({ month: "2026-04", military_pay: 100000 }));
      result.current.upsertIncome(makeIncome({ month: "2026-05", military_pay: 110000 }));
    });
    // Update only April — May must stay unchanged
    act(() => { result.current.upsertIncome(makeIncome({ month: "2026-04", military_pay: 200000 })); });
    expect(result.current.state.income).toHaveLength(2);
    const may = result.current.state.income.find((i) => i.month === "2026-05");
    expect(may?.military_pay).toBe(110000); // unchanged — hits the `i` else branch
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

  it("preserves non-matching weeks when upserting (line 173 inner ternary false branch)", () => {
    const { result } = setup();
    act(() => {
      result.current.upsertPaycheckWeek(makeWeek({ weekOf: "2026-04-06", kiasPay: 76423 }));
      result.current.upsertPaycheckWeek(makeWeek({ weekOf: "2026-04-13", kiasPay: 80000 }));
    });
    // Update only Apr 6 — Apr 13 must stay unchanged (hits the `w` else branch)
    act(() => { result.current.upsertPaycheckWeek(makeWeek({ weekOf: "2026-04-06", kiasPay: 99000 })); });
    expect(result.current.state.paycheck).toHaveLength(2);
    const apr13 = result.current.state.paycheck.find((w) => w.weekOf === "2026-04-13");
    expect(apr13?.kiasPay).toBe(80000);
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
    act(() => { result.current.addSnapshot(makeSnapshot({ month: "2026-04", totalBilled: 100000 })); });
    act(() => { result.current.addSnapshot(makeSnapshot({ month: "2026-04", totalBilled: 200000 })); });

    expect(result.current.state.snapshots).toHaveLength(1);
    expect(result.current.state.snapshots[0].totalBilled).toBe(200000);
  });

  it("preserves non-matching snapshots when upserting (line 187 inner ternary false branch)", () => {
    const { result } = setup();
    act(() => {
      result.current.addSnapshot(makeSnapshot({ month: "2026-04", totalBilled: 100000 }));
      result.current.addSnapshot(makeSnapshot({ month: "2026-05", totalBilled: 120000 }));
    });
    // Replace Apr — May must remain unchanged (hits the `s` else branch)
    act(() => { result.current.addSnapshot(makeSnapshot({ month: "2026-04", totalBilled: 200000 })); });
    expect(result.current.state.snapshots).toHaveLength(2);
    const may = result.current.state.snapshots.find((s) => s.month === "2026-05");
    expect(may?.totalBilled).toBe(120000);
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

// ─── Additional action coverage ───────────────────────────────────────────────

describe("useAppState — ADD_SAVINGS_ENTRY", () => {
  it("appends a savings entry", () => {
    const { result } = setup();
    act(() => {
      result.current.addSavingsEntry({ id: "s1", date: "2026-04-06", amount: 5000 });
    });
    expect(result.current.state.savingsLog).toHaveLength(1);
    expect(result.current.state.savingsLog[0].amount).toBe(5000);
  });
});

describe("useAppState — UPDATE_SAVINGS_ENTRY", () => {
  it("updates a savings entry by id", () => {
    const { result } = setup();
    act(() => {
      result.current.addSavingsEntry({ id: "s1", date: "2026-04-06", amount: 5000 });
    });
    act(() => {
      result.current.updateSavingsEntry({ id: "s1", date: "2026-04-06", amount: 9000 });
    });
    expect(result.current.state.savingsLog[0].amount).toBe(9000);
  });

  it("does not affect other entries", () => {
    const { result } = setup();
    act(() => {
      result.current.addSavingsEntry({ id: "s1", date: "2026-04-06", amount: 5000 });
      result.current.addSavingsEntry({ id: "s2", date: "2026-04-13", amount: 3000 });
    });
    act(() => {
      result.current.updateSavingsEntry({ id: "s1", date: "2026-04-06", amount: 9000 });
    });
    expect(result.current.state.savingsLog[1].amount).toBe(3000);
  });
});

describe("useAppState — DELETE_SAVINGS_ENTRY", () => {
  it("removes a savings entry by id", () => {
    const { result } = setup();
    act(() => {
      result.current.addSavingsEntry({ id: "s1", date: "2026-04-06", amount: 5000 });
      result.current.addSavingsEntry({ id: "s2", date: "2026-04-13", amount: 3000 });
    });
    act(() => { result.current.deleteSavingsEntry("s1"); });
    expect(result.current.state.savingsLog).toHaveLength(1);
    expect(result.current.state.savingsLog[0].id).toBe("s2");
  });
});

describe("useAppState — SET_PAYCHECK_VIEW_SCOPE", () => {
  it("updates the paycheck view scope", () => {
    const { result } = setup();
    act(() => { result.current.setPaycheckViewScope("quarterly"); });
    expect(result.current.state.paycheckViewScope).toBe("quarterly");
  });

  it("can cycle through all scope values", () => {
    const { result } = setup();
    for (const scope of ["weekly", "monthly", "quarterly", "yearly"] as const) {
      act(() => { result.current.setPaycheckViewScope(scope); });
      expect(result.current.state.paycheckViewScope).toBe(scope);
    }
  });
});

describe("useAppState — RENAME_PAYCHECK_COLUMN", () => {
  it("renames a column by key", () => {
    const { result } = setup();
    act(() => { result.current.renamePaycheckColumn("storage", "Unit Storage"); });
    const col = result.current.state.paycheckColumns?.find((c) => c.key === "storage");
    expect(col?.label).toBe("Unit Storage");
  });

  it("does not affect other columns", () => {
    const { result } = setup();
    act(() => { result.current.renamePaycheckColumn("storage", "Unit Storage"); });
    const rent = result.current.state.paycheckColumns?.find((c) => c.key === "rent");
    expect(rent?.label).toBe("Rent");
  });
});

describe("useAppState — ADD_PAYCHECK_COLUMN", () => {
  it("appends a new custom column", () => {
    const { result } = setup();
    const before = result.current.state.paycheckColumns.length;
    act(() => { result.current.addPaycheckColumn("Gym"); });
    expect(result.current.state.paycheckColumns.length).toBe(before + 1);
  });

  it("new column has fixed: false", () => {
    const { result } = setup();
    act(() => { result.current.addPaycheckColumn("Gym"); });
    const cols = result.current.state.paycheckColumns ?? [];
    const custom = cols[cols.length - 1];
    expect(custom.fixed).toBe(false);
    expect(custom.label).toBe("Gym");
  });

  it("new column key starts with 'col_'", () => {
    const { result } = setup();
    act(() => { result.current.addPaycheckColumn("Gym"); });
    const cols = result.current.state.paycheckColumns ?? [];
    expect(cols[cols.length - 1].key).toMatch(/^col_/);
  });
});

describe("useAppState — HIDE_PAYCHECK_COLUMN", () => {
  it("marks a column as hidden", () => {
    const { result } = setup();
    act(() => { result.current.hidePaycheckColumn("storage"); });
    const col = result.current.state.paycheckColumns?.find((c) => c.key === "storage");
    expect(col?.hidden).toBe(true);
  });

  it("preserves other columns", () => {
    const { result } = setup();
    act(() => { result.current.hidePaycheckColumn("storage"); });
    const rent = result.current.state.paycheckColumns?.find((c) => c.key === "rent");
    expect(rent?.hidden).toBeFalsy();
  });
});

describe("useAppState — RESTORE_PAYCHECK_COLUMN", () => {
  it("clears hidden flag on a previously hidden column", () => {
    const { result } = setup();
    act(() => { result.current.hidePaycheckColumn("storage"); });
    act(() => { result.current.restorePaycheckColumn("storage"); });
    const col = result.current.state.paycheckColumns?.find((c) => c.key === "storage");
    expect(col?.hidden).toBe(false);
  });
});

describe("useAppState — MARK_NOTIFICATIONS_SEEN", () => {
  it("adds ids to seenNotificationIds", () => {
    const { result } = setup();
    act(() => {
      result.current.markNotificationsSeen(["notif-1", "notif-2"]);
    });
    expect(result.current.state.seenNotificationIds).toContain("notif-1");
    expect(result.current.state.seenNotificationIds).toContain("notif-2");
  });

  it("does not duplicate ids already seen", () => {
    const { result } = setup();
    act(() => { result.current.markNotificationsSeen(["notif-1"]); });
    act(() => { result.current.markNotificationsSeen(["notif-1", "notif-2"]); });
    const seen = result.current.state.seenNotificationIds ?? [];
    const count = seen.filter((id) => id === "notif-1").length;
    expect(count).toBe(1);
  });
});

describe("useAppState — ACK_CHECK_EDIT_WARNING", () => {
  it("sets checkEditWarningAcked to true", () => {
    const { result } = setup();
    act(() => { result.current.ackCheckEditWarning(); });
    expect(result.current.state.checkEditWarningAcked).toBe(true);
  });
});

describe("useAppState — ADD_CHECK_ENTRY (update branch)", () => {
  it("updates in-place when an entry for the same weekOf already exists", () => {
    const { result } = setup();
    // First add creates the entry
    act(() => { result.current.addCheckEntry(makeCheckEntry({ weekOf: "2026-04-06", amount: 50000 })); });
    // Second add with same weekOf should update, not append
    act(() => { result.current.addCheckEntry(makeCheckEntry({ weekOf: "2026-04-06", amount: 80000 })); });
    expect(result.current.state.checkLog).toHaveLength(1);
    expect(result.current.state.checkLog[0].amount).toBe(80000);
  });

  it("preserves non-matching entries when upserting (line 113 inner ternary false branch)", () => {
    const { result } = setup();
    // Add two entries for different weeks
    act(() => {
      result.current.addCheckEntry(makeCheckEntry({ weekOf: "2026-04-06", amount: 50000 }));
      result.current.addCheckEntry(makeCheckEntry({ weekOf: "2026-04-13", amount: 60000 }));
    });
    // Update only the first entry — the second must remain unchanged (hits the `e` else branch)
    act(() => { result.current.addCheckEntry(makeCheckEntry({ weekOf: "2026-04-06", amount: 99000 })); });
    expect(result.current.state.checkLog).toHaveLength(2);
    expect(result.current.state.checkLog[1].amount).toBe(60000); // Apr 13 unchanged
  });
});

describe("useAppState — Supabase hydration", () => {
  it("hydrates from remote when loadFromSupabase returns data", async () => {
    const { loadFromSupabase } = jest.requireMock("@/lib/supabase/sync");
    const remoteState = {
      ...mockInitialState,
      bills: [makeBill({ id: "remote-bill" })],
    };
    (loadFromSupabase as jest.Mock).mockResolvedValueOnce(remoteState);

    const { result } = setup();
    // Wait for the async Supabase effect to resolve
    await act(async () => {
      await Promise.resolve();
    });
    expect(result.current.state.bills.some((b) => b.id === "remote-bill")).toBe(true);
  });

  it("syncs to Supabase on state change after debounce timer fires", () => {
    jest.useFakeTimers();
    const { syncStateToSupabase } = jest.requireMock("@/lib/supabase/sync");
    const syncSpy = syncStateToSupabase as jest.Mock;
    syncSpy.mockClear();

    const { result } = setup();
    act(() => { result.current.addBill(makeBill()); });
    // Timer not fired yet — debounced at 1.5s
    jest.advanceTimersByTime(1600);
    expect(syncSpy).toHaveBeenCalled();

    jest.useRealTimers();
  });

  it("clears pending debounce timer when a second state change fires before 1.5s elapses (line clearTimeout branch)", () => {
    jest.useFakeTimers();
    const { syncStateToSupabase } = jest.requireMock("@/lib/supabase/sync");
    const syncSpy = syncStateToSupabase as jest.Mock;
    syncSpy.mockClear();

    const { result } = setup();
    // First change — starts timer
    act(() => { result.current.addBill(makeBill({ id: "b1" })); });
    // Second change before 1.5s — should clear the first timer and set a new one
    act(() => { result.current.addBill(makeBill({ id: "b2" })); });
    // Timer hasn't fired yet
    expect(syncSpy).not.toHaveBeenCalled();
    // Let the debounce fire
    jest.advanceTimersByTime(1600);
    expect(syncSpy).toHaveBeenCalled();

    jest.useRealTimers();
  });

  it("cancels the pending debounce timer on unmount (cleanup branch)", () => {
    jest.useFakeTimers();
    const { syncStateToSupabase } = jest.requireMock("@/lib/supabase/sync");
    const syncSpy = syncStateToSupabase as jest.Mock;
    syncSpy.mockClear();

    const { result, unmount } = setup();
    act(() => { result.current.addBill(makeBill()); });
    // Unmount before debounce fires — cleanup should clear the timer
    unmount();
    jest.advanceTimersByTime(1600);
    // The debounce sync should NOT have fired after unmount
    expect(syncSpy).not.toHaveBeenCalled();

    jest.useRealTimers();
  });
});

describe("useAppState — UPDATE_CHECK_ENTRY", () => {
  it("updates an existing check entry by weekOf", () => {
    const { result } = setup();
    act(() => { result.current.addCheckEntry(makeCheckEntry({ weekOf: "2026-04-06", amount: 76423 })); });
    act(() => { result.current.updateCheckEntry({ weekOf: "2026-04-06", amount: 90000 }); });
    expect(result.current.state.checkLog[0].amount).toBe(90000);
  });

  it("does not affect other entries", () => {
    const { result } = setup();
    act(() => {
      result.current.addCheckEntry(makeCheckEntry({ weekOf: "2026-04-06", amount: 76423 }));
      result.current.addCheckEntry(makeCheckEntry({ weekOf: "2026-04-13", amount: 80000 }));
    });
    act(() => { result.current.updateCheckEntry({ weekOf: "2026-04-06", amount: 90000 }); });
    expect(result.current.state.checkLog[1].amount).toBe(80000);
  });
});
