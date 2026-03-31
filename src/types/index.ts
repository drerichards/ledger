// ─── Payment & Grouping Enums ─────────────────────────────────────────────────

/** How the bill is paid. Autopay = drafted automatically. Transfer = she initiates it. */
export type PaymentMethod = "autopay" | "transfer";

/** Which income bucket covers this bill. Determines table group in the Bill Chart. */
export type BillGroup = "kias_pay" | "other_income";

/** Whether the bill auto-carries forward each month or requires manual re-entry. */
export type BillEntry = "recurring" | "manual";

/** Granularity of the paycheck tab view toggle. */
export type PaycheckViewScope = "weekly" | "monthly" | "quarterly" | "yearly";

// ─── Core Entities ────────────────────────────────────────────────────────────
export type BillCategory =
  | "Credit Cards"
  | "Insurance"
  | "Subscriptions"
  | "Utilities"
  | "Housing"
  | "Loans"
  | "Transfers"
  | "Savings"
  | "Other";

export type Bill = {
  id: string;
  month: string; // YYYY-MM — which month this bill instance belongs to
  name: string;
  cents: number; // always stored in cents — never float
  due: number; // day of month (1–31)
  paid: boolean;
  method: PaymentMethod;
  group: BillGroup;
  entry: BillEntry;
  category: BillCategory;
  flagged: boolean; // red flag — set manually, means "pay attention"
  notes: string;
  amountHistory: AmountHistoryEntry[]; // silently logged on every edit
};

/** One entry in a bill's amount change log. */
export type AmountHistoryEntry = {
  date: string; // ISO date string YYYY-MM-DD
  cents: number; // the amount at that point in time
};

export type InstallmentPlan = {
  id: string;
  label: string;
  mc: number; // monthly payment in cents
  start: string; // YYYY-MM — first payment month
  end: string; // YYYY-MM — final payment month (inclusive)
};

export type PaycheckWeek = {
  weekOf: string; // YYYY-MM-DD — always the Monday of that week
  kiasPay: number; // cents — entered by her each week (fluctuates)
  storage: number; // cents
  rent: number; // cents
  rentWeek: boolean; // true = the week the full rent draft hits
  jazmin: number; // cents — weekly family transfer
  dre: number; // cents — weekly family transfer
  savings: number; // cents — intentional savings move
  paypalCC: number; // cents
  deductions: number; // cents
  // affirm is not stored here — it is derived from InstallmentPlan[] at render time
};

// ─── Income & Reconciliation ──────────────────────────────────────────────────

/** Monthly income amounts entered by her. Used to calculate shortfall/surplus. */
export type MonthlyIncome = {
  month: string; // YYYY-MM
  kias_pay: number; // cents — his monthly total (sum of weekly checks)
  military_pay: number; // cents
  retirement: number; // cents
  social_security: number; // cents
};

/** Snapshot generated at month-end. Becomes a permanent historical record. */
export type MonthSnapshot = {
  month: string; // YYYY-MM
  totalBilled: number; // cents
  totalPaid: number; // cents
  shortfall: number; // cents — positive = short, negative = surplus
  savingsMoved: number; // cents
  kiasPayActual: number; // cents — sum of checkLog entries for that month
};

// ─── Kia's Check Log ─────────────────────────────────────────────────────────

/** One entry in Kia's weekly pay history. Powers the baseline projection. */
export type KiasCheckEntry = {
  weekOf: string; // YYYY-MM-DD
  amount: number; // cents
};

/** One week's intentional savings deposit. Powers the savings balance tracker. */
export type SavingsEntry = {
  weekOf: string; // YYYY-MM-DD
  amount: number; // cents
};

// ─── Root State ───────────────────────────────────────────────────────────────

/**
 * The entire application state. Serialized to localStorage under `ledger-v1`.
 * Every mutation writes the full state — no partial saves.
 */
export type AppState = {
  bills: Bill[];
  income: MonthlyIncome[];
  snapshots: MonthSnapshot[];
  plans: InstallmentPlan[];
  paycheck: PaycheckWeek[];
  checkLog: KiasCheckEntry[];
  savingsLog: SavingsEntry[];
  paycheckViewScope: PaycheckViewScope;
};
