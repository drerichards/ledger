import { useMemo } from "react";
import type { Bill, MonthlyIncome, PaycheckWeek } from "@/types";
import { sumCents, calcShortfall } from "@/lib/money";
import { advanceMonth } from "@/lib/dates";

/**
 * Derives all computed values for the Bill Chart tab.
 * Pure computation — no side effects, no dispatch.
 * Memoized on the slices that affect each value.
 */
export function useBillChartState(
  bills: Bill[],
  income: MonthlyIncome[],
  paycheck: PaycheckWeek[],
  viewMonth: string,
) {
  return useMemo(() => {
    const visibleBills = bills.filter((b) => b.month === viewMonth);
    const kiasBills = visibleBills.filter((b) => b.group === "kias_pay");
    const otherBills = visibleBills.filter((b) => b.group === "other_income");

    const kiasBillsCents = sumCents(kiasBills.map((b) => b.cents));
    const otherBillsCents = sumCents(otherBills.map((b) => b.cents));
    const totalCents = kiasBillsCents + otherBillsCents;
    const paidCents = sumCents(
      visibleBills.filter((b) => b.paid).map((b) => b.cents),
    );
    const unpaidCents = totalCents - paidCents;

    // Kia's pay for the view month is derived from the *previous* month's
    // paycheck weeks — she earns in month N to pay bills in month N+1.
    const prevMonth = advanceMonth(viewMonth, -1);
    const kiasPayCents = sumCents(
      paycheck
        .filter((w) => w.weekOf.startsWith(prevMonth))
        .map((w) => w.kiasPay),
    );

    const thisMonthIncome = income.find((i) => i.month === viewMonth);
    const otherIncomeCents = sumCents([
      thisMonthIncome?.military_pay ?? 0,
      thisMonthIncome?.retirement ?? 0,
      thisMonthIncome?.social_security ?? 0,
    ]);

    // SHORT is only against Other Income bills — never Kia's Pay bills.
    const shortfall = calcShortfall(otherBillsCents, otherIncomeCents);

    return {
      visibleBills,
      kiasBills,
      otherBills,
      kiasBillsCents,
      otherBillsCents,
      totalCents,
      paidCents,
      unpaidCents,
      kiasPayCents,
      thisMonthIncome,
      otherIncomeCents,
      shortfall,
    };
  }, [bills, income, paycheck, viewMonth]);
}
