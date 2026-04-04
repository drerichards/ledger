import { useMemo } from "react";
import type {
  InstallmentPlan,
  KiasCheckEntry,
  PaycheckViewScope,
  PaycheckWeek,
  SavingsEntry,
} from "@/types";
import { getAffirmTotalForMonth } from "@/lib/affirm";
import { getMondaysInMonth, advanceMonth, mondayOf } from "@/lib/dates";

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
        .filter((e) => e.weekOf.startsWith(month))
        .forEach((e) => {
          const monday = mondayOf(e.weekOf);
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

export function getVisibleMonths(
  from: string,
  scope: PaycheckViewScope,
): string[] {
  switch (scope) {
    case "weekly":
    case "monthly":
      return [from];
    case "quarterly":
      return [from, advanceMonth(from, 1), advanceMonth(from, 2)];
    case "yearly":
      return Array.from({ length: 12 }, (_, i) => advanceMonth(from, i));
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
