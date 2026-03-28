"use client";

import { useCallback, useEffect, useReducer } from "react";
import type {
  AppState,
  Bill,
  InstallmentPlan,
  KiasCheckEntry,
  MonthlyIncome,
  MonthSnapshot,
  PaycheckViewScope,
  PaycheckWeek,
  SavingsEntry,
} from "@/types";
import { INITIAL_STATE, loadState, saveState } from "@/lib/storage";
import { today } from "@/lib/dates";
import { generateId } from "@/lib/id";

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
  | { type: "ADD_SAVINGS_ENTRY"; payload: SavingsEntry }
  | { type: "UPSERT_INCOME"; payload: MonthlyIncome }
  | { type: "UPSERT_PAYCHECK_WEEK"; payload: PaycheckWeek }
  | { type: "SET_PAYCHECK_VIEW_SCOPE"; payload: PaycheckViewScope }
  | { type: "ADD_SNAPSHOT"; payload: MonthSnapshot }
  | { type: "ROLLOVER_BILLS"; payload: { fromMonth: string; toMonth: string } };

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
          // Silently log the old amount before applying the update
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

    case "ADD_CHECK_ENTRY":
      return { ...state, checkLog: [...state.checkLog, action.payload] };

    case "ADD_SAVINGS_ENTRY":
      return { ...state, savingsLog: [...state.savingsLog, action.payload] };

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
      // Replace if one already exists for this month, append if not
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
      // Check if toMonth already has bills — don't double-copy
      const alreadyExists = state.bills.some((b) => b.month === toMonth);
      if (alreadyExists) return state;

      const recurringBills = state.bills
        .filter((b) => b.month === fromMonth && b.entry === "recurring")
        .map((b) => ({
          ...b,
          id: generateId(),
          month: toMonth,
          paid: false,       // reset paid status for new month
          amountHistory: [], // fresh history for new month
        }));

      return { ...state, bills: [...state.bills, ...recurringBills] };
    }

    default:
      return state;
  }
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * Central state manager for the entire app.
 * Hydrates from localStorage on mount. Persists on every change.
 * Exposes named action functions — no raw dispatch outside this hook.
 */
export function useAppState() {
  const [state, dispatch] = useReducer(reducer, INITIAL_STATE);

  useEffect(() => {
    dispatch({ type: "HYDRATE", payload: loadState() });
  }, []);

  useEffect(() => {
    saveState(state);
  }, [state]);

  const addBill = useCallback(
    (bill: Bill) => dispatch({ type: "ADD_BILL", payload: bill }),
    [],
  );

  const updateBill = useCallback(
    (bill: Bill) => dispatch({ type: "UPDATE_BILL", payload: bill }),
    [],
  );

  const deleteBill = useCallback(
    (id: string) => dispatch({ type: "DELETE_BILL", payload: { id } }),
    [],
  );

  const toggleBillPaid = useCallback(
    (id: string) => dispatch({ type: "TOGGLE_BILL_PAID", payload: { id } }),
    [],
  );

  const addPlan = useCallback(
    (plan: InstallmentPlan) => dispatch({ type: "ADD_PLAN", payload: plan }),
    [],
  );

  const deletePlan = useCallback(
    (id: string) => dispatch({ type: "DELETE_PLAN", payload: { id } }),
    [],
  );

  const addCheckEntry = useCallback(
    (entry: KiasCheckEntry) =>
      dispatch({ type: "ADD_CHECK_ENTRY", payload: entry }),
    [],
  );

  const addSavingsEntry = useCallback(
    (entry: SavingsEntry) =>
      dispatch({ type: "ADD_SAVINGS_ENTRY", payload: entry }),
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

  return {
    state,
    addBill,
    updateBill,
    deleteBill,
    toggleBillPaid,
    addPlan,
    deletePlan,
    addCheckEntry,
    addSavingsEntry,
    upsertIncome,
    upsertPaycheckWeek,
    setPaycheckViewScope,
    addSnapshot,
    rolloverBills,
  };
}
