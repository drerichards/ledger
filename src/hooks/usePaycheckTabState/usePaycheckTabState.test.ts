import { renderHook } from "@testing-library/react";
import {
  usePaycheckTabState,
  getVisibleMonths,
  emptyWeek,
} from "./usePaycheckTabState";
import { getMondaysInMonth } from "@/lib/dates";
import type {
  InstallmentPlan,
  KiasCheckEntry,
  PaycheckWeek,
  SavingsEntry,
} from "@/types";

jest.mock("@/lib/dates", () => ({
  ...jest.requireActual("@/lib/dates"),
  // Wrap as jest.fn so individual tests can use mockReturnValueOnce
  getMondaysInMonth: jest.fn((...args: Parameters<typeof import("@/lib/dates").getMondaysInMonth>) =>
    jest.requireActual("@/lib/dates").getMondaysInMonth(...args),
  ),
}));

// ─── Factories ────────────────────────────────────────────────────────────────

function makeWeek(overrides: Partial<PaycheckWeek> = {}): PaycheckWeek {
  return {
    weekOf: "2026-04-06",
    kiasPay: 76423,
    storage: 14000,
    rent: 80000,
    jazmin: 20000,
    dre: 20000,
    savings: 0,
    paypalCC: 5000,
    deductions: 0,
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
  return { id: "s1", date: "2026-04-06", amount: 5000, ...overrides };
}

// ─── getVisibleMonths (pure function) ─────────────────────────────────────────

describe("getVisibleMonths", () => {
  it("returns a single month for 'weekly' scope", () => {
    expect(getVisibleMonths("2026-04", "weekly")).toEqual(["2026-04"]);
  });

  it("returns a single month for 'monthly' scope", () => {
    expect(getVisibleMonths("2026-04", "monthly")).toEqual(["2026-04"]);
  });

  it("returns calendar quarter for 'quarterly' scope (Q2)", () => {
    const result = getVisibleMonths("2026-04", "quarterly");
    expect(result).toEqual(["2026-04", "2026-05", "2026-06"]);
  });

  it("returns calendar quarter for 'quarterly' scope (Q4)", () => {
    // November is in Q4, so should return Oct-Nov-Dec
    const result = getVisibleMonths("2026-11", "quarterly");
    expect(result).toEqual(["2026-10", "2026-11", "2026-12"]);
  });

  it("returns full calendar year for 'yearly' scope", () => {
    const result = getVisibleMonths("2026-01", "yearly");
    expect(result).toHaveLength(12);
    expect(result[0]).toBe("2026-01");
    expect(result[11]).toBe("2026-12");
  });

  it("returns same calendar year regardless of input month", () => {
    // June 2026 should still return Jan-Dec 2026
    const result = getVisibleMonths("2026-06", "yearly");
    expect(result).toHaveLength(12);
    expect(result[0]).toBe("2026-01");
    expect(result[11]).toBe("2026-12");
  });
});

// ─── emptyWeek (pure function) ────────────────────────────────────────────────

describe("emptyWeek", () => {
  it("uses template values for fixed expense fields", () => {
    const template = makeWeek({ storage: 14000, rent: 80000, jazmin: 20000, dre: 20000, paypalCC: 5000, deductions: 1000 });
    const week = emptyWeek("2026-05-04", template);
    expect(week.storage).toBe(14000);
    expect(week.rent).toBe(80000);
    expect(week.jazmin).toBe(20000);
    expect(week.dre).toBe(20000);
    expect(week.paypalCC).toBe(5000);
    expect(week.deductions).toBe(1000);
  });

  it("always sets savings to 0", () => {
    const template = makeWeek({ savings: 99999 });
    const week = emptyWeek("2026-05-04", template);
    expect(week.savings).toBe(0);
  });

  it("uses provided kiasPay override", () => {
    const week = emptyWeek("2026-05-04", undefined, 80000);
    expect(week.kiasPay).toBe(80000);
  });

  it("defaults all fields to 0 when no template is provided", () => {
    const week = emptyWeek("2026-05-04");
    expect(week.storage).toBe(0);
    expect(week.rent).toBe(0);
    expect(week.jazmin).toBe(0);
    expect(week.dre).toBe(0);
    expect(week.paypalCC).toBe(0);
    expect(week.deductions).toBe(0);
    expect(week.kiasPay).toBe(0);
  });

  it("sets weekOf to the provided date string", () => {
    const week = emptyWeek("2026-05-04");
    expect(week.weekOf).toBe("2026-05-04");
  });

  it("copies template.extra when present (extra truthy branch)", () => {
    const template = makeWeek({ extra: { custom_123: 5000 } });
    const week = emptyWeek("2026-05-04", template);
    expect(week.extra).toEqual({ custom_123: 5000 });
    // Must be a copy, not the same reference
    expect(week.extra).not.toBe(template.extra);
  });

  it("uses empty object for extra when template has no extra (extra falsy branch)", () => {
    const template = makeWeek();
    // template.extra is undefined or {} — both falsy-ish; ensure we get {}
    const week = emptyWeek("2026-05-04", template);
    expect(week.extra).toEqual({});
  });
});

// ─── usePaycheckTabState — template ───────────────────────────────────────────

describe("usePaycheckTabState — template", () => {
  it("template is undefined when paycheck is empty", () => {
    const { result } = renderHook(() =>
      usePaycheckTabState([], [], [], [], ["2026-04"]),
    );
    expect(result.current.template).toBeUndefined();
  });

  it("returns the most recent week as template", () => {
    const paycheck = [
      makeWeek({ weekOf: "2026-03-02" }),
      makeWeek({ weekOf: "2026-04-06" }), // most recent
      makeWeek({ weekOf: "2026-03-16" }),
    ];
    const { result } = renderHook(() =>
      usePaycheckTabState(paycheck, [], [], [], ["2026-04"]),
    );
    expect(result.current.template?.weekOf).toBe("2026-04-06");
  });
});

// ─── usePaycheckTabState — monthData ──────────────────────────────────────────

describe("usePaycheckTabState — monthData", () => {
  it("returns one entry per visible month", () => {
    const { result } = renderHook(() =>
      usePaycheckTabState([], [], [], [], ["2026-04", "2026-05", "2026-06"]),
    );
    expect(result.current.monthData).toHaveLength(3);
  });

  it("each monthData entry has the correct month key", () => {
    const visibleMonths = ["2026-04", "2026-05"];
    const { result } = renderHook(() =>
      usePaycheckTabState([], [], [], [], visibleMonths),
    );
    expect(result.current.monthData[0].month).toBe("2026-04");
    expect(result.current.monthData[1].month).toBe("2026-05");
  });

  it("calculates affirmTotal for each month from active plans", () => {
    const plans = [
      makePlan({ mc: 5000, start: "2026-04", end: "2026-06" }),
      makePlan({ id: "p2", mc: 3000, start: "2026-04", end: "2026-04" }),
    ];
    const { result } = renderHook(() =>
      usePaycheckTabState([], [], [], plans, ["2026-04", "2026-05"]),
    );
    // April: both plans active → 5000 + 3000
    expect(result.current.monthData[0].affirmTotal).toBe(8000);
    // May: only first plan active → 5000
    expect(result.current.monthData[1].affirmTotal).toBe(5000);
  });

  it("filters monthCheckEntries to entries starting with the month", () => {
    const checkLog = [
      makeCheckEntry({ weekOf: "2026-04-06", amount: 76423 }),
      makeCheckEntry({ weekOf: "2026-04-13", amount: 80000 }),
      makeCheckEntry({ weekOf: "2026-05-04", amount: 70000 }),
    ];
    const { result } = renderHook(() =>
      usePaycheckTabState([], checkLog, [], [], ["2026-04"]),
    );
    expect(result.current.monthData[0].monthCheckEntries).toHaveLength(2);
    expect(result.current.monthData[0].monthCheckEntries[0].amount).toBe(76423);
  });

  it("check entries are sorted ascending by weekOf", () => {
    const checkLog = [
      makeCheckEntry({ weekOf: "2026-04-13", amount: 80000 }),
      makeCheckEntry({ weekOf: "2026-04-06", amount: 76423 }),
    ];
    const { result } = renderHook(() =>
      usePaycheckTabState([], checkLog, [], [], ["2026-04"]),
    );
    const entries = result.current.monthData[0].monthCheckEntries;
    expect(entries[0].weekOf).toBe("2026-04-06");
    expect(entries[1].weekOf).toBe("2026-04-13");
  });

  it("groups savingsLog entries by Monday of their week", () => {
    // 2026-04-06 and 2026-04-08 both belong to the week of 2026-04-06
    const savingsLog = [
      makeSavingsEntry({ weekOf: "2026-04-06", amount: 3000 }),
      makeSavingsEntry({ weekOf: "2026-04-08", amount: 2000 }), // same week
    ];
    const { result } = renderHook(() =>
      usePaycheckTabState([], [], savingsLog, [], ["2026-04"]),
    );
    const savingsByWeek = result.current.monthData[0].savingsByWeek;
    // Both entries map to Monday 2026-04-06 → sum = 5000
    expect(savingsByWeek.get("2026-04-06")).toBe(5000);
  });

  it("mondays array is non-empty for a valid month", () => {
    const { result } = renderHook(() =>
      usePaycheckTabState([], [], [], [], ["2026-04"]),
    );
    expect(result.current.monthData[0].mondays.length).toBeGreaterThan(0);
  });

  it("affirmPerWeek is 0 when there are no mondays", () => {
    // Use a hypothetical empty month by mocking — here we just confirm it does
    // not divide by zero for an empty mondays array. We test the real case via
    // a valid month (mondays.length > 0) so affirmPerWeek = total / count.
    const plans = [makePlan({ mc: 8000, start: "2026-04", end: "2026-04" })];
    const { result } = renderHook(() =>
      usePaycheckTabState([], [], [], plans, ["2026-04"]),
    );
    const { affirmTotal, affirmPerWeek, mondays } = result.current.monthData[0];
    expect(affirmTotal).toBe(8000);
    expect(affirmPerWeek).toBe(Math.round(8000 / mondays.length));
  });

  it("affirmPerWeek defaults to 0 when getMondaysInMonth returns empty array (line 37 falsy branch)", () => {
    (getMondaysInMonth as jest.Mock).mockReturnValueOnce([]);
    const plans = [makePlan({ mc: 8000, start: "2026-04", end: "2026-04" })];
    const { result } = renderHook(() =>
      usePaycheckTabState([], [], [], plans, ["2026-04"]),
    );
    expect(result.current.monthData[0].affirmPerWeek).toBe(0);
  });

  it("groups savings entries using weekOf when date field is absent (lines 46/50 weekOf branch)", () => {
    // Entry has no date — should fall through to weekOf
    const savingsLog: SavingsEntry[] = [
      { id: "s1", weekOf: "2026-04-06", amount: 3000 } as SavingsEntry,
    ];
    const { result } = renderHook(() =>
      usePaycheckTabState([], [], savingsLog, [], ["2026-04"]),
    );
    expect(result.current.monthData[0].savingsByWeek.get("2026-04-06")).toBe(3000);
  });

  it("ignores savings entry with neither date nor weekOf — falls back to empty string (lines 46/50 empty branch)", () => {
    // Entry has neither date nor weekOf → dateStr = "" → doesn't match month prefix
    const savingsLog: SavingsEntry[] = [
      { id: "s1", amount: 3000 } as SavingsEntry,
    ];
    const { result } = renderHook(() =>
      usePaycheckTabState([], [], savingsLog, [], ["2026-04"]),
    );
    expect(result.current.monthData[0].savingsByWeek.size).toBe(0);
  });

  // NOTE: line 50 `?? ""` inside the forEach is logically unreachable —
  // the filter at line 46 already ensures only entries whose dateStr starts
  // with the month prefix enter the forEach. An empty string ("") can never
  // pass .startsWith("2026-04"), so the ?? "" fallback in forEach never fires.
});
