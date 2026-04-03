/**
 * money.ts — Core monetary arithmetic utilities.
 *
 * WHY THIS FILE EXISTS:
 * JavaScript uses IEEE 754 floating point for all numbers. This means
 * 0.1 + 0.2 = 0.30000000000000004. For display, fine. For financial
 * calculations, catastrophic — errors compound across hundreds of bills.
 *
 * THE RULE: Store all money as integers (cents). Do math on integers only.
 * Convert to dollars at the exact moment of display — nowhere else.
 *
 * EXAMPLE:
 *   Wrong:  const total = 12.50 + 8.99;  // 21.490000000000002
 *   Right:  const total = 1250 + 899;    // 2149 — exact, always
 *           fmtMoney(total)              // "$21.49"
 *
 * LEARN: This pattern is called "fixed-point arithmetic." Every financial
 * system (banks, payment processors, accounting software) uses it.
 * JavaScript's Intl.NumberFormat handles the display formatting correctly
 * for any locale — you never need to write the dollar sign yourself.
 */

/**
 * Converts a user-entered dollar string to integer cents.
 * Called ONLY at input boundaries — form submission, data loading from storage.
 *
 * WHY strip non-numeric chars first:
 * Users may type "$1,084.00" — the dollar sign and comma are valid input
 * but parseFloat would choke on them. Strip to "1084.00" first.
 *
 * WHY Math.round:
 * 1.005 * 100 in IEEE 754 = 100.49999... (float drift).
 * Math.round corrects for this. Without it, sub-cent rounding errors accumulate.
 */
export function toCents(value: string): number {
  const numeric = parseFloat(value.replace(/[^0-9.]/g, ""));
  return isNaN(numeric) ? 0 : Math.round(numeric * 100);
}

/**
 * Formats an integer cent amount as a USD currency string for display.
 * Called ONLY at render boundaries — inside JSX, never in calculations.
 *
 * WHY Intl.NumberFormat via toLocaleString:
 * Handles thousands separators, decimal places, and the currency symbol
 * automatically. In the US: $1,234.56. No manual string formatting needed.
 */
export function fmtMoney(cents: number): string {
  return (cents / 100).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * Sums an array of cent values.
 *
 * WHY a dedicated function instead of inline .reduce():
 * Centralizes the operation so every call site uses the same pattern.
 * If we ever need to add overflow protection or logging, one place to change.
 */
export function sumCents(amounts: number[]): number {
  return amounts.reduce((total, amount) => total + amount, 0);
}

/**
 * Calculates the shortfall or surplus given bills and income.
 * Positive = short (bills exceed income). Negative = surplus (income exceeds bills).
 *
 * WHY this specific signature (bills first, income second):
 * The natural reading of "SHORT" is "bills - income = how much we're missing."
 * Keeping the argument order consistent prevents accidentally swapping them
 * and getting a surplus when she's actually short.
 *
 * DOMAIN: In Ledger, this is called with otherBillsCents and otherIncomeCents —
 * specifically the "Other Income" group bills vs fixed income (military pay,
 * retirement, social security). Kia's Pay is never part of this calculation.
 */
export function calcShortfall(
  totalBillsCents: number,
  totalIncomeCents: number,
): number {
  return totalBillsCents - totalIncomeCents;
}
