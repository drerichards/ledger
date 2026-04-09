// ─── Payment & Grouping Enums ─────────────────────────────────────────────────

/** How the bill is paid. Autopay = drafted automatically. Transfer = she initiates it. */
export type PaymentMethod = "autopay" | "transfer";

/** Which income bucket covers this bill. Determines table group in the Bill Chart. */
export type BillGroup = "kias_pay" | "other_income";

/** Whether the bill auto-carries forward each month or requires manual re-entry. */
export type BillEntry = "recurring" | "manual";

/** Granularity of the paycheck tab view toggle. */
export type PaycheckViewScope = "weekly" | "monthly" | "quarterly" | "yearly";

/**
 * One configurable column in the paycheck grid.
 * Fixed columns map 1:1 to typed fields on PaycheckWeek (cannot be deleted, only renamed).
 * Custom columns (fixed: false) store their values in PaycheckWeek.extra[key].
 */
export type PaycheckColumn = {
  key: string;
  label: string;
  /** true = backed by a typed PaycheckWeek field; cannot be deleted, only renamed. */
  fixed: boolean;
  /** true = column is hidden from view but data is preserved. Can be restored. */
  hidden?: boolean;
};

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
  jazmin: number; // cents — weekly family transfer
  dre: number; // cents — weekly family transfer
  savings: number; // cents — intentional savings move
  paypalCC: number; // cents
  deductions: number; // cents
  // affirm is not stored here — it is derived from InstallmentPlan[] at render time
  /** Data for user-added custom columns (non-fixed PaycheckColumns). Key = column key. */
  extra?: Record<string, number>;
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

/** One historical edit in a check entry's audit trail. */
export type CheckEditHistoryEntry = {
  editedAt: string; // ISO datetime string
  oldAmount: number; // cents — the value before this edit
  newAmount: number; // cents — the value after this edit
  reason?: string; // optional: why the edit was made
};

/** One entry in Kia's weekly pay history. Powers the baseline projection. */
export type KiasCheckEntry = {
  weekOf: string; // YYYY-MM-DD
  amount: number; // cents
  /** Audit trail for historical edits. Only populated for weeks that were edited after the month closed. */
  editHistory?: CheckEditHistoryEntry[];
};

/** One intentional savings deposit. Powers the savings balance tracker. */
export type SavingsEntry = {
  id: string; // unique identifier for edit/delete
  date: string; // YYYY-MM-DD — the deposit date (user-selectable)
  amount: number; // cents
  /** @deprecated Use `date` instead. Kept for migration compatibility. */
  weekOf?: string;
};

// ─── Savings Goals ────────────────────────────────────────────────────────────

/**
 * A named savings goal with a target amount and optional deadline.
 * Monthly contribution needed and on-track status are derived at render time.
 */
export type SavingsGoal = {
  id: string;
  label: string;           // e.g. "Buy a car", "Save $1000 by August"
  targetCents: number;     // integer cents
  targetDate: string;      // YYYY-MM — the month by which goal should be met
  createdAt: string;       // ISO datetime string
  priority?: number;       // 1 = highest — optional ordering hint
};

// ─── Milestones ───────────────────────────────────────────────────────────────

export type MilestoneType =
  | "affirm_payoff"
  | "savings_threshold"
  | "goal_achieved"
  | "first_surplus";

/**
 * A financial milestone derived from app state.
 * Stored in AppState as a permanent feed entry.
 * Also triggers an ephemeral toast when first achieved.
 */
export type Milestone = {
  id: string;
  type: MilestoneType;
  /** Free-form payload describing what was achieved. Shape varies by type. */
  payload: Record<string, unknown>;
  achievedAt: string;      // ISO datetime string
  seen: boolean;           // true once the user has seen the toast
};

// ─── Notifications ────────────────────────────────────────────────────────────

/**
 * A derived notification surfaced when an Affirm installment plan is paid off.
 * Not stored directly — derived from InstallmentPlan[] at runtime.
 * The id (`${planId}-payoff`) is stable and used to track seen/unseen state.
 */
export type AppNotification = {
  id: string;         // `${planId}-payoff`
  planId: string;
  planLabel: string;
  month: string;      // YYYY-MM — the final payment month
  mc: number;         // monthly payment in cents (the freed-up amount)
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
  /** Ordered list of paycheck grid columns. Fixed columns can only be renamed. */
  paycheckColumns: PaycheckColumn[];
  /**
   * IDs of AppNotifications the user has already seen (opened the dropdown).
   * Notifications themselves are derived — only seen state is persisted.
   */
  seenNotificationIds: string[];
  /**
   * True if user has acknowledged the warning about editing historical check entries.
   * When true, the modal still appears but without the warning text.
   */
  checkEditWarningAcked: boolean;
  /** User-defined savings goals. Contribution math derived at render time. */
  goals: SavingsGoal[];
  /** Achieved milestones. Derived from state changes and persisted as a feed. */
  milestones: Milestone[];
};
