/**
 * Money utilities.
 * Rule: all amounts are stored and calculated in cents (integer).
 * Conversion to/from dollars happens only at the UI boundary.
 */

/**
 * Converts a user-entered dollar string to integer cents.
 * Strips non-numeric characters before parsing so "$1,084.00" → 108400.
 */
export function toCents(value: string): number {
  const numeric = parseFloat(value.replace(/[^0-9.]/g, ""));
  return isNaN(numeric) ? 0 : Math.round(numeric * 100);
}

/**
 * Formats an integer cent amount as a USD currency string.
 * Example: 108400 → "$1,084.00"
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
 * Centralizes reduction so call sites don't inline it.
 */
export function sumCents(amounts: number[]): number {
  return amounts.reduce((total, amount) => total + amount, 0);
}

/**
 * Calculates the shortfall or surplus given total bills and total income.
 * Positive result = short. Negative result = surplus.
 */
export function calcShortfall(
  totalBillsCents: number,
  totalIncomeCents: number,
): number {
  return totalBillsCents - totalIncomeCents;
}
