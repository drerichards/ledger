import type {
  Bill,
  InstallmentPlan,
  KiasCheckEntry,
  MonthlyIncome,
  MonthSnapshot,
  PaycheckColumn,
  PaycheckViewScope,
  PaycheckWeek,
  SavingsEntry,
} from "@/types";
import { DEFAULT_PAYCHECK_COLUMNS } from "@/lib/paycheck";

type AppActions = {
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
  deleteCheckEntry: (weekOf: string) => void;
  setPaycheckViewScope: (scope: PaycheckViewScope) => void;
  addSavingsEntry: (entry: SavingsEntry) => void;
  renamePaycheckColumn: (key: string, label: string) => void;
  addPaycheckColumn: (label: string) => void;
  deletePaycheckColumn: (key: string) => void;
  markNotificationsSeen: (ids: string[]) => void;
};

type AppState = {
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
};

type TabPropsDeps = {
  state: AppState;
  actions: AppActions;
  viewMonth: string;
  onViewMonthChange: (month: string) => void;
};

export const buildBillChartProps = ({
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

export const buildPaycheckTabProps = ({ state, actions }: TabPropsDeps) => ({
  paycheck: state.paycheck,
  checkLog: state.checkLog,
  savingsLog: state.savingsLog,
  plans: state.plans,
  columns: state.paycheckColumns ?? DEFAULT_PAYCHECK_COLUMNS,
  viewScope: state.paycheckViewScope,
  onUpsertWeek: actions.upsertPaycheckWeek,
  onAddCheckEntry: actions.addCheckEntry,
  onDeleteCheckEntry: actions.deleteCheckEntry,
  onSetViewScope: actions.setPaycheckViewScope,
  onRenameColumn: actions.renamePaycheckColumn,
  onAddColumn: actions.addPaycheckColumn,
  onDeleteColumn: actions.deletePaycheckColumn,
});

export const buildSavingsTabProps = ({ state, actions }: TabPropsDeps) => ({
  plans: state.plans,
  checking: state.checkLog,
  savingsLog: state.savingsLog,
  checkLog: state.checkLog,
  paycheck: state.paycheck,
  onAddCheckEntry: actions.addCheckEntry,
  onDeleteCheckEntry: actions.deleteCheckEntry,
  onAddSavings: actions.addSavingsEntry,
});
