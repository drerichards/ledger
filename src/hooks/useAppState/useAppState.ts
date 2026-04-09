"use client";

import { useCallback, useEffect, useReducer, useRef } from "react";
import type {
  AppState,
  Bill,
  InstallmentPlan,
  KiasCheckEntry,
  Milestone,
  MonthlyIncome,
  MonthSnapshot,
  PaycheckColumn,
  PaycheckViewScope,
  PaycheckWeek,
  SavingsEntry,
  SavingsGoal,
} from "@/types";
import { newColumnKey } from "@/lib/paycheck";
import { INITIAL_STATE, loadState, saveState } from "@/lib/storage";
import { today, mondayOf } from "@/lib/dates";
import { generateId } from "@/lib/id";
import {
  loadFromSupabase,
  syncStateToSupabase,
  deleteBillRemote,
  deletePlanRemote,
  deleteCheckEntryRemote,
} from "@/lib/supabase/sync";

// ─── Action Types ─────────────────────────────────────────────────────────────

type Action =
  | { type: "HYDRATE"; payload: AppState }
  | { type: "ADD_BILL"; payload: Bill }
  | { type: "UPDATE_BILL"; payload: Bill }
  | { type: "DELETE_BILL"; payload: { id: string } }
  | { type: "TOGGLE_BILL_PAID"; payload: { id: string } }
  | { type: "ADD_PLAN"; payload: InstallmentPlan }
  | { type: "DELETE_PLAN"; payload: { id: string } }
  | { type: "ADD_CHECK_ENTRY"; payload: KiasCheckEntry }
  | { type: "UPDATE_CHECK_ENTRY"; payload: KiasCheckEntry }
  | { type: "DELETE_CHECK_ENTRY"; payload: { weekOf: string } }
  | { type: "ADD_SAVINGS_ENTRY"; payload: SavingsEntry }
  | { type: "UPDATE_SAVINGS_ENTRY"; payload: SavingsEntry }
  | { type: "DELETE_SAVINGS_ENTRY"; payload: { id: string } }
  | { type: "UPSERT_INCOME"; payload: MonthlyIncome }
  | { type: "UPSERT_PAYCHECK_WEEK"; payload: PaycheckWeek }
  | { type: "SET_PAYCHECK_VIEW_SCOPE"; payload: PaycheckViewScope }
  | { type: "ADD_SNAPSHOT"; payload: MonthSnapshot }
  | { type: "ROLLOVER_BILLS"; payload: { fromMonth: string; toMonth: string } }
  | { type: "RENAME_PAYCHECK_COLUMN"; payload: { key: string; label: string } }
  | { type: "ADD_PAYCHECK_COLUMN"; payload: { label: string } }
  | { type: "HIDE_PAYCHECK_COLUMN"; payload: { key: string } }
  | { type: "RESTORE_PAYCHECK_COLUMN"; payload: { key: string } }
  | { type: "MARK_NOTIFICATIONS_SEEN"; payload: { ids: string[] } }
  | { type: "ACK_CHECK_EDIT_WARNING" }
  | { type: "ADD_GOAL"; payload: SavingsGoal }
  | { type: "UPDATE_GOAL"; payload: SavingsGoal }
  | { type: "DELETE_GOAL"; payload: { id: string } }
  | { type: "MARK_MILESTONE_SEEN"; payload: { id: string } }
  | { type: "ADD_MILESTONE"; payload: Milestone };

// ─── Reducer ──────────────────────────────────────────────────────────────────

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case "HYDRATE":
      return action.payload;

    case "ADD_BILL":
      return { ...state, bills: [...state.bills, action.payload] };

    case "UPDATE_BILL": {
      const updated = action.payload;
      return {
        ...state,
        bills: state.bills.map((bill) => {
          if (bill.id !== updated.id) return bill;
          const amountChanged = bill.cents !== updated.cents;
          return {
            ...updated,
            amountHistory: amountChanged
              ? [...bill.amountHistory, { date: today(), cents: bill.cents }]
              : bill.amountHistory,
          };
        }),
      };
    }

    case "DELETE_BILL":
      return {
        ...state,
        bills: state.bills.filter((b) => b.id !== action.payload.id),
      };

    case "TOGGLE_BILL_PAID":
      return {
        ...state,
        bills: state.bills.map((b) =>
          b.id === action.payload.id ? { ...b, paid: !b.paid } : b,
        ),
      };

    case "ADD_PLAN":
      return { ...state, plans: [...state.plans, action.payload] };

    case "DELETE_PLAN":
      return {
        ...state,
        plans: state.plans.filter((p) => p.id !== action.payload.id),
      };

    case "ADD_CHECK_ENTRY": {
      // Upsert: if an entry with the same weekOf already exists, replace it.
      const entry = action.payload;
      const exists = state.checkLog.some((e) => e.weekOf === entry.weekOf);
      return {
        ...state,
        checkLog: exists
          ? state.checkLog.map((e) => (e.weekOf === entry.weekOf ? entry : e))
          : [...state.checkLog, entry],
      };
    }

    case "UPDATE_CHECK_ENTRY": {
      const updated = action.payload;
      return {
        ...state,
        checkLog: state.checkLog.map((e) =>
          e.weekOf === updated.weekOf ? updated : e
        ),
      };
    }

    case "DELETE_CHECK_ENTRY": {
      const monday = mondayOf(action.payload.weekOf);
      return {
        ...state,
        checkLog: state.checkLog.filter((e) => mondayOf(e.weekOf) !== monday),
        savingsLog: state.savingsLog.filter(
          // istanbul ignore next — entries always have `date` post-migration; `?? ""` is unreachable
          (e) => mondayOf(e.date ?? e.weekOf ?? "") !== monday,
        ),
      };
    }

    case "ADD_SAVINGS_ENTRY":
      return { ...state, savingsLog: [...state.savingsLog, action.payload] };

    case "UPDATE_SAVINGS_ENTRY":
      return {
        ...state,
        savingsLog: state.savingsLog.map((e) =>
          e.id === action.payload.id ? action.payload : e
        ),
      };

    case "DELETE_SAVINGS_ENTRY":
      return {
        ...state,
        savingsLog: state.savingsLog.filter((e) => e.id !== action.payload.id),
      };

    case "UPSERT_INCOME": {
      const inc = action.payload;
      const exists = state.income.some((i) => i.month === inc.month);
      return {
        ...state,
        income: exists
          ? state.income.map((i) => (i.month === inc.month ? inc : i))
          : [...state.income, inc],
      };
    }

    case "UPSERT_PAYCHECK_WEEK": {
      const week = action.payload;
      const exists = state.paycheck.some((w) => w.weekOf === week.weekOf);
      return {
        ...state,
        paycheck: exists
          ? state.paycheck.map((w) => (w.weekOf === week.weekOf ? week : w))
          : [...state.paycheck, week],
      };
    }

    case "SET_PAYCHECK_VIEW_SCOPE":
      return { ...state, paycheckViewScope: action.payload };

    case "ADD_SNAPSHOT": {
      const snap = action.payload;
      const exists = state.snapshots.some((s) => s.month === snap.month);
      return {
        ...state,
        snapshots: exists
          ? state.snapshots.map((s) => (s.month === snap.month ? snap : s))
          : [...state.snapshots, snap],
      };
    }

    case "ROLLOVER_BILLS": {
      const { fromMonth, toMonth } = action.payload;
      const alreadyExists = state.bills.some((b) => b.month === toMonth);
      if (alreadyExists) return state;

      const recurringBills = state.bills
        .filter((b) => b.month === fromMonth && b.entry === "recurring")
        .map((b) => ({
          ...b,
          id: generateId(),
          month: toMonth,
          paid: false,
          amountHistory: [],
        }));

      return { ...state, bills: [...state.bills, ...recurringBills] };
    }

    case "RENAME_PAYCHECK_COLUMN": {
      const { key, label } = action.payload;
      return {
        ...state,
        paycheckColumns: state.paycheckColumns!.map(
          (c) => (c.key === key ? { ...c, label } : c),
        ),
      };
    }

    case "ADD_PAYCHECK_COLUMN": {
      const newCol: PaycheckColumn = {
        key: newColumnKey(),
        label: action.payload.label,
        fixed: false,
      };
      return {
        ...state,
        paycheckColumns: [...state.paycheckColumns!, newCol],
      };
    }

    case "HIDE_PAYCHECK_COLUMN": {
      const { key } = action.payload;
      const cols = state.paycheckColumns!;
      return {
        ...state,
        paycheckColumns: cols.map((c) =>
          c.key === key ? { ...c, hidden: true } : c,
        ),
        // Data is preserved — column just won't render
      };
    }

    case "RESTORE_PAYCHECK_COLUMN": {
      const { key } = action.payload;
      const cols = state.paycheckColumns!;
      return {
        ...state,
        paycheckColumns: cols.map((c) =>
          c.key === key ? { ...c, hidden: false } : c,
        ),
      };
    }

    case "MARK_NOTIFICATIONS_SEEN": {
      // istanbul ignore next — seenNotificationIds always initialised; fallback unreachable post-hydration
      const existing = new Set(state.seenNotificationIds ?? []);
      action.payload.ids.forEach((id) => existing.add(id));
      return { ...state, seenNotificationIds: Array.from(existing) };
    }

    case "ACK_CHECK_EDIT_WARNING":
      return { ...state, checkEditWarningAcked: true };

    case "ADD_GOAL":
      return { ...state, goals: [...state.goals, action.payload] };

    case "UPDATE_GOAL":
      return {
        ...state,
        goals: state.goals.map((g) =>
          g.id === action.payload.id ? action.payload : g,
        ),
      };

    case "DELETE_GOAL":
      return {
        ...state,
        goals: state.goals.filter((g) => g.id !== action.payload.id),
      };

    case "MARK_MILESTONE_SEEN":
      return {
        ...state,
        milestones: state.milestones.map((m) =>
          m.id === action.payload.id ? { ...m, seen: true } : m,
        ),
      };

    case "ADD_MILESTONE": {
      const existing = state.milestones.some(
        (m) => m.id === action.payload.id,
      );
      if (existing) return state;
      return { ...state, milestones: [...state.milestones, action.payload] };
    }

    // istanbul ignore next — typed switch is exhaustive; no unknown action can reach this
    default:
      return state;
  }
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * Central state manager for the entire app.
 *
 * Hydration order:
 *   1. localStorage loads synchronously (fast — avoids flash of empty state)
 *   2. Supabase loads asynchronously — if remote data exists, HYDRATE replaces state
 *   3. If no remote data (first login), seed/localStorage state is synced up to Supabase
 *
 * Persistence:
 *   - Every state change writes to localStorage (synchronous, instant)
 *   - Every state change also syncs to Supabase (debounced 1.5s, async, silent-fail)
 *   - Deletes are targeted (immediate remote delete, no wait for debounce)
 */
export function useAppState() {
  const [state, dispatch] = useReducer(reducer, INITIAL_STATE);

  // Debounce timer ref — prevents hammering Supabase on rapid state changes
  const syncTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Track whether the initial remote hydration has been attempted
  const remoteHydrated = useRef(false);

  // ── Step 1: localStorage hydrate (synchronous, runs once on mount) ──────────
  useEffect(() => {
    dispatch({ type: "HYDRATE", payload: loadState() });
  }, []);

  // ── Step 2: Supabase hydrate (async, runs once after mount) ─────────────────
  useEffect(() => {
    // istanbul ignore next — guard against React StrictMode double-invocation; not testable in JSDOM
    if (remoteHydrated.current) return;
    remoteHydrated.current = true;

    loadFromSupabase().then((remoteState) => {
      if (remoteState) {
        // Remote data exists — replace state with authoritative server data
        dispatch({ type: "HYDRATE", payload: remoteState });
      } else {
        // First login or no remote data — push local/seed state up to Supabase
        syncStateToSupabase(state);
      }
    });
    // state intentionally excluded from deps — we want the snapshot at mount time
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Step 3: Persist on every state change ───────────────────────────────────
  useEffect(() => {
    // localStorage: synchronous, always
    saveState(state);

    // Supabase: debounced 1.5s — batches rapid consecutive changes into one write
    if (syncTimer.current) clearTimeout(syncTimer.current);
    syncTimer.current = setTimeout(() => {
      syncStateToSupabase(state);
    }, 1500);

    return () => {
      if (syncTimer.current) clearTimeout(syncTimer.current);
    };
  }, [state]);

  // ─── Action creators ─────────────────────────────────────────────────────────

  const addBill = useCallback(
    (bill: Bill) => dispatch({ type: "ADD_BILL", payload: bill }),
    [],
  );

  const updateBill = useCallback(
    (bill: Bill) => dispatch({ type: "UPDATE_BILL", payload: bill }),
    [],
  );

  const deleteBill = useCallback((id: string) => {
    dispatch({ type: "DELETE_BILL", payload: { id } });
    deleteBillRemote(id); // targeted immediate delete — don't wait for debounce
  }, []);

  const toggleBillPaid = useCallback(
    (id: string) => dispatch({ type: "TOGGLE_BILL_PAID", payload: { id } }),
    [],
  );

  const addPlan = useCallback(
    (plan: InstallmentPlan) => dispatch({ type: "ADD_PLAN", payload: plan }),
    [],
  );

  const deletePlan = useCallback((id: string) => {
    dispatch({ type: "DELETE_PLAN", payload: { id } });
    deletePlanRemote(id);
  }, []);

  const addCheckEntry = useCallback(
    (entry: KiasCheckEntry) =>
      dispatch({ type: "ADD_CHECK_ENTRY", payload: entry }),
    [],
  );

  const updateCheckEntry = useCallback(
    (entry: KiasCheckEntry) =>
      dispatch({ type: "UPDATE_CHECK_ENTRY", payload: entry }),
    [],
  );

  const deleteCheckEntry = useCallback((weekOf: string) => {
    dispatch({ type: "DELETE_CHECK_ENTRY", payload: { weekOf } });
    deleteCheckEntryRemote(weekOf);
  }, []);

  const addSavingsEntry = useCallback(
    (entry: SavingsEntry) =>
      dispatch({ type: "ADD_SAVINGS_ENTRY", payload: entry }),
    [],
  );

  const updateSavingsEntry = useCallback(
    (entry: SavingsEntry) =>
      dispatch({ type: "UPDATE_SAVINGS_ENTRY", payload: entry }),
    [],
  );

  const deleteSavingsEntry = useCallback(
    (id: string) =>
      dispatch({ type: "DELETE_SAVINGS_ENTRY", payload: { id } }),
    [],
  );

  const upsertIncome = useCallback(
    (income: MonthlyIncome) =>
      dispatch({ type: "UPSERT_INCOME", payload: income }),
    [],
  );

  const upsertPaycheckWeek = useCallback(
    (week: PaycheckWeek) =>
      dispatch({ type: "UPSERT_PAYCHECK_WEEK", payload: week }),
    [],
  );

  const setPaycheckViewScope = useCallback(
    (scope: PaycheckViewScope) =>
      dispatch({ type: "SET_PAYCHECK_VIEW_SCOPE", payload: scope }),
    [],
  );

  const addSnapshot = useCallback(
    (snap: MonthSnapshot) => dispatch({ type: "ADD_SNAPSHOT", payload: snap }),
    [],
  );

  const rolloverBills = useCallback(
    (fromMonth: string, toMonth: string) =>
      dispatch({ type: "ROLLOVER_BILLS", payload: { fromMonth, toMonth } }),
    [],
  );

  const renamePaycheckColumn = useCallback(
    (key: string, label: string) =>
      dispatch({ type: "RENAME_PAYCHECK_COLUMN", payload: { key, label } }),
    [],
  );

  const addPaycheckColumn = useCallback(
    (label: string) =>
      dispatch({ type: "ADD_PAYCHECK_COLUMN", payload: { label } }),
    [],
  );

  const hidePaycheckColumn = useCallback(
    (key: string) =>
      dispatch({ type: "HIDE_PAYCHECK_COLUMN", payload: { key } }),
    [],
  );

  const restorePaycheckColumn = useCallback(
    (key: string) =>
      dispatch({ type: "RESTORE_PAYCHECK_COLUMN", payload: { key } }),
    [],
  );

  const markNotificationsSeen = useCallback(
    (ids: string[]) =>
      dispatch({ type: "MARK_NOTIFICATIONS_SEEN", payload: { ids } }),
    [],
  );

  const ackCheckEditWarning = useCallback(
    () => dispatch({ type: "ACK_CHECK_EDIT_WARNING" }),
    [],
  );

  const addGoal = useCallback(
    (goal: SavingsGoal) => dispatch({ type: "ADD_GOAL", payload: goal }),
    [],
  );

  const updateGoal = useCallback(
    (goal: SavingsGoal) => dispatch({ type: "UPDATE_GOAL", payload: goal }),
    [],
  );

  const deleteGoal = useCallback(
    (id: string) => dispatch({ type: "DELETE_GOAL", payload: { id } }),
    [],
  );

  const markMilestoneSeen = useCallback(
    (id: string) => dispatch({ type: "MARK_MILESTONE_SEEN", payload: { id } }),
    [],
  );

  const addMilestone = useCallback(
    (milestone: Milestone) => dispatch({ type: "ADD_MILESTONE", payload: milestone }),
    [],
  );

  return {
    state,
    addBill,
    updateBill,
    deleteBill,
    toggleBillPaid,
    addPlan,
    deletePlan,
    addCheckEntry,
    deleteCheckEntry,
    addSavingsEntry,
    updateSavingsEntry,
    deleteSavingsEntry,
    upsertIncome,
    upsertPaycheckWeek,
    setPaycheckViewScope,
    addSnapshot,
    rolloverBills,
    renamePaycheckColumn,
    addPaycheckColumn,
    hidePaycheckColumn,
    restorePaycheckColumn,
    markNotificationsSeen,
    updateCheckEntry,
    ackCheckEditWarning,
    addGoal,
    updateGoal,
    deleteGoal,
    markMilestoneSeen,
    addMilestone,
  };
}
