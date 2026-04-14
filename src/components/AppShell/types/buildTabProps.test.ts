import {
  buildAccountsTabProps,
  buildAffirmTabProps,
  buildPaycheckTabProps,
  buildSavingsTabProps,
} from "@/components/AppShell/types/buildTabProps";
import { DEFAULT_PAYCHECK_COLUMNS } from "@/lib/paycheck";
import type {
  AppState,
  Bill,
  InstallmentPlan,
  KiasCheckEntry,
  MonthlyIncome,
  MonthSnapshot,
  PaycheckColumn,
  PaycheckWeek,
  SavingsEntry,
} from "@/types";

// Re-export AppState shape so the test doesn't need to import from internal paths
type MinimalState = {
  checkingBalance: number;
  checkingBalanceDate: string;
  bills: Bill[];
  income: MonthlyIncome[];
  savingsLog: SavingsEntry[];
  checkLog: KiasCheckEntry[];
  paycheck: PaycheckWeek[];
  plans: InstallmentPlan[];
  paycheckViewScope: "monthly";
  paycheckColumns: PaycheckColumn[];
  snapshots: MonthSnapshot[];
  seenNotificationIds: string[];
  checkEditWarningAcked: boolean;
  goals: never[];
  bankAccounts: never[];
};

// ─── Minimal state & actions ──────────────────────────────────────────────────

const emptyState: MinimalState = {
  checkingBalance: 0,
  checkingBalanceDate: "",
  bills: [],
  income: [],
  savingsLog: [],
  checkLog: [],
  paycheck: [],
  plans: [],
  paycheckViewScope: "monthly",
  paycheckColumns: DEFAULT_PAYCHECK_COLUMNS,
  snapshots: [],
  seenNotificationIds: [],
  checkEditWarningAcked: false,
  goals: [],
  bankAccounts: [],
};

const noop = jest.fn();

const actions = {
  setCheckingBalance: noop,
  addBill: noop, updateBill: noop, deleteBill: noop, toggleBillPaid: noop,
  upsertIncome: noop, addSnapshot: noop, rolloverBills: noop,
  addPlan: noop, deletePlan: noop,
  upsertPaycheckWeek: noop, addCheckEntry: noop, updateCheckEntry: noop,
  deleteCheckEntry: noop, ackCheckEditWarning: noop,
  setPaycheckViewScope: noop, addSavingsEntry: noop, updateSavingsEntry: noop,
  deleteSavingsEntry: noop, renamePaycheckColumn: noop, addPaycheckColumn: noop,
  hidePaycheckColumn: noop, restorePaycheckColumn: noop, markNotificationsSeen: noop,
  addGoal: noop, deleteGoal: noop,
  addBankAccount: noop, updateBankAccount: noop, deleteBankAccount: noop,
};

const deps = {
  state: emptyState as unknown as AppState,
  actions,
  viewMonth: "2026-04",
  onViewMonthChange: noop,
};

// ─── buildAccountsTabProps ────────────────────────────────────────────────────

describe("buildAccountsTabProps", () => {
  it("passes bills from state", () => {
    const props = buildAccountsTabProps(deps);
    expect(props.bills).toBe(emptyState.bills);
  });

  it("passes viewMonth", () => {
    const props = buildAccountsTabProps(deps);
    expect(props.viewMonth).toBe("2026-04");
  });

  it("passes onViewMonthChange", () => {
    const props = buildAccountsTabProps(deps);
    expect(props.onViewMonthChange).toBe(noop);
  });

  it("wires onAdd to actions.addBill", () => {
    const props = buildAccountsTabProps(deps);
    expect(props.onAdd).toBe(actions.addBill);
  });

  it("wires onDelete to actions.deleteBill", () => {
    const props = buildAccountsTabProps(deps);
    expect(props.onDelete).toBe(actions.deleteBill);
  });

  it("wires onRollover to actions.rolloverBills", () => {
    const props = buildAccountsTabProps(deps);
    expect(props.onRollover).toBe(actions.rolloverBills);
  });
});

// ─── buildAffirmTabProps ──────────────────────────────────────────────────────

describe("buildAffirmTabProps", () => {
  it("passes plans from state", () => {
    const props = buildAffirmTabProps(deps);
    expect(props.plans).toBe(emptyState.plans);
  });

  it("wires onAdd to actions.addPlan", () => {
    const props = buildAffirmTabProps(deps);
    expect(props.onAdd).toBe(actions.addPlan);
  });

  it("wires onDelete to actions.deletePlan", () => {
    const props = buildAffirmTabProps(deps);
    expect(props.onDelete).toBe(actions.deletePlan);
  });
});

// ─── buildPaycheckTabProps ────────────────────────────────────────────────────

describe("buildPaycheckTabProps", () => {
  it("passes paycheck from state", () => {
    const props = buildPaycheckTabProps(deps);
    expect(props.paycheck).toBe(emptyState.paycheck);
  });

  it("falls back to DEFAULT_PAYCHECK_COLUMNS when paycheckColumns is undefined", () => {
    const stateWithNoCols = { ...emptyState, paycheckColumns: undefined as unknown as PaycheckColumn[] };
    const props = buildPaycheckTabProps({ ...deps, state: stateWithNoCols as unknown as AppState });
    expect(props.columns).toBe(DEFAULT_PAYCHECK_COLUMNS);
  });

  it("passes onGoToAffirm callback", () => {
    const goToAffirm = jest.fn();
    const props = buildPaycheckTabProps(deps, goToAffirm);
    expect(props.onGoToAffirm).toBe(goToAffirm);
  });

  it("passes onGoToSavings callback", () => {
    const goToSavings = jest.fn();
    const props = buildPaycheckTabProps(deps, undefined, goToSavings);
    expect(props.onGoToSavings).toBe(goToSavings);
  });

  it("passes checkEditWarningAcked from state", () => {
    const props = buildPaycheckTabProps(deps);
    expect(props.checkEditWarningAcked).toBe(false);
  });
});

// ─── buildSavingsTabProps ─────────────────────────────────────────────────────

describe("buildSavingsTabProps", () => {
  it("passes savingsLog from state", () => {
    const props = buildSavingsTabProps(deps);
    expect(props.savingsLog).toBe(emptyState.savingsLog);
  });

  it("wires onAddSavings to actions.addSavingsEntry", () => {
    const props = buildSavingsTabProps(deps);
    expect(props.onAddSavings).toBe(actions.addSavingsEntry);
  });

  it("passes onGoToPaycheck callback", () => {
    const goToPaycheck = jest.fn();
    const props = buildSavingsTabProps(deps, goToPaycheck);
    expect(props.onGoToPaycheck).toBe(goToPaycheck);
  });

  it("passes goals from state", () => {
    const props = buildSavingsTabProps(deps);
    expect(props.goals).toEqual([]);
  });

  it("wires onAddGoal to actions.addGoal", () => {
    const props = buildSavingsTabProps(deps);
    expect(props.onAddGoal).toBe(actions.addGoal);
  });

  it("wires onDeleteGoal to actions.deleteGoal", () => {
    const props = buildSavingsTabProps(deps);
    expect(props.onDeleteGoal).toBe(actions.deleteGoal);
  });
});
