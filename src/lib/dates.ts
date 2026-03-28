/**
 * Date utilities.
 * All dates are plain strings — no Date objects cross component boundaries.
 * YYYY-MM for months. YYYY-MM-DD for weeks (always the Monday).
 */

/** Returns the current month as a YYYY-MM string. */
export function currentMonth(): string {
  return new Date().toISOString().slice(0, 7);
}

/** Returns the current date as a YYYY-MM-DD string. */
export function today(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Formats a YYYY-MM string as a short human-readable label.
 * Example: "2026-04" → "Apr '26"
 */
export function fmtMonthLabel(ym: string): string {
  const [year, month] = ym.split("-");
  return new Date(+year, +month - 1, 1).toLocaleString("default", {
    month: "short",
    year: "2-digit",
  });
}

/**
 * Formats a YYYY-MM string as a full month + year label.
 * Example: "2026-04" → "April 2026"
 */
export function fmtMonthFull(ym: string): string {
  const [year, month] = ym.split("-");
  return new Date(+year, +month - 1, 1).toLocaleString("default", {
    month: "long",
    year: "numeric",
  });
}

/**
 * Returns the number of months between two YYYY-MM strings, inclusive.
 * Example: "2026-01" to "2026-12" → 12
 */
export function monthsBetween(start: string, end: string): number {
  const s = new Date(start + "-01");
  const e = new Date(end + "-01");
  const diff =
    (e.getFullYear() - s.getFullYear()) * 12 +
    (e.getMonth() - s.getMonth()) +
    1;
  return Math.max(1, diff);
}

/**
 * Returns an ordered array of YYYY-MM strings from start to end, inclusive.
 * Used to build the Affirm grid columns.
 */
export function getMonthRange(start: string, end: string): string[] {
  const months: string[] = [];
  const endDate = new Date(end + "-01");
  let cursor = new Date(start + "-01");

  while (cursor <= endDate) {
    months.push(cursor.toISOString().slice(0, 7));
    cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
  }

  return months;
}

/**
 * Returns the Monday of the week containing the given date.
 * ISO weeks start on Monday.
 */
export function getMondayOf(date: Date): Date {
  const result = new Date(date);
  const dayOfWeek = result.getDay();
  // Sunday = 0 → offset -6, Monday = 1 → offset 0, etc.
  const offset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  result.setDate(result.getDate() + offset);
  return result;
}

/**
 * Returns all Mondays (YYYY-MM-DD) that fall within a given YYYY-MM month.
 * Used to build paycheck week rows.
 */
export function getMondaysInMonth(ym: string): string[] {
  const [year, month] = ym.split("-").map(Number);
  const mondays: string[] = [];

  const firstOfMonth = new Date(year, month - 1, 1);
  let cursor = getMondayOf(firstOfMonth);

  // If the Monday is before the 1st, advance one week
  if (cursor < firstOfMonth) {
    cursor.setDate(cursor.getDate() + 7);
  }

  while (cursor.getMonth() === month - 1) {
    mondays.push(cursor.toISOString().slice(0, 10));
    cursor = new Date(cursor);
    cursor.setDate(cursor.getDate() + 7);
  }

  return mondays;
}

/**
 * Advances a YYYY-MM string by n months.
 * Example: advanceMonth("2026-11", 2) → "2027-01"
 */
export function advanceMonth(ym: string, n: number): string {
  const [year, month] = ym.split("-").map(Number);
  const date = new Date(year, month - 1 + n, 1);
  return date.toISOString().slice(0, 7);
}
