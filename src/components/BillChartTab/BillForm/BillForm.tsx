"use client";

import { useState } from "react";
import type {
  Bill,
  BillCategory,
  BillEntry,
  BillGroup,
  PaymentMethod,
} from "@/types";
import { toCents } from "@/lib/money";
import { currentMonth } from "@/lib/dates";
import { generateId } from "@/lib/id";
import styles from "./BillForm.module.css";

type Props = {
  initial: Bill | null;
  onSave: (bill: Bill) => void;
  onClose: () => void;
};

type FormState = {
  name: string;
  amountStr: string;
  due: string;
  method: PaymentMethod;
  group: BillGroup;
  entry: BillEntry;
  category: BillCategory;
  flagged: boolean;
  notes: string;
};

const DEFAULT_FORM: FormState = {
  name: "",
  amountStr: "",
  due: "",
  method: "autopay",
  group: "kias_pay",
  entry: "recurring",
  category: "Other",
  flagged: false,
  notes: "",
};

function billToForm(bill: Bill): FormState {
  return {
    name: bill.name,
    amountStr: (bill.cents / 100).toFixed(2),
    due: String(bill.due),
    method: bill.method,
    group: bill.group,
    entry: bill.entry,
    category: bill.category,
    flagged: bill.flagged,
    notes: bill.notes,
  };
}

export function BillForm({ initial, onSave, onClose }: Props) {
  const [form, setForm] = useState<FormState>(
    initial ? billToForm(initial) : DEFAULT_FORM,
  );
  const [errors, setErrors] = useState<
    Partial<Record<keyof FormState, string>>
  >({});

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const validate = (): boolean => {
    const next: typeof errors = {};
    if (!form.name.trim()) next.name = "Name is required";
    if (!form.amountStr.trim()) next.amountStr = "Amount is required";
    if (!form.due.trim()) next.due = "Due date is required";
    const dueNum = parseInt(form.due, 10);
    if (isNaN(dueNum) || dueNum < 1 || dueNum > 31)
      next.due = "Enter a day (1–31)";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSave = () => {
    if (!validate()) return;

    const bill: Bill = {
      id: initial?.id ?? generateId(),
      month: initial?.month ?? currentMonth(),
      name: form.name.trim(),
      cents: toCents(form.amountStr),
      due: parseInt(form.due, 10),
      paid: initial?.paid ?? false,
      method: form.method,
      group: form.group,
      entry: form.entry,
      category: form.category,
      flagged: form.flagged,
      notes: form.notes.trim(),
      amountHistory: initial?.amountHistory ?? [],
    };

    onSave(bill);
  };

  return (
    <div className={styles.backdrop} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={styles.modal}>
        <div className={styles.modalHeader}>
          <h3 className={styles.modalTitle}>
            {initial ? "Edit Bill" : "Add Bill"}
          </h3>
          <button className={styles.closeBtn} onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        <div className={styles.modalBody}>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="bill-name">Payee Name</label>
            <input
              id="bill-name"
              className={styles.input}
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="e.g. T-Mobile"
            />
            {errors.name && <span className={styles.error}>{errors.name}</span>}
          </div>

          <div className={styles.row2}>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="bill-amount">Amount ($)</label>
              <input
                id="bill-amount"
                className={styles.input}
                value={form.amountStr}
                onChange={(e) => set("amountStr", e.target.value)}
                placeholder="0.00"
              />
              {errors.amountStr && <span className={styles.error}>{errors.amountStr}</span>}
            </div>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="bill-due">Due Day (1–31)</label>
              <input
                id="bill-due"
                className={styles.input}
                value={form.due}
                onChange={(e) => set("due", e.target.value)}
                placeholder="e.g. 15"
                maxLength={2}
              />
              {errors.due && <span className={styles.error}>{errors.due}</span>}
            </div>
          </div>

          <div className={styles.row2}>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="bill-method">Payment Method</label>
              <select
                id="bill-method"
                className={styles.select}
                value={form.method}
                onChange={(e) => set("method", e.target.value as PaymentMethod)}
              >
                <option value="autopay">Autopay</option>
                <option value="transfer">Transfer</option>
              </select>
            </div>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="bill-group">Paid From</label>
              <select
                id="bill-group"
                className={styles.select}
                value={form.group}
                onChange={(e) => set("group", e.target.value as BillGroup)}
              >
                <option value="kias_pay">Kia&apos;s Pay</option>
                <option value="other_income">Other Income</option>
              </select>
            </div>
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="bill-entry">Entry Type</label>
            <select
              id="bill-entry"
              className={styles.select}
              value={form.entry}
              onChange={(e) => set("entry", e.target.value as BillEntry)}
            >
              <option value="recurring">Recurring — carries forward automatically</option>
              <option value="manual">Manual — re-enter each month</option>
            </select>
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="bill-category">Category</label>
            <select
              id="bill-category"
              className={styles.select}
              value={form.category}
              onChange={(e) => set("category", e.target.value as BillCategory)}
            >
              <option value="Credit Cards">Credit Cards</option>
              <option value="Insurance">Insurance</option>
              <option value="Subscriptions">Subscriptions</option>
              <option value="Utilities">Utilities</option>
              <option value="Housing">Housing</option>
              <option value="Loans">Loans</option>
              <option value="Transfers">Transfers</option>
              <option value="Savings">Savings</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="bill-notes">Notes</label>
            <textarea
              id="bill-notes"
              className={styles.textarea}
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
              placeholder="Optional — e.g. Keep at 32.00"
              rows={2}
            />
          </div>

          <label className={styles.checkboxLabel}>
            <input
              type="checkbox"
              checked={form.flagged}
              onChange={(e) => set("flagged", e.target.checked)}
            />
            Flag this bill (marks it red — needs attention)
          </label>
        </div>

        <div className={styles.modalFooter}>
          <button className={styles.btnGhost} onClick={onClose}>Cancel</button>
          <button className={styles.btnPrimary} onClick={handleSave}>
            {initial ? "Save Changes" : "Add Bill"}
          </button>
        </div>
      </div>
    </div>
  );
}
