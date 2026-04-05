import { useMemo } from "react";
import type {
  InstallmentPlan,
  KiasCheckEntry,
  PaycheckViewScope,
  PaycheckWeek,
  SavingsEntry,
} from "@/types";
import { getAffirmTotalForMonth } from "@/lib/affirm";
import { getMondaysInMonth, mondayOf } from "@/lib/dates";

/**
 * Derives per-month computed values for the Paycheck tab.
 * Returns a function `getMonthData(month)` so each MonthBlock
 * can get its data without re-deriving the whole grid.
 */
export function usePaycheckTabState(
  paycheck: PaycheckWeek[],
  checkLog: KiasCheckEntry[],
  savingsLog: SavingsEntry[],
  plans: InstallmentPlan[],
  visibleMonths: string[],
) {
  // The most recent paycheck week is used as a template for new empty weeks.
  const template = useMemo(
    () =>
      [...paycheck].sort((a, b) => b.weekOf.localeCompare(a.weekOf))[0],
    [paycheck],
  );

  // Per-month derived data — only recomputes when the underlying slices change.
  const monthData = useMemo(() => {
    return visibleMonths.map((month) => {
      const mondays = getMondaysInMonth(month);
      const affirmTotal = getAffirmTotalForMonth(plans, month);
      const affirmPerWeek =
        mondays.length > 0 ? Math.round(affirmTotal / mondays.length) : 0;

      const monthCheckEntries = checkLog
        .filter((e) => e.weekOf.startsWith(month))
        .sort((a, b) => a.weekOf.localeCompare(b.weekOf));

      const savingsByWeek = new Map<string, number>();
      savingsLog
        .filter((e) => {
          const dateStr = e.date ?? e.weekOf ?? "";
          return dateStr.startsWith(month);
        })
        .forEach((e) => {
          const dateStr = e.date ?? e.weekOf ?? "";
          const monday = mondayOf(dateStr);
          savingsByWeek.set(monday, (savingsByWeek.get(monday) ?? 0) + e.amount);
        });

      return {
        month,
        mondays,
        affirmTotal,
        affirmPerWeek,
        monthCheckEntries,
        savingsByWeek,
      };
    });
  }, [checkLog, savingsLog, plans, visibleMonths]);

  return { template, monthData };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Returns the months to display for a given scope.
 * - weekly/monthly: just the given month
 * - quarterly: calendar quarter (Jan-Mar, Apr-Jun, Jul-Sep, Oct-Dec)
 * - yearly: full calendar year (Jan-Dec)
 */
export function getVisibleMonths(
  from: string,
  scope: PaycheckViewScope,
): string[] {
  const year = from.slice(0, 4);
  const month = parseInt(from.slice(5, 7), 10); // 1-12

  switch (scope) {
    case "weekly":
    case "monthly":
      return [from];
    case "quarterly": {
      // Q1: 1-3, Q2: 4-6, Q3: 7-9, Q4: 10-12
      const quarterStart = Math.floor((month - 1) / 3) * 3 + 1;
      return [
        `${year}-${String(quarterStart).padStart(2, "0")}`,
        `${year}-${String(quarterStart + 1).padStart(2, "0")}`,
        `${year}-${String(quarterStart + 2).padStart(2, "0")}`,
      ];
    }
    case "yearly":
      return Array.from(
        { length: 12 },
        (_, i) => `${year}-${String(i + 1).padStart(2, "0")}`,
      );
  }
}

export function emptyWeek(
  weekOf: string,
  template?: PaycheckWeek,
  kiasPay = 0,
): PaycheckWeek {
  return {
    weekOf,
    kiasPay,
    storage: template?.storage ?? 0,
    rent: template?.rent ?? 0,
    jazmin: template?.jazmin ?? 0,
    dre: template?.dre ?? 0,
    savings: 0,
    paypalCC: template?.paypalCC ?? 0,
    deductions: template?.deductions ?? 0,
    extra: template?.extra ? { ...template.extra } : {},
  };
}
