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
 * Uses integer arithmetic only — no Date objects — to avoid timezone drift.
 */
export function getMonthRange(start: string, end: string): string[] {
  const months: string[] = [];
  const [sy, sm] = start.split("-").map(Number);
  const [ey, em] = end.split("-").map(Number);

  let year = sy;
  let month = sm;

  while (year < ey || (year === ey && month <= em)) {
    months.push(`${year}-${String(month).padStart(2, "0")}`);
    month += 1;
    if (month > 12) {
      month = 1;
      year += 1;
    }
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
 * Returns the Monday of the week containing the given date string, as YYYY-MM-DD.
 */
export function mondayOf(dateStr: string): string {
  return getMondayOf(new Date(dateStr + "T12:00:00")).toISOString().slice(0, 10);
}

/**
 * Returns all Friday dates (YYYY-MM-DD) that fall within a given YYYY-MM month.
 * Uses the Date constructor with numeric args — not string parsing — so there
 * is no timezone drift risk.
 */
export function getFridaysInMonth(ym: string): string[] {
  const [year, month] = ym.split("-").map(Number);
  const fridays: string[] = [];

  // new Date(year, monthIndex, day) — numeric args, no string parse = no timezone bug
  const firstOfMonth = new Date(year, month - 1, 1);
  const dayOfWeek = firstOfMonth.getDay(); // 0=Sun … 5=Fri … 6=Sat
  // Days until Friday: (5 - dayOfWeek + 7) % 7
  const daysToFirst = (5 - dayOfWeek + 7) % 7;
  const firstFridayDay = 1 + daysToFirst;

  const daysInMonth = new Date(year, month, 0).getDate();

  for (let day = firstFridayDay; day <= daysInMonth; day += 7) {
    fridays.push(
      `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
    );
  }

  return fridays;
}

/**
 * Returns all Friday dates from fromMonth through toMonth, inclusive, newest first.
 */
export function getFridaysUpToMonth(toMonth: string, fromMonth?: string): string[] {
  const start = fromMonth ?? advanceMonth(toMonth, -5); // default: 6-month window
  const months = getMonthRange(start, toMonth);
  const fridays: string[] = [];
  for (const ym of months) {
    fridays.push(...getFridaysInMonth(ym));
  }
  // Newest first
  return fridays.reverse();
}

/**
 * Returns all Monday dates (YYYY-MM-DD) from fromMonth through toMonth, inclusive, newest first.
 * Mirrors getFridaysUpToMonth — used by CheckLog after weekOf normalization to Monday.
 */
export function getMondaysUpToMonth(toMonth: string, fromMonth?: string): string[] {
  const start = fromMonth ?? advanceMonth(toMonth, -5); // default: 6-month window
  const months = getMonthRange(start, toMonth);
  const mondays: string[] = [];
  for (const ym of months) {
    mondays.push(...getMondaysInMonth(ym));
  }
  // Newest first
  return mondays.reverse();
}

/**
 * Advances a YYYY-MM string by n months.
 * Uses integer arithmetic to avoid timezone drift.
 */
export function advanceMonth(ym: string, n: number): string {
  const [year, month] = ym.split("-").map(Number);
  const totalMonths = year * 12 + (month - 1) + n;
  const newYear = Math.floor(totalMonths / 12);
  const newMonth = (totalMonths % 12) + 1;
  return `${newYear}-${String(newMonth).padStart(2, "0")}`;
}
