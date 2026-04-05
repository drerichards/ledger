import type {
  AppState,
  Bill,
  BillCategory,
  BillEntry,
  BillGroup,
  InstallmentPlan,
  KiasCheckEntry,
  MonthlyIncome,
  PaycheckWeek,
} from "@/types";
import { generateId } from "@/lib/id";
import { DEFAULT_PAYCHECK_COLUMNS } from "@/lib/paycheck";

const APRIL = "2026-04";

// ─── Bill Factory ─────────────────────────────────────────────────────────────

const bill = (
  name: string,
  dollars: number,
  due: number,
  group: BillGroup,
  method: "autopay" | "transfer",
  category: BillCategory,
  entry: BillEntry = "recurring",
  notes = "",
  flagged = false,
): Bill => ({
  id: generateId(),
  month: APRIL,
  name,
  cents: Math.round(dollars * 100),
  due,
  paid: false,
  method,
  group,
  entry,
  flagged,
  notes,
  category,
  amountHistory: [],
});

// ─── Bills — April 2026 ───────────────────────────────────────────────────────

const BILLS: Bill[] = [
  // ── From Kia's Pay ──────────────────────────────────────────────────────────
  bill("PayPal CC", 150.0, 2, "kias_pay", "transfer", "Credit Cards"),
  bill("Rent", 1084.0, 2, "kias_pay", "transfer", "Housing"),
  bill("Jazmin", 125.0, 2, "kias_pay", "transfer", "Transfers"),
  bill("Dre", 90.0, 2, "kias_pay", "transfer", "Transfers"),
  bill("Affirm", 376.52, 2, "kias_pay", "autopay", "Other"),
  bill(
    "Microsoft Office",
    129.99,
    4,
    "kias_pay",
    "autopay",
    "Subscriptions",
    "recurring",
    "Renews June 9th",
  ),

  // ── From Other Income ────────────────────────────────────────────────────────
  bill("Delta Defense", 73.36, 1, "other_income", "autopay", "Insurance"),
  bill("Storage", 130.67, 1, "other_income", "autopay", "Housing"),
  bill("Storage", 104.93, 1, "other_income", "autopay", "Housing"),
  bill("Capone SM", 50.0, 1, "other_income", "autopay", "Credit Cards"),
  bill("Capone Kia", 84.0, 1, "other_income", "autopay", "Credit Cards"),
  bill(
    "Temp Log Chg",
    32.0,
    1,
    "other_income",
    "transfer",
    "Other",
    "recurring",
    "Keep at 32.00",
  ),
  bill("Capone Kia", 0.99, 3, "other_income", "autopay", "Credit Cards"),
  bill("Overstock", 108.0, 7, "other_income", "autopay", "Loans"),
  bill("Cred One Amex", 51.0, 8, "other_income", "autopay", "Credit Cards"),
  bill(
    "Loan",
    219.04,
    9,
    "other_income",
    "transfer",
    "Loans",
    "recurring",
    "TRSF",
  ),
  bill("Capone Big", 157.0, 9, "other_income", "autopay", "Credit Cards"),
  bill("TJX", 61.0, 9, "other_income", "autopay", "Credit Cards"),
  bill("Microsoft Xbox", 9.99, 9, "other_income", "autopay", "Subscriptions"),
  bill("BOA Old", 50.0, 9, "other_income", "autopay", "Credit Cards"),
  bill(
    "Patreon",
    5.3,
    9,
    "other_income",
    "autopay",
    "Subscriptions",
    "recurring",
    "GOCC",
  ),
  bill("Roku", 5.99, 11, "other_income", "autopay", "Subscriptions"),
  bill(
    "Sams CC 9510",
    76.0,
    11,
    "other_income",
    "autopay",
    "Credit Cards",
    "recurring",
    "Renews 1/20/2027",
    true,
  ),
  bill("PayPal", 30.0, 12, "other_income", "autopay", "Other"),
  bill("T-Mobile", 197.55, 12, "other_income", "autopay", "Utilities"),
  bill("HSBS VC", 12.0, 13, "other_income", "autopay", "Utilities"),
  bill("Chase", 96.0, 14, "other_income", "autopay", "Credit Cards"),
  bill("BOA 5667", 122.0, 14, "other_income", "autopay", "Credit Cards"),
  bill("USAA CC", 166.74, 14, "other_income", "autopay", "Credit Cards"),
  bill("Ink", 34.23, 14, "other_income", "autopay", "Credit Cards"),
  bill("Mut Omaha", 113.96, 15, "other_income", "autopay", "Insurance"),
  bill("Cont Life", 59.58, 15, "other_income", "autopay", "Insurance"),
  bill("Cred One New", 30.0, 16, "other_income", "autopay", "Credit Cards"),
  bill("Primerica", 81.84, 16, "other_income", "autopay", "Insurance"),
  bill("Man Life", 25.5, 16, "other_income", "autopay", "Insurance"),
  bill(
    "BOA LLC",
    102.0,
    17,
    "other_income",
    "transfer",
    "Credit Cards",
    "recurring",
    "Other BOA Acct",
  ),
  bill(
    "PlayStation",
    17.99,
    17,
    "other_income",
    "transfer",
    "Subscriptions",
    "recurring",
    "TRSF",
  ),
  bill("Max TV", 20.99, 17, "other_income", "autopay", "Subscriptions"),
  bill(
    "Life Ins",
    38.24,
    19,
    "other_income",
    "transfer",
    "Insurance",
    "recurring",
    "TRSF",
  ),
  bill(
    "SVCH Sav",
    12.0,
    19,
    "other_income",
    "transfer",
    "Savings",
    "recurring",
    "TRSF",
  ),
  bill(
    "Old Navy",
    30.0,
    20,
    "other_income",
    "autopay",
    "Other",
    "recurring",
    "Jazmin",
  ),
  bill("Google", 1.99, 21, "other_income", "autopay", "Subscriptions"),
  bill("Roku", 9.99, 21, "other_income", "autopay", "Subscriptions"),
  bill("Home Depot", 65.0, 22, "other_income", "autopay", "Housing"),
  bill("Sams Regular", 45.0, 22, "other_income", "autopay", "Other"),
  bill("Google", 0.99, 22, "other_income", "autopay", "Subscriptions"),
  bill(
    "Capone Kia",
    29.99,
    22,
    "other_income",
    "transfer",
    "Credit Cards",
    "recurring",
    "TRSF to Capone (22nd)",
  ),
  bill("USAA LV", 100.0, 23, "other_income", "autopay", "Other"),
  bill("Prime", 15.89, 28, "other_income", "autopay", "Subscriptions"),
  bill("Ink", 8.47, 28, "other_income", "autopay", "Credit Cards"),
  bill("USAA", 53.54, 30, "other_income", "autopay", "Utilities"),
];

// ─── Affirm Plans ─────────────────────────────────────────────────────────────
// Source: Affirm grid printout. Labels use due date since plan names not on printout.
// Monthly amounts are from the April column. End dates from last populated column.

const plan = (
  label: string,
  dollars: number,
  start: string,
  end: string,
): InstallmentPlan => ({
  id: generateId(),
  label,
  mc: Math.round(dollars * 100),
  start,
  end,
});

const PLANS: InstallmentPlan[] = [
  plan("Due 4th", 32.27, "2026-04", "2026-08"),
  plan("Due 6th", 25.96, "2026-04", "2026-07"),
  plan("Due 6th", 36.98, "2026-04", "2026-04"), // single month
  plan("Due 9th", 21.08, "2026-04", "2027-01"),
  plan("Due 9th", 15.48, "2026-04", "2027-01"),
  plan("Due 11th", 76.0, "2026-04", "2026-07"),
  plan("Due 14th", 15.35, "2026-04", "2026-06"),
  plan("Due 15th", 9.7, "2026-04", "2026-09"),
  plan("Due 17th", 11.21, "2026-04", "2026-08"),
  plan("Due 20th", 28.96, "2026-04", "2027-01"),
  plan("Due 21st", 10.7, "2026-04", "2026-06"),
  plan("Due 24th", 15.52, "2026-04", "2026-07"),
  plan("Due 25th", 13.08, "2026-04", "2026-07"),
  plan("Due 26th", 13.96, "2026-04", "2026-07"),
  plan("Due 27th", 15.81, "2026-04", "2026-08"),
  plan("Due 28th", 34.46, "2026-04", "2026-06"),
];

// ─── Monthly Income — April 2026 ─────────────────────────────────────────────
// Source: bottom of bill chart printout.
// Note: kias_pay is tracked via paycheck grid, not the bill chart income section.
// The bill chart shows MIL PAY + RET PAY + SOCCEC = $2,351.37 leaving SHORT $247.26.

const INCOME: MonthlyIncome[] = [
  {
    month: "2026-04",
    kias_pay: 0, // entered via paycheck tab, not bill chart
    military_pay: 124190, // $1,241.90
    retirement: 33447, // $334.47
    social_security: 77500, // $775.00
  },
];

// ─── Paycheck Weeks — April 2026 ─────────────────────────────────────────────
// Source: weekly paycheck grid printout (April section).
// kiasPay back-calculated from: PAY = kiasPay - (all allocations)
// 4/3 & 4/10: PAY=768.20, allocations=714.50 → kiasPay=1482.70
// 4/17 & 4/24: PAY=768.20, rent changes to 271.00 → kiasPay=1536.90

const pw = (
  weekOf: string,
  kiasPay: number,
  storage: number,
  rent: number,
  jazmin: number,
  dre: number,
  savings: number,
  paypalCC: number,
  deductions: number,
): PaycheckWeek => ({
  weekOf,
  kiasPay: Math.round(kiasPay * 100),
  storage: Math.round(storage * 100),
  rent: Math.round(rent * 100),
  jazmin: Math.round(jazmin * 100),
  dre: Math.round(dre * 100),
  savings: Math.round(savings * 100),
  paypalCC: Math.round(paypalCC * 100),
  deductions: Math.round(deductions * 100),
  extra: {},
});

const PAYCHECK_WEEKS: PaycheckWeek[] = [
  //           weekOf        kiasPay   storage  rent    jaz    dre    sav    ppal  deduct
  pw("2026-04-07", 1482.7, 58.95, 216.8, 31.25, 22.5, 250.0, 50.0, 0),
  pw("2026-04-14", 1482.7, 58.95, 216.8, 31.25, 22.5, 250.0, 50.0, 0),
  pw("2026-04-21", 1536.9, 58.95, 271.0, 31.25, 22.5, 250.0, 50.0, 0),
  pw("2026-04-28", 1536.9, 58.95, 271.0, 31.25, 22.5, 250.0, 50.0, 0),
];

// ─── Kia's Check Log — recent history for baseline calculation ────────────────
// Back-calculated from March paycheck grid (images 5 & 6).
// March weeks show consistent allocations → approximate check amount used.

// Real check history provided by client (12 weeks: Dec 2025 — Mar 2026)
// Amounts vary significantly — low $441.27, high $1,421.12, avg ~$984.95
// Projection uses THREE scenarios: conservative (low), average, optimistic (high)
// Default projection baseline = CONSERVATIVE to protect against shortfall
const CHECK_LOG: KiasCheckEntry[] = [
  { weekOf: "2025-12-26", amount: 125674 }, // $1,256.74
  { weekOf: "2026-01-09", amount: 110641 }, // $1,106.41
  { weekOf: "2026-01-16", amount: 104758 }, // $1,047.58
  { weekOf: "2026-01-30", amount: 90402 }, // $904.02
  { weekOf: "2026-02-06", amount: 44127 }, // $441.27
  { weekOf: "2026-02-13", amount: 142112 }, // $1,421.12
  { weekOf: "2026-02-20", amount: 91777 }, // $917.77
  { weekOf: "2026-02-27", amount: 98657 }, // $986.57
  { weekOf: "2026-03-06", amount: 124710 }, // $1,247.10
  { weekOf: "2026-03-13", amount: 69053 }, // $690.53
  { weekOf: "2026-03-20", amount: 98344 }, // $983.44
  { weekOf: "2026-03-27", amount: 81684 }, // $816.84
];

// ─── Seed State ───────────────────────────────────────────────────────────────

export const SEED_STATE: AppState = {
  bills: BILLS,
  income: INCOME,
  snapshots: [],
  plans: PLANS,
  paycheck: PAYCHECK_WEEKS,
  checkLog: CHECK_LOG,
  savingsLog: [],
  paycheckViewScope: "monthly",
  paycheckColumns: DEFAULT_PAYCHECK_COLUMNS,
  seenNotificationIds: [],
};
