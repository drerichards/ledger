import type { PaycheckColumn, PaycheckWeek } from "@/types";
import { generateId } from "@/lib/id";

// ─── Fixed column registry ────────────────────────────────────────────────────

/**
 * Keys that map directly to typed PaycheckWeek fields.
 * Values for these are read/written via the typed property, not week.extra.
 */
export const FIXED_COLUMN_KEYS = new Set([
  "storage",
  "rent",
  "jazmin",
  "dre",
  "paypalCC",
  "deductions",
]);

/**
 * Canonical ordering and labels for the built-in paycheck columns.
 * Custom columns added by the user append after these.
 */
export const DEFAULT_PAYCHECK_COLUMNS: PaycheckColumn[] = [
  { key: "storage",    label: "Storage",    fixed: true },
  { key: "rent",       label: "Rent",       fixed: true },
  { key: "jazmin",     label: "Jazmin",     fixed: true },
  { key: "dre",        label: "Dre",        fixed: true },
  { key: "paypalCC",   label: "PayPal CC",  fixed: true },
  { key: "deductions", label: "Deductions", fixed: true },
];

// ─── Value accessors ──────────────────────────────────────────────────────────

/**
 * Read the current value for a column from a week.
 * Fixed columns read from the typed field; custom columns read from week.extra.
 */
export function getWeekColumnValue(
  week: PaycheckWeek,
  key: string,
): number {
  if (FIXED_COLUMN_KEYS.has(key)) {
    return (week[key as keyof PaycheckWeek] as number) ?? 0;
  }
  return week.extra?.[key] ?? 0;
}

/**
 * Write a new cents value for a column into a week (immutable — returns new week).
 * Fixed columns update the typed field; custom columns update week.extra.
 */
export function setWeekColumnValue(
  week: PaycheckWeek,
  key: string,
  cents: number,
): PaycheckWeek {
  if (FIXED_COLUMN_KEYS.has(key)) {
    return { ...week, [key]: cents };
  }
  return { ...week, extra: { ...(week.extra ?? {}), [key]: cents } };
}

/**
 * Sum all column values for a week (used to compute the Remaining total).
 * Includes Affirm and savings which are passed in separately.
 */
export function sumWeekColumns(
  week: PaycheckWeek,
  columns: PaycheckColumn[],
  affirmPerWeek: number,
  savingsForWeek: number,
): number {
  const colTotal = columns.reduce(
    (acc, col) => acc + getWeekColumnValue(week, col.key),
    0,
  );
  return affirmPerWeek + savingsForWeek + colTotal;
}

// ─── Column key generation ────────────────────────────────────────────────────

/** Generates a stable, unique key for a new custom column. */
export function newColumnKey(): string {
  return `col_${generateId()}`;
}
