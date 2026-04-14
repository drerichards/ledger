import type {
  BankAccount,
  Bill,
  InstallmentPlan,
  KiasCheckEntry,
  MonthlyIncome,
  MonthSnapshot,
  PaycheckColumn,
  PaycheckViewScope,
  PaycheckWeek,
  SavingsEntry,
  SavingsGoal,
} from "@/types";

import { DEFAULT_PAYCHECK_COLUMNS } from "@/lib/paycheck";

type AppActions = {
  setCheckingBalance: (balance: number, date: string) => void;
  addBill: (bill: Bill) => void;
  updateBill: (bill: Bill) => void;
  deleteBill: (id: string) => void;
  toggleBillPaid: (id: string) => void;
  upsertIncome: (income: MonthlyIncome) => void;
  addSnapshot: (snap: MonthSnapshot) => void;
  rolloverBills: (fromMonth: string, toMonth: string) => void;
  addPlan: (plan: InstallmentPlan) => void;
  deletePlan: (id: string) => void;
  upsertPaycheckWeek: (week: PaycheckWeek) => void;
  addCheckEntry: (entry: KiasCheckEntry) => void;
  updateCheckEntry: (entry: KiasCheckEntry) => void;
  deleteCheckEntry: (weekOf: string) => void;
  ackCheckEditWarning: () => void;
  setPaycheckViewScope: (scope: PaycheckViewScope) => void;
  addSavingsEntry: (entry: SavingsEntry) => void;
  updateSavingsEntry: (entry: SavingsEntry) => void;
  deleteSavingsEntry: (id: string) => void;
  renamePaycheckColumn: (key: string, label: string) => void;
  addPaycheckColumn: (label: string) => void;
  hidePaycheckColumn: (key: string) => void;
  restorePaycheckColumn: (key: string) => void;
  markNotificationsSeen: (ids: string[]) => void;
  addGoal: (goal: SavingsGoal) => void;
  deleteGoal: (id: string) => void;
  addBankAccount: (account: BankAccount) => void;
  updateBankAccount: (account: BankAccount) => void;
  deleteBankAccount: (id: string) => void;
};

type AppState = {
  checkingBalance: number;
  checkingBalanceDate: string;
  bankAccounts: BankAccount[];
  bills: Bill[];
  income: MonthlyIncome[];
  savingsLog: SavingsEntry[];
  checkLog: KiasCheckEntry[];
  paycheck: PaycheckWeek[];
  plans: InstallmentPlan[];
  paycheckViewScope: PaycheckViewScope;
  paycheckColumns: PaycheckColumn[];
  snapshots: MonthSnapshot[];
  seenNotificationIds: string[];
  checkEditWarningAcked: boolean;
  goals: SavingsGoal[];
};

type TabPropsDeps = {
  state: AppState;
  actions: AppActions;
  viewMonth: string;
  onViewMonthChange: (month: string) => void;
};

export const buildAccountsTabProps = ({
  state,
  actions,
  viewMonth,
  onViewMonthChange,
}: TabPropsDeps) => ({
  bills: state.bills,
  income: state.income,
  savingsLog: state.savingsLog,
  checkLog: state.checkLog,
  paycheck: state.paycheck,
  viewMonth,
  onViewMonthChange,
  onAdd: actions.addBill,
  onUpdate: actions.updateBill,
  onDelete: actions.deleteBill,
  onTogglePaid: actions.toggleBillPaid,
  onUpdateIncome: actions.upsertIncome,
  onSaveSnapshot: actions.addSnapshot,
  onRollover: actions.rolloverBills,
});

export const buildAffirmTabProps = ({ state, actions }: TabPropsDeps) => ({
  plans: state.plans,
  onAdd: actions.addPlan,
  onDelete: actions.deletePlan,
});

export const buildPaycheckTabProps = (
  { state, actions }: TabPropsDeps,
  onGoToAffirm?: () => void,
  onGoToSavings?: () => void
) => ({
  paycheck: state.paycheck,
  checkLog: state.checkLog,
  savingsLog: state.savingsLog,
  plans: state.plans,
  columns: state.paycheckColumns ?? DEFAULT_PAYCHECK_COLUMNS,
  viewScope: state.paycheckViewScope,
  checkEditWarningAcked: state.checkEditWarningAcked,
  onUpsertWeek: actions.upsertPaycheckWeek,
  onAddCheckEntry: actions.addCheckEntry,
  onUpdateCheckEntry: actions.updateCheckEntry,
  onDeleteCheckEntry: actions.deleteCheckEntry,
  onSetViewScope: actions.setPaycheckViewScope,
  onRenameColumn: actions.renamePaycheckColumn,
  onAddColumn: actions.addPaycheckColumn,
  onHideColumn: actions.hidePaycheckColumn,
  onRestoreColumn: actions.restorePaycheckColumn,
  onAckCheckEditWarning: actions.ackCheckEditWarning,
  onGoToAffirm,
  onGoToSavings,
});

export const buildSavingsTabProps = (
  { state, actions }: TabPropsDeps,
  onGoToPaycheck?: () => void
) => ({
  plans: state.plans,
  checking: state.checkLog,
  savingsLog: state.savingsLog,
  paycheck: state.paycheck,
  goals: state.goals ?? [],
  onAddSavings: actions.addSavingsEntry,
  onUpdateSavings: actions.updateSavingsEntry,
  onDeleteSavings: actions.deleteSavingsEntry,
  onAddGoal: actions.addGoal,
  onDeleteGoal: actions.deleteGoal,
  onGoToPaycheck,
});

export const buildHomeTabProps = ({ state, actions }: TabPropsDeps) => ({
  checkingBalance: state.checkingBalance,
  checkingBalanceDate: state.checkingBalanceDate,
  bankAccounts: state.bankAccounts ?? [],
  bills: state.bills,
  plans: state.plans,
  checkLog: state.checkLog,
  savingsLog: state.savingsLog,
  onSetBalance: actions.setCheckingBalance,
  onAddBankAccount: actions.addBankAccount,
  onUpdateBankAccount: actions.updateBankAccount,
  onDeleteBankAccount: actions.deleteBankAccount,
});
