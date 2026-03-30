import type { AppState } from "@/types";
import { SEED_STATE } from "./seed";
import { currentMonth } from "./dates";

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
};

/**
 * Reads the full app state from localStorage.
 * Returns INITIAL_STATE if nothing is stored or parsing fails.
 * Never throws — storage errors are silently swallowed so the app stays usable.
 */
export function loadState(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return SEED_STATE; // ← use seed instead of INITIAL_STATE
    const parsed = JSON.parse(raw) as AppState;
    // Migration: stamp bills missing month field
    return {
      ...parsed,
      bills: parsed.bills.map((b) =>
        b.month ? b : { ...b, month: currentMonth() },
      ),
    };
  } catch {
    return SEED_STATE;
  }
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
