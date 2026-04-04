"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { Bill } from "@/types";
import { toCents } from "@/lib/money";
import { currentMonth } from "@/lib/dates";
import { generateId } from "@/lib/id";
import { billSchema, type BillFormValues } from "@/lib/schemas/bill.schema";
import { Modal } from "@/components/ui/Modal";
import { FormField } from "@/components/ui/FormField";
import styles from "./BillForm.module.css";

type Props = {
  initial: Bill | null;
  onSave: (bill: Bill) => void;
  onClose: () => void;
};

const FORM_ID = "bill-form";

function billToDefaultValues(bill: Bill): BillFormValues {
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

const DEFAULT_VALUES: BillFormValues = {
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

export function BillForm({ initial, onSave, onClose }: Props) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<BillFormValues>({
    resolver: zodResolver(billSchema),
    defaultValues: initial ? billToDefaultValues(initial) : DEFAULT_VALUES,
  });

  const onSubmit = (values: BillFormValues) => {
    const bill: Bill = {
      id: initial?.id ?? generateId(),
      month: initial?.month ?? currentMonth(),
      name: values.name.trim(),
      cents: toCents(values.amountStr),
      due: parseInt(values.due, 10),
      paid: initial?.paid ?? false,
      method: values.method,
      group: values.group,
      entry: values.entry,
      category: values.category,
      flagged: values.flagged,
      notes: values.notes.trim(),
      amountHistory: initial?.amountHistory ?? [],
    };

    onSave(bill);
  };

  return (
    <Modal
      title={initial ? "Edit Bill" : "Add Bill"}
      onClose={onClose}
      footer={
        <>
          <button type="button" className={styles.btnGhost} onClick={onClose}>
            Cancel
          </button>
          {/*
           * form attribute associates this button with the <form id={FORM_ID}> below
           * without requiring DOM nesting inside the form element.
           */}
          <button type="submit" form={FORM_ID} className={styles.btnPrimary}>
            {initial ? "Save Changes" : "Add Bill"}
          </button>
        </>
      }
    >
      <form id={FORM_ID} onSubmit={handleSubmit(onSubmit)}>
        <div className={styles.fields}>
          <FormField id="bill-name" label="Payee Name" error={errors.name?.message}>
            <input
              id="bill-name"
              className={styles.input}
              placeholder="e.g. T-Mobile"
              {...register("name")}
            />
          </FormField>

          <div className={styles.row2}>
            <FormField id="bill-amount" label="Amount ($)" error={errors.amountStr?.message}>
              <input
                id="bill-amount"
                className={styles.input}
                placeholder="0.00"
                {...register("amountStr")}
              />
            </FormField>
            <FormField id="bill-due" label="Due Day (1–31)" error={errors.due?.message}>
              <input
                id="bill-due"
                className={styles.input}
                placeholder="e.g. 15"
                maxLength={2}
                {...register("due")}
              />
            </FormField>
          </div>

          <div className={styles.row2}>
            <FormField id="bill-method" label="Payment Method">
              <select id="bill-method" className={styles.select} {...register("method")}>
                <option value="autopay">Autopay</option>
                <option value="transfer">Transfer</option>
              </select>
            </FormField>
            <FormField id="bill-group" label="Paid From">
              <select id="bill-group" className={styles.select} {...register("group")}>
                <option value="kias_pay">Kia&apos;s Pay</option>
                <option value="other_income">Other Income</option>
              </select>
            </FormField>
          </div>

          <FormField id="bill-entry" label="Entry Type">
            <select id="bill-entry" className={styles.select} {...register("entry")}>
              <option value="recurring">
                Recurring — carries forward automatically
              </option>
              <option value="manual">Manual — re-enter each month</option>
            </select>
          </FormField>

          <FormField id="bill-category" label="Category">
            <select id="bill-category" className={styles.select} {...register("category")}>
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
          </FormField>

          <FormField id="bill-notes" label="Notes">
            <textarea
              id="bill-notes"
              className={styles.textarea}
              placeholder="Optional — e.g. Keep at 32.00"
              rows={2}
              {...register("notes")}
            />
          </FormField>

          <label className={styles.checkboxLabel}>
            <input type="checkbox" {...register("flagged")} />
            Flag this bill (marks it red — needs attention)
          </label>
        </div>
      </form>
    </Modal>
  );
}
