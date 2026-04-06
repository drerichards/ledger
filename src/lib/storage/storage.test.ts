/**
 * storage.test.ts
 *
 * Tests for the localStorage read/write layer, focusing on migration logic.
 * Every migration added to loadState() should have a corresponding test here.
 */

import { loadState, saveState, clearState, INITIAL_STATE } from "./storage";
import type { AppState } from "@/types";

// ── localStorage mock ──────────────────────────────────────────────────────────

const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
  };
})();

Object.defineProperty(window, "localStorage", { value: localStorageMock });

const STORAGE_KEY = "ledger-v1";

function setRaw(data: unknown) {
  localStorageMock.setItem(STORAGE_KEY, JSON.stringify(data));
}

beforeEach(() => {
  localStorageMock.clear();
});

// ── loadState ─────────────────────────────────────────────────────────────────

describe("loadState", () => {
  it("returns SEED_STATE when localStorage is empty", () => {
    const state = loadState();
    // Seed has bills, plans etc — just assert it's not the empty INITIAL_STATE
    expect(state).not.toEqual(INITIAL_STATE);
  });

  it("returns SEED_STATE when localStorage is corrupt JSON", () => {
    localStorageMock.setItem(STORAGE_KEY, "not valid json {{{");
    const state = loadState();
    expect(state).not.toBeNull();
    // Should not throw — app stays usable
  });

  // ── Bill migration ───────────────────────────────────────────────────────────

  it("stamps missing month on bills using currentMonth()", () => {
    setRaw({
      ...INITIAL_STATE,
      bills: [{ id: "b1", name: "Test", cents: 100, due: 1, paid: false }],
    });
    const state = loadState();
    expect(state.bills[0].month).toBeTruthy();
    expect(state.bills[0].month).toMatch(/^\d{4}-\d{2}$/);
  });

  it("preserves existing month on bills", () => {
    setRaw({
      ...INITIAL_STATE,
      bills: [{ id: "b1", name: "Test", cents: 100, due: 1, paid: false, month: "2025-11" }],
    });
    const state = loadState();
    expect(state.bills[0].month).toBe("2025-11");
  });

  // ── PaycheckWeek migration ────────────────────────────────────────────────────

  it("stamps missing extra field on paycheck weeks", () => {
    setRaw({
      ...INITIAL_STATE,
      paycheck: [{ weekOf: "2026-03-30", kiasPay: 10000 }],
    });
    const state = loadState();
    expect(state.paycheck[0].extra).toEqual({});
  });

  it("preserves existing extra field on paycheck weeks", () => {
    setRaw({
      ...INITIAL_STATE,
      paycheck: [{ weekOf: "2026-03-30", kiasPay: 10000, extra: { custom: 500 } }],
    });
    const state = loadState();
    expect(state.paycheck[0].extra).toEqual({ custom: 500 });
  });

  // ── SavingsEntry migration ────────────────────────────────────────────────────

  it("stamps id and date on old SavingsEntry records that only have weekOf", () => {
    setRaw({
      ...INITIAL_STATE,
      savingsLog: [
        { weekOf: "2026-03-30", amount: 5000 }, // old shape
      ],
    });
    const state = loadState();
    const entry = state.savingsLog[0];
    expect(entry.id).toBeTruthy();
    expect(entry.date).toBe("2026-03-30");
    expect(entry.amount).toBe(5000);
  });

  it("preserves new-shape SavingsEntry records that already have id", () => {
    setRaw({
      ...INITIAL_STATE,
      savingsLog: [
        { id: "abc-123", date: "2026-03-30", amount: 5000 },
      ],
    });
    const state = loadState();
    const entry = state.savingsLog[0];
    expect(entry.id).toBe("abc-123");
    expect(entry.date).toBe("2026-03-30");
  });

  it("handles SavingsEntry with neither id nor weekOf without throwing", () => {
    setRaw({
      ...INITIAL_STATE,
      savingsLog: [{ amount: 5000 }],
    });
    expect(() => loadState()).not.toThrow();
    const state = loadState();
    expect(state.savingsLog[0].id).toBeTruthy(); // generated fallback
  });

  // ── Column migration ─────────────────────────────────────────────────────────

  it("falls back to DEFAULT_PAYCHECK_COLUMNS when paycheckColumns missing", () => {
    setRaw({ ...INITIAL_STATE, paycheckColumns: undefined });
    const state = loadState();
    expect(state.paycheckColumns.length).toBeGreaterThan(0);
  });

  // ── Null-safety guards ────────────────────────────────────────────────────────

  it("guards against null/missing top-level arrays", () => {
    setRaw({ bills: null, checkLog: null, paycheck: null });
    expect(() => loadState()).not.toThrow();
    const state = loadState();
    expect(Array.isArray(state.bills)).toBe(true);
    expect(Array.isArray(state.checkLog)).toBe(true);
    expect(Array.isArray(state.paycheck)).toBe(true);
  });

  it("defaults checkEditWarningAcked to false when missing", () => {
    setRaw({ ...INITIAL_STATE });
    const state = loadState();
    expect(state.checkEditWarningAcked).toBe(false);
  });

  // ── CheckLog merge ────────────────────────────────────────────────────────────

  it("returns stored checkLog as-is when it already has 12+ entries (line 43 branch)", () => {
    const checkLog = Array.from({ length: 12 }, (_, i) => ({
      weekOf: `2026-04-${String(i + 1).padStart(2, "0")}`,
      amount: 50000,
    }));
    setRaw({ ...INITIAL_STATE, checkLog });
    const state = loadState();
    expect(state.checkLog).toHaveLength(12);
    // Verify the seed merge did NOT add extra entries
    expect(state.checkLog[0].weekOf).toBe("2026-04-01");
  });

  it("merges seed entries into stored checkLog when stored has fewer than 12 entries (Map callback coverage)", () => {
    // A single entry with a weekOf that won't collide with seed data forces the
    // stored.map((e) => [e.weekOf, e]) callback to actually execute with an item
    const storedEntry = { weekOf: "2099-01-01", amount: 99999 };
    setRaw({ ...INITIAL_STATE, checkLog: [storedEntry] });
    const state = loadState();
    // Stored entry is preserved
    expect(state.checkLog.some((e) => e.weekOf === "2099-01-01")).toBe(true);
    // Seed entries are merged in (total > 1)
    expect(state.checkLog.length).toBeGreaterThan(1);
  });

  // ── Plan migration ────────────────────────────────────────────────────────────

  it("uses parsed plans when stored state has non-empty plans (line 58 true branch)", () => {
    const plans = [{ id: "custom-plan", label: "Test Plan", mc: 5000, start: "2026-01", end: "2026-06" }];
    setRaw({ ...INITIAL_STATE, plans });
    const state = loadState();
    expect(state.plans[0].id).toBe("custom-plan");
  });
});

// ── saveState / clearState ────────────────────────────────────────────────────

describe("saveState", () => {
  it("persists state that can be round-tripped through loadState", () => {
    const state: AppState = {
      ...INITIAL_STATE,
      savingsLog: [{ id: "x1", date: "2026-04-01", amount: 3000 }],
    };
    saveState(state);
    const loaded = loadState();
    expect(loaded.savingsLog[0].id).toBe("x1");
    expect(loaded.savingsLog[0].date).toBe("2026-04-01");
  });

  it("does not throw when localStorage is full", () => {
    const original = localStorageMock.setItem;
    localStorageMock.setItem = () => { throw new Error("QuotaExceededError"); };
    expect(() => saveState(INITIAL_STATE)).not.toThrow();
    localStorageMock.setItem = original;
  });
});

describe("clearState", () => {
  it("removes persisted state so loadState returns seed", () => {
    saveState({ ...INITIAL_STATE, bills: [{ id: "b1" } as never] });
    clearState();
    const state = loadState();
    // After clear, no bills from the saved state
    expect(state.bills.find((b) => b.id === "b1")).toBeUndefined();
  });
});
