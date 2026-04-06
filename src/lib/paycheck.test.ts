import {
  FIXED_COLUMN_KEYS,
  DEFAULT_PAYCHECK_COLUMNS,
  getWeekColumnValue,
  setWeekColumnValue,
  sumWeekColumns,
  newColumnKey,
} from "@/lib/paycheck";
import type { PaycheckColumn, PaycheckWeek } from "@/types";

// ─── Factory ──────────────────────────────────────────────────────────────────

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
    deductions: 1000,
    ...overrides,
  };
}

// ─── FIXED_COLUMN_KEYS ────────────────────────────────────────────────────────

describe("FIXED_COLUMN_KEYS", () => {
  it("contains all expected fixed column keys", () => {
    expect(FIXED_COLUMN_KEYS.has("storage")).toBe(true);
    expect(FIXED_COLUMN_KEYS.has("rent")).toBe(true);
    expect(FIXED_COLUMN_KEYS.has("jazmin")).toBe(true);
    expect(FIXED_COLUMN_KEYS.has("dre")).toBe(true);
    expect(FIXED_COLUMN_KEYS.has("paypalCC")).toBe(true);
    expect(FIXED_COLUMN_KEYS.has("deductions")).toBe(true);
  });

  it("does not contain non-fixed keys", () => {
    expect(FIXED_COLUMN_KEYS.has("kiasPay")).toBe(false);
    expect(FIXED_COLUMN_KEYS.has("savings")).toBe(false);
    expect(FIXED_COLUMN_KEYS.has("col_custom")).toBe(false);
  });
});

// ─── DEFAULT_PAYCHECK_COLUMNS ─────────────────────────────────────────────────

describe("DEFAULT_PAYCHECK_COLUMNS", () => {
  it("has 6 columns", () => {
    expect(DEFAULT_PAYCHECK_COLUMNS).toHaveLength(6);
  });

  it("all default columns are marked fixed", () => {
    DEFAULT_PAYCHECK_COLUMNS.forEach((col) => {
      expect(col.fixed).toBe(true);
    });
  });

  it("all default column keys are in FIXED_COLUMN_KEYS", () => {
    DEFAULT_PAYCHECK_COLUMNS.forEach((col) => {
      expect(FIXED_COLUMN_KEYS.has(col.key)).toBe(true);
    });
  });
});

// ─── getWeekColumnValue ───────────────────────────────────────────────────────

describe("getWeekColumnValue", () => {
  it("reads from typed field for a fixed column", () => {
    const week = makeWeek({ storage: 14000 });
    expect(getWeekColumnValue(week, "storage")).toBe(14000);
  });

  it("reads from week.extra for a custom column", () => {
    const week = makeWeek({ extra: { col_abc: 9999 } });
    expect(getWeekColumnValue(week, "col_abc")).toBe(9999);
  });

  it("returns 0 for a custom column with no extra map", () => {
    const week = makeWeek();
    expect(getWeekColumnValue(week, "col_missing")).toBe(0);
  });

  it("returns 0 for a custom column missing from extra", () => {
    const week = makeWeek({ extra: { col_other: 500 } });
    expect(getWeekColumnValue(week, "col_missing")).toBe(0);
  });

  it("returns 0 when a fixed column field is absent on the week object (line 43 ?? 0 branch)", () => {
    // Simulates a malformed/migrating week where a fixed field is missing
    const week = { weekOf: "2026-04-06" } as unknown as PaycheckWeek;
    expect(getWeekColumnValue(week, "storage")).toBe(0);
  });
});

// ─── setWeekColumnValue ───────────────────────────────────────────────────────

describe("setWeekColumnValue", () => {
  it("updates a fixed column's typed field immutably", () => {
    const week = makeWeek({ storage: 14000 });
    const updated = setWeekColumnValue(week, "storage", 20000);
    expect(updated.storage).toBe(20000);
    expect(week.storage).toBe(14000); // original unchanged
  });

  it("does not mutate the original week for a fixed column", () => {
    const week = makeWeek({ rent: 80000 });
    setWeekColumnValue(week, "rent", 90000);
    expect(week.rent).toBe(80000);
  });

  it("writes to week.extra for a custom column", () => {
    const week = makeWeek();
    const updated = setWeekColumnValue(week, "col_custom", 7500);
    expect(updated.extra?.col_custom).toBe(7500);
  });

  it("preserves existing extra entries when writing a custom column", () => {
    const week = makeWeek({ extra: { col_existing: 1000 } });
    const updated = setWeekColumnValue(week, "col_new", 2000);
    expect(updated.extra?.col_existing).toBe(1000);
    expect(updated.extra?.col_new).toBe(2000);
  });

  it("does not mutate original extra map", () => {
    const week = makeWeek({ extra: { col_abc: 100 } });
    setWeekColumnValue(week, "col_abc", 999);
    expect(week.extra?.col_abc).toBe(100);
  });
});

// ─── sumWeekColumns ───────────────────────────────────────────────────────────

describe("sumWeekColumns", () => {
  it("sums all column values plus affirm and savings", () => {
    const week = makeWeek({
      storage: 14000,
      rent: 0,
      jazmin: 20000,
      dre: 20000,
      paypalCC: 5000,
      deductions: 1000,
    });
    const affirmPerWeek = 8000;
    const savingsForWeek = 3000;
    // col total = 14000 + 0 + 20000 + 20000 + 5000 + 1000 = 60000
    // total = 8000 + 3000 + 60000 = 71000
    expect(sumWeekColumns(week, DEFAULT_PAYCHECK_COLUMNS, affirmPerWeek, savingsForWeek)).toBe(71000);
  });

  it("returns 0 for an empty column list with no affirm or savings", () => {
    const week = makeWeek();
    expect(sumWeekColumns(week, [], 0, 0)).toBe(0);
  });

  it("includes custom column values", () => {
    const week = makeWeek({ extra: { col_custom: 5000 } });
    const customCol: PaycheckColumn = { key: "col_custom", label: "Custom", fixed: false };
    expect(sumWeekColumns(week, [customCol], 0, 0)).toBe(5000);
  });
});

// ─── newColumnKey ─────────────────────────────────────────────────────────────

describe("newColumnKey", () => {
  it("returns a string starting with 'col_'", () => {
    expect(newColumnKey()).toMatch(/^col_/);
  });

  it("returns unique keys on consecutive calls", () => {
    const keys = new Set(Array.from({ length: 50 }, () => newColumnKey()));
    expect(keys.size).toBe(50);
  });
});
