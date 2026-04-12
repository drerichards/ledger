/**
 * Baseline monthly income amounts (in cents).
 * Used as defaults when no MonthlyIncome record exists for a given month.
 * Both the AccountsTab stat card (via useBillChartState) and the
 * IncomePanel reconciliation view must use the same defaults so the two
 * surplus figures never diverge.
 */
export const INCOME_DEFAULTS = {
  military_pay: 124190,   // $1,241.90
  retirement: 33447,      // $334.47
  social_security: 77500, // $775.00
} as const;
