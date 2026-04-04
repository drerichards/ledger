"use client";

/**
 * Supabase sync layer.
 *
 * Handles bidirectional mapping between the TypeScript AppState (camelCase)
 * and Supabase table rows (snake_case). All functions fail silently —
 * localStorage remains the fast local cache; Supabase is the persistent store.
 *
 * Load order on auth:
 *   1. loadFromSupabase() — returns AppState if user has remote data
 *   2. If null → seed data is used and syncStateToSupabase() migrates it up
 *
 * Sync on mutation:
 *   - syncStateToSupabase() — debounced full upsert (all 7 tables)
 *   - deleteBillRemote() / deletePlanRemote() — targeted deletes (immediate)
 */

import type {
  AppState,
  Bill,
  InstallmentPlan,
  KiasCheckEntry,
  MonthlyIncome,
  MonthSnapshot,
  PaycheckWeek,
  SavingsEntry,
} from "@/types";
import { createClient } from "./client";
import { DEFAULT_PAYCHECK_COLUMNS } from "@/lib/paycheck";

// ─── Row shape types (Supabase schema) ───────────────────────────────────────

type BillRow = {
  id: string;
  user_id: string;
  month: string;
  name: string;
  cents: number;
  due: number;
  paid: boolean;
  method: string;
  group: string;
  entry: string;
  category: string;
  flagged: boolean;
  notes: string;
  amount_history: Array<{ date: string; cents: number }>;
};

type PlanRow = {
  id: string;
  user_id: string;
  label: string;
  mc: number;
  start: string;
  end: string;
};

type IncomeRow = {
  id: string;
  user_id: string;
  month: string;
  kias_pay: number;
  military_pay: number;
  retirement: number;
  social_security: number;
};

type SnapshotRow = {
  id: string;
  user_id: string;
  month: string;
  total_billed: number;
  total_paid: number;
  shortfall: number;
  savings_moved: number;
  kias_pay_actual: number;
};

type PaycheckRow = {
  id: string;
  user_id: string;
  week_of: string;
  kias_pay: number;
  storage: number;
  rent: number;
  jazmin: number;
  dre: number;
  savings: number;
  paypal_cc: number;
  deductions: number;
};

type CheckLogRow = {
  id: string;
  user_id: string;
  week_of: string;
  amount: number;
};

type SavingsLogRow = {
  id: string;
  user_id: string;
  week_of: string;
  amount: number;
};

// ─── Mappers: TypeScript → Row ────────────────────────────────────────────────

const billToRow = (b: Bill, userId: string): BillRow => ({
  id: b.id,
  user_id: userId,
  month: b.month,
  name: b.name,
  cents: b.cents,
  due: b.due,
  paid: b.paid,
  method: b.method,
  group: b.group,
  entry: b.entry,
  category: b.category,
  flagged: b.flagged,
  notes: b.notes,
  amount_history: b.amountHistory,
});

const planToRow = (p: InstallmentPlan, userId: string): PlanRow => ({
  id: p.id,
  user_id: userId,
  label: p.label,
  mc: p.mc,
  start: p.start,
  end: p.end,
});

const incomeToRow = (i: MonthlyIncome, userId: string): IncomeRow => ({
  // income table uses (user_id, month) as the unique key — id derived from month
  id: `${userId}-${i.month}`,
  user_id: userId,
  month: i.month,
  kias_pay: i.kias_pay,
  military_pay: i.military_pay,
  retirement: i.retirement,
  social_security: i.social_security,
});

const snapshotToRow = (s: MonthSnapshot, userId: string): SnapshotRow => ({
  id: `${userId}-${s.month}`,
  user_id: userId,
  month: s.month,
  total_billed: s.totalBilled,
  total_paid: s.totalPaid,
  shortfall: s.shortfall,
  savings_moved: s.savingsMoved,
  kias_pay_actual: s.kiasPayActual,
});

const paycheckToRow = (w: PaycheckWeek, userId: string): PaycheckRow => ({
  id: `${userId}-${w.weekOf}`,
  user_id: userId,
  week_of: w.weekOf,
  kias_pay: w.kiasPay,
  storage: w.storage,
  rent: w.rent,
  jazmin: w.jazmin,
  dre: w.dre,
  savings: w.savings,
  paypal_cc: w.paypalCC,
  deductions: w.deductions,
});

const checkEntryToRow = (e: KiasCheckEntry, userId: string): CheckLogRow => ({
  id: `${userId}-${e.weekOf}`,
  user_id: userId,
  week_of: e.weekOf,
  amount: e.amount,
});

const savingsEntryToRow = (e: SavingsEntry, userId: string): SavingsLogRow => ({
  id: `${userId}-${e.weekOf}`,
  user_id: userId,
  week_of: e.weekOf,
  amount: e.amount,
});

// ─── Mappers: Row → TypeScript ────────────────────────────────────────────────

const rowToBill = (r: BillRow): Bill => ({
  id: r.id,
  month: r.month,
  name: r.name,
  cents: r.cents,
  due: r.due,
  paid: r.paid,
  method: r.method as Bill["method"],
  group: r.group as Bill["group"],
  entry: r.entry as Bill["entry"],
  category: r.category as Bill["category"],
  flagged: r.flagged,
  notes: r.notes,
  amountHistory: r.amount_history ?? [],
});

const rowToPlan = (r: PlanRow): InstallmentPlan => ({
  id: r.id,
  label: r.label,
  mc: r.mc,
  start: r.start,
  end: r.end,
});

const rowToIncome = (r: IncomeRow): MonthlyIncome => ({
  month: r.month,
  kias_pay: r.kias_pay,
  military_pay: r.military_pay,
  retirement: r.retirement,
  social_security: r.social_security,
});

const rowToSnapshot = (r: SnapshotRow): MonthSnapshot => ({
  month: r.month,
  totalBilled: r.total_billed,
  totalPaid: r.total_paid,
  shortfall: r.shortfall,
  savingsMoved: r.savings_moved,
  kiasPayActual: r.kias_pay_actual,
});

const rowToPaycheck = (r: PaycheckRow): PaycheckWeek => ({
  weekOf: r.week_of,
  kiasPay: r.kias_pay,
  storage: r.storage,
  rent: r.rent,
  jazmin: r.jazmin,
  dre: r.dre,
  savings: r.savings,
  paypalCC: r.paypal_cc,
  deductions: r.deductions,
  extra: {},
});

const rowToCheckEntry = (r: CheckLogRow): KiasCheckEntry => ({
  weekOf: r.week_of,
  amount: r.amount,
});

const rowToSavingsEntry = (r: SavingsLogRow): SavingsEntry => ({
  weekOf: r.week_of,
  amount: r.amount,
});

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Loads all app data from Supabase for the currently authenticated user.
 * Returns null if the user is not authenticated or has no data yet.
 */
export async function loadFromSupabase(): Promise<AppState | null> {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;

    const [bills, plans, income, snapshots, paycheck, checkLog, savingsLog] =
      await Promise.all([
        supabase.from("bills").select("*").eq("user_id", user.id),
        supabase.from("installment_plans").select("*").eq("user_id", user.id),
        supabase.from("income").select("*").eq("user_id", user.id),
        supabase.from("snapshots").select("*").eq("user_id", user.id),
        supabase.from("paycheck_weeks").select("*").eq("user_id", user.id),
        supabase.from("check_log").select("*").eq("user_id", user.id),
        supabase.from("savings_log").select("*").eq("user_id", user.id),
      ]);

    // If no data exists yet, return null to trigger seed migration
    const hasData =
      (bills.data?.length ?? 0) > 0 || (plans.data?.length ?? 0) > 0;
    if (!hasData) return null;

    return {
      bills: (bills.data as BillRow[]).map(rowToBill),
      plans: (plans.data as PlanRow[]).map(rowToPlan),
      income: (income.data as IncomeRow[]).map(rowToIncome),
      snapshots: (snapshots.data as SnapshotRow[]).map(rowToSnapshot),
      paycheck: (paycheck.data as PaycheckRow[]).map(rowToPaycheck),
      checkLog: (checkLog.data as CheckLogRow[]).map(rowToCheckEntry),
      savingsLog: (savingsLog.data as SavingsLogRow[]).map(rowToSavingsEntry),
      paycheckViewScope: "monthly",
      paycheckColumns: DEFAULT_PAYCHECK_COLUMNS,
      seenNotificationIds: [],
    };
  } catch {
    return null;
  }
}

/**
 * Upserts the entire AppState to Supabase for the authenticated user.
 * Called after hydrate (seed migration) and debounced on state changes.
 * Fails silently — localStorage remains as the local cache fallback.
 */
export async function syncStateToSupabase(state: AppState): Promise<void> {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const uid = user.id;

    await Promise.all([
      state.bills.length > 0
        ? supabase
            .from("bills")
            .upsert(state.bills.map((b) => billToRow(b, uid)))
        : Promise.resolve(),
      state.plans.length > 0
        ? supabase
            .from("installment_plans")
            .upsert(state.plans.map((p) => planToRow(p, uid)))
        : Promise.resolve(),
      state.income.length > 0
        ? supabase
            .from("income")
            .upsert(state.income.map((i) => incomeToRow(i, uid)))
        : Promise.resolve(),
      state.snapshots.length > 0
        ? supabase
            .from("snapshots")
            .upsert(state.snapshots.map((s) => snapshotToRow(s, uid)))
        : Promise.resolve(),
      state.paycheck.length > 0
        ? supabase
            .from("paycheck_weeks")
            .upsert(state.paycheck.map((w) => paycheckToRow(w, uid)))
        : Promise.resolve(),
      state.checkLog.length > 0
        ? supabase
            .from("check_log")
            .upsert(state.checkLog.map((e) => checkEntryToRow(e, uid)))
        : Promise.resolve(),
      state.savingsLog.length > 0
        ? supabase
            .from("savings_log")
            .upsert(state.savingsLog.map((e) => savingsEntryToRow(e, uid)))
        : Promise.resolve(),
    ]);
  } catch {
    // Fail silently — localStorage remains source of truth during the session
  }
}

/**
 * Deletes a single bill from Supabase. Call immediately on DELETE_BILL dispatch.
 */
export async function deleteBillRemote(id: string): Promise<void> {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    await supabase
      .from("bills")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);
  } catch {
    // Silent fail
  }
}

/**
 * Deletes a single installment plan from Supabase. Call immediately on DELETE_PLAN dispatch.
 */
export async function deletePlanRemote(id: string): Promise<void> {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    await supabase
      .from("installment_plans")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);
  } catch {
    // Silent fail
  }
}

/**
 * Deletes a check log entry from Supabase by week_of.
 */
export async function deleteCheckEntryRemote(weekOf: string): Promise<void> {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    await supabase
      .from("check_log")
      .delete()
      .eq("week_of", weekOf)
      .eq("user_id", user.id);
    await supabase
      .from("savings_log")
      .delete()
      .eq("week_of", weekOf)
      .eq("user_id", user.id);
  } catch {
    // Silent fail
  }
}
