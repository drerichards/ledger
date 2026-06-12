import type { AppState } from "@/types";
import { DEFAULT_PAYCHECK_COLUMNS } from "@/lib/paycheck";
import { SEED_STATE } from "@/lib/seed";
import { currentMonth } from "@/lib/dates";
import { getPlanDueDay } from "@/lib/household/household";

const STORAGE_KEY = "ledger-v1";

/** The state the app starts with before any data is entered. */
export const INITIAL_STATE: AppState = {
  bills: [],
  income: [],
  snapshots: [],
  plans: [],
  paycheck: [],
  checkLog: [],
  savingsLog: [],
  paycheckViewScope: "monthly",
  paycheckColumns: DEFAULT_PAYCHECK_COLUMNS,
  seenNotificationIds: [],
  checkEditWarningAcked: false,
  goals: [],
  milestones: [],
  checkingBalance: 0,
  checkingBalanceDate: "",
  bankAccounts: [],
};

/**
 * Reads the full app state from localStorage.
 * Returns INITIAL_STATE if nothing is stored or parsing fails.
 * Never throws — storage errors are silently swallowed so the app stays usable.
 */
const DUMMY_RESET_KEY = "ledger-dummy-reset-v1";

export function loadState(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return SEED_STATE; // ← use seed instead of INITIAL_STATE
    const parsed = JSON.parse(raw) as AppState;

    // One-time migration: savings deposits, goals, and bank accounts were dummy
    // demo data — clear them once so the user starts these from scratch. Bills,
    // plans, and income (including military/retirement/SS) are left intact.
    const dummyResetDone = localStorage.getItem(DUMMY_RESET_KEY) === "1";
    if (!dummyResetDone) {
      localStorage.setItem(DUMMY_RESET_KEY, "1");
      return {
        ...loadStateInner(parsed),
        savingsLog: [],
        goals: [],
        bankAccounts: [],
      };
    }
    return loadStateInner(parsed);
  } catch {
    return SEED_STATE;
  }
}

function loadStateInner(parsed: AppState): AppState {
  // Migration: stamp bills missing month field
  // Migration: guard against keys missing from older persisted state shapes
  return {
      ...parsed,
      bills: (parsed.bills ?? []).map((b) =>
        b.month ? b : { ...b, month: currentMonth() },
      ),
      // If stored check log has fewer than 12 entries, merge seed entries (deduped by weekOf)
      checkLog: (() => {
        const stored = parsed.checkLog ?? [];
        if (stored.length >= 12) return stored;
        const byWeek = new Map(stored.map((e) => [e.weekOf, e]));
        SEED_STATE.checkLog.forEach((e) => {
          if (!byWeek.has(e.weekOf)) byWeek.set(e.weekOf, e);
        });
        return [...byWeek.values()];
      })(),
      // Migration: stamp id + date on old SavingsEntry records (weekOf-only shape)
      savingsLog: (parsed.savingsLog ?? []).map((e) =>
        e.id
          ? e
          : { ...e, id: `${e.weekOf ?? "unknown"}-${e.amount}`, date: e.weekOf ?? "" },
      ),
      // If stored state has no snapshots, backfill from seed so the Snapshots tab is testable
      snapshots: (parsed.snapshots ?? []).length > 0 ? parsed.snapshots : SEED_STATE.snapshots,
      // If stored state has no plans, backfill from seed
      plans:
        (parsed.plans ?? []).length > 0
          ? parsed.plans!.map((plan) =>
              typeof plan.dueDay === "number"
                ? plan
                : { ...plan, dueDay: getPlanDueDay(plan) },
            )
          : SEED_STATE.plans,
      // Stamp missing extra field on older paycheck weeks
      paycheck: (parsed.paycheck ?? []).map((w) =>
        w.extra ? w : { ...w, extra: {} },
      ),
      income: parsed.income ?? [],
      // Fall back to defaults if columns not yet persisted (first time after upgrade)
      paycheckColumns: parsed.paycheckColumns ?? DEFAULT_PAYCHECK_COLUMNS,
      seenNotificationIds: parsed.seenNotificationIds ?? [],
      checkEditWarningAcked: parsed.checkEditWarningAcked ?? false,
      goals: parsed.goals ?? [],
      milestones: parsed.milestones ?? [],
      checkingBalance: parsed.checkingBalance ?? 0,
      checkingBalanceDate: parsed.checkingBalanceDate ?? "",
      bankAccounts: parsed.bankAccounts ?? [],
  };
}

/**
 * Writes the full app state to localStorage.
 * Called on every state mutation — no debounce needed at this data volume.
 * Fails silently if quota is exceeded; state still lives in memory for the session.
 */
export function saveState(state: AppState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Quota exceeded — acceptable for MVP
  }
}

/** Clears all app data from localStorage. Used for testing and future reset functionality. */
export function clearState(): void {
  localStorage.removeItem(STORAGE_KEY);
}
