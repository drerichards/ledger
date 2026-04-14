"use client";

import { useState } from "react";
import type { BankAccount, Bill, InstallmentPlan, KiasCheckEntry, SavingsEntry } from "@/types";
import { fmtMoney, sumCents, toCents } from "@/lib/money";
import { today, mondayOf } from "@/lib/dates";
import { projectWeekRows, calcWeekSurplus, isCovered } from "@/lib/cashflow";
import type { CashFlowRow } from "@/lib/cashflow";
import { generateId } from "@/lib/id";
import { LedgerTable } from "@/components/ui/LedgerTable/LedgerTable";
import type { LedgerRow, LedgerSection } from "@/components/ui/LedgerTable/LedgerTable";
import styles from "./HomeTab.module.css";
import { StatCard } from "@/components/ui/StatCard";

type Props = {
  checkingBalance: number; // cents — legacy fallback when no bankAccounts
  checkingBalanceDate: string; // YYYY-MM-DD or "" — legacy fallback
  bankAccounts: BankAccount[];
  bills: Bill[];
  plans: InstallmentPlan[];
  checkLog: KiasCheckEntry[];
  savingsLog: SavingsEntry[];
  onSetBalance: (balance: number, date: string) => void;
  onAddBankAccount: (account: BankAccount) => void;
  onUpdateBankAccount: (account: BankAccount) => void;
  onDeleteBankAccount: (id: string) => void;
};

// ── Date helpers ───────────────────────────────────────────────────────────────

function addDays(dateStr: string, n: number): string {
  const d = new Date(dateStr + "T12:00:00");
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

function fmtDateShort(dateStr: string): string {
  const [y, m, day] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, day).toLocaleString("default", { month: "short", day: "numeric" });
}

function fmtBalanceDate(dateStr: string): string {
  if (!dateStr) return "Not set";
  return "Updated " + fmtDateShort(dateStr);
}

// ── Legacy single-balance edit form ───────────────────────────────────────────

type BalanceEditProps = {
  onSave: (balance: number, date: string) => void;
  onCancel: () => void;
};

function BalanceEditForm({ onSave, onCancel }: BalanceEditProps) {
  const [val, setVal] = useState("");

  const handleSave = () => {
    const cents = toCents(val);
    if (cents <= 0) return;
    onSave(cents, today());
  };

  return (
    <div className={styles.balanceEditForm}>
      <input
        className={styles.balanceInput}
        type="number"
        min="0"
        step="0.01"
        placeholder="0.00"
        value={val}
        onChange={(e) => setVal(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter") handleSave(); if (e.key === "Escape") onCancel(); }}
        autoFocus
      />
      <button type="button" className={styles.saveBtn} onClick={handleSave}>Save</button>
      <button type="button" className={styles.cancelBtn} onClick={onCancel}>Cancel</button>
    </div>
  );
}

// ── Bank account add/edit form ─────────────────────────────────────────────────

type AccountFormProps = {
  initialName?: string;
  initialBalance?: number; // cents
  onSave: (name: string, balanceCents: number) => void;
  onCancel: () => void;
};

function AccountForm({ initialName = "", initialBalance, onSave, onCancel }: AccountFormProps) {
  const [name, setName] = useState(initialName);
  const [val, setVal] = useState(initialBalance != null ? (initialBalance / 100).toFixed(2) : "");

  const handleSave = () => {
    if (!name.trim()) return;
    const cents = toCents(val);
    if (cents < 0) return;
    onSave(name.trim(), cents);
  };

  return (
    <div className={styles.acctEditForm}>
      <div className={styles.acctFormRow}>
        <span className={styles.acctFormLabel}>Name</span>
        <input
          className={styles.acctFormInput}
          type="text"
          placeholder="e.g. Chase Checking"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") handleSave(); if (e.key === "Escape") onCancel(); }}
          autoFocus
        />
      </div>
      <div className={styles.acctFormRow}>
        <span className={styles.acctFormLabel}>Balance</span>
        <input
          className={styles.acctFormInput}
          type="number"
          min="0"
          step="0.01"
          placeholder="0.00"
          value={val}
          onChange={(e) => setVal(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") handleSave(); if (e.key === "Escape") onCancel(); }}
        />
      </div>
      <div className={styles.acctFormBtns}>
        <button type="button" className={styles.saveBtn} onClick={handleSave}>
          {initialName ? "Save" : "Add"}
        </button>
        <button type="button" className={styles.cancelBtn} onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
}

// ── Cash flow helpers ──────────────────────────────────────────────────────────

const CF_COLUMNS = [
  { key: "date",    header: "Date" },
  { key: "payee",   header: "Payee" },
  { key: "amount",  header: "Amount",  align: "right" as const },
  { key: "balance", header: "Balance", align: "right" as const },
];

function toCfSection(label: string, rows: CashFlowRow[]): LedgerSection {
  return {
    label,
    rows: rows.map((r, i): LedgerRow => ({
      id: `${label}-${i}`,
      variant: r.runningBalance < 0 ? "danger" : r.type === "income" ? "income" : "default",
      cells: [
        <span key="date" className={styles.cfDateCell}>{fmtDateShort(r.date)}</span>,
        <span key="payee" className={styles.cfPayee}>{r.payee}</span>,
        <span key="amt" className={`${styles.cfMono} ${r.cents > 0 ? styles.cfPos : styles.cfNeg}`}>
          {r.cents > 0 ? "+" : "−"}{fmtMoney(Math.abs(r.cents))}
        </span>,
        <span key="bal" className={`${styles.cfMono} ${r.runningBalance < 0 ? styles.cfDanger : r.runningBalance < 10000 ? styles.cfWarn : ""}`}>
          {fmtMoney(r.runningBalance)}
        </span>,
      ],
    })),
  };
}

// ── Next due pills ─────────────────────────────────────────────────────────────

function nextDueBills(bills: Bill[], month: string, fromDate: string, limit: number): Bill[] {
  return bills
    .filter((b) => b.month === month && !b.paid)
    .map((b) => ({ ...b, _date: `${month}-${String(b.due).padStart(2, "0")}` }))
    .filter((b) => b._date >= fromDate)
    .sort((a, b) => a._date.localeCompare(b._date))
    .slice(0, limit);
}

// ── Main HomeTab ───────────────────────────────────────────────────────────────

export function HomeTab({
  checkingBalance,
  checkingBalanceDate,
  bankAccounts,
  bills,
  plans,
  checkLog,
  savingsLog,
  onSetBalance,
  onAddBankAccount,
  onUpdateBankAccount,
  onDeleteBankAccount,
}: Props) {
  const [editingBalance, setEditingBalance] = useState(false);
  const [editingAccountId, setEditingAccountId] = useState<string | null>(null);
  const [addingAccount, setAddingAccount] = useState(false);

  const todayStr = today();
  const currentMonday = mondayOf(todayStr);
  const currentSunday = addDays(currentMonday, 6);
  const nextMonday = addDays(currentMonday, 7);
  const nextSunday = addDays(currentMonday, 13);
  const month = todayStr.slice(0, 7);

  const savingsTotal = sumCents(savingsLog.map((e) => e.amount));

  // Effective checking balance: sum of bank accounts when present, else legacy single balance
  const bankAccountsTotal = bankAccounts.length > 0
    ? sumCents(bankAccounts.map((a) => a.balanceCents))
    : checkingBalance;

  const totalLiquid = bankAccountsTotal + savingsTotal;

  const thisWeekRows = projectWeekRows({
    startBalance: bankAccountsTotal,
    bills,
    plans,
    checkLog,
    month,
    fromDate: currentMonday,
    toDate: currentSunday,
  });

  const nextWeekRows = projectWeekRows({
    startBalance: thisWeekRows.at(-1)?.runningBalance ?? bankAccountsTotal,
    bills,
    plans,
    checkLog,
    month,
    fromDate: nextMonday,
    toDate: nextSunday,
  });

  const surplus = calcWeekSurplus(thisWeekRows);
  const covered = isCovered(thisWeekRows);
  const upcomingBills = nextDueBills(bills, month, todayStr, 3);

  const surplusLabel = surplus >= 0
    ? `+${fmtMoney(surplus)} this week`
    : `${fmtMoney(surplus)} this week`;

  const coveredThrough = fmtDateShort(currentSunday);

  const thisWeekLabel = `This week — ${fmtDateShort(currentMonday)}–${fmtDateShort(currentSunday)}`;
  const nextWeekLabel = `Next week — ${fmtDateShort(nextMonday)}–${fmtDateShort(nextSunday)}`;

  const hasAccounts = bankAccounts.length > 0;

  return (
    <div className={styles.container}>

      {/* ── Balance row ────────────────────────────────────────────── */}
      <div className={styles.balanceRow}>

        {/* Checking accounts — multi-account list or legacy single balance */}
        {hasAccounts ? (
          <div className={styles.accountsCol}>
            <p className={styles.accountsColLabel}>Checking</p>

            {bankAccounts.map((acct) =>
              editingAccountId === acct.id ? (
                <AccountForm
                  key={acct.id}
                  initialName={acct.name}
                  initialBalance={acct.balanceCents}
                  onSave={(name, balanceCents) => {
                    onUpdateBankAccount({ ...acct, name, balanceCents, updatedDate: today() });
                    setEditingAccountId(null);
                  }}
                  onCancel={() => setEditingAccountId(null)}
                />
              ) : (
                <div key={acct.id} className={styles.statCardSm}>
                  <div className={styles.acctInfo}>
                    <p className={styles.acctName}>{acct.name}</p>
                    <p className={styles.acctBalance}>{fmtMoney(acct.balanceCents)}</p>
                  </div>
                  <div className={styles.acctActions}>
                    <button
                      type="button"
                      className={styles.acctBtn}
                      title="Edit"
                      onClick={() => setEditingAccountId(acct.id)}
                    >
                      ✎
                    </button>
                    <button
                      type="button"
                      className={`${styles.acctBtn} ${styles.acctBtnDelete}`}
                      title="Delete"
                      onClick={() => onDeleteBankAccount(acct.id)}
                    >
                      ×
                    </button>
                  </div>
                </div>
              )
            )}

            {addingAccount ? (
              <AccountForm
                onSave={(name, balanceCents) => {
                  onAddBankAccount({ id: generateId(), name, balanceCents, updatedDate: today() });
                  setAddingAccount(false);
                }}
                onCancel={() => setAddingAccount(false)}
              />
            ) : (
              <button
                type="button"
                className={styles.addAccountBtn}
                onClick={() => setAddingAccount(true)}
              >
                + Add Account
              </button>
            )}
          </div>
        ) : (
          /* Legacy single-balance card — shown until first account is added */
          <div className={`${styles.statCard} ${styles.statCard_navy}`}>
            <p className={styles.statLabel}>Checking</p>
            {editingBalance ? (
              <BalanceEditForm
                onSave={(bal, date) => { onSetBalance(bal, date); setEditingBalance(false); }}
                onCancel={() => setEditingBalance(false)}
              />
            ) : (
              <>
                <p className={styles.statValue}>{fmtMoney(checkingBalance)}</p>
                <div className={styles.statSub}>
                  {fmtBalanceDate(checkingBalanceDate)}
                  {" · "}
                  <button
                    type="button"
                    className={styles.updateLink}
                    onClick={() => setEditingBalance(true)}
                  >
                    Update
                  </button>
                  {" · "}
                  <button
                    type="button"
                    className={styles.updateLink}
                    onClick={() => setAddingAccount(true)}
                  >
                    + Add Accounts
                  </button>
                </div>
              </>
            )}
            {addingAccount && (
              <AccountForm
                onSave={(name, balanceCents) => {
                  onAddBankAccount({ id: generateId(), name, balanceCents, updatedDate: today() });
                  setAddingAccount(false);
                }}
                onCancel={() => setAddingAccount(false)}
              />
            )}
          </div>
        )}

        <StatCard
          label="Savings"
          color="olive"
          value={fmtMoney(savingsTotal)}
        />

        <StatCard
          label="Total Liquid"
          color="gold"
          value={fmtMoney(totalLiquid)}
        />
      </div>

      {/* ── Covered / surplus band ──────────────────────────────────── */}
      <div className={`${styles.coveredBand} ${covered ? styles.coveredBand_ok : styles.coveredBand_warn}`}>
        <div>
          <p className={styles.surplusLabel}>Week {surplus >= 0 ? "Surplus" : "Shortfall"}</p>
          <p className={`${styles.surplusAmount} ${surplus >= 0 ? styles.surplusPos : styles.surplusNeg}`}>
            {surplusLabel}
          </p>
        </div>
        <div className={styles.coveredRight}>
          <span className={styles.coveredEmoji}>{covered ? "✅" : "⚠️"}</span>
          <p className={styles.coveredStatus}>{covered ? "You're covered" : "Shortfall risk"}</p>
          <p className={styles.coveredThrough}>through {coveredThrough}</p>
        </div>
      </div>

      {/* ── Two-column body ─────────────────────────────────────────── */}
      <div className={styles.body}>

        {/* Left: next due */}
        <div className={styles.nextDue}>
          <p className={styles.colLabel}>Next Due</p>
          {upcomingBills.length === 0 ? (
            <p className={styles.emptyDue}>No unpaid bills remaining this month.</p>
          ) : (
            upcomingBills.map((b, i) => {
              const color = (["navy", "rust", "olive"] as const)[i % 3];
              return (
                <div key={b.id} className={`${styles.duePill} ${styles[`duePill_${color}`]}`}>
                  <p className={styles.dueDate}>{fmtDateShort(`${month}-${String(b.due).padStart(2, "0")}`)}</p>
                  <p className={styles.dueName}>{b.name}</p>
                  <p className={styles.dueAmount}>{fmtMoney(b.cents)}</p>
                </div>
              );
            })
          )}
        </div>

        {/* Right: cash flow table */}
        <div className={styles.cashFlow}>
          <p className={styles.colLabel}>Cash flow — balance after each transaction</p>
          <LedgerTable
            columns={CF_COLUMNS}
            sections={[
              toCfSection(thisWeekLabel, thisWeekRows),
              toCfSection(nextWeekLabel, nextWeekRows),
            ]}
            emptyMessage="No transactions found. Add bills or check entries to see your cash flow."
          />
        </div>

      </div>
    </div>
  );
}
