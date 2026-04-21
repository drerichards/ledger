"use client";

import { useState } from "react";
import type { InstallmentPlan } from "@/types";
import { toCents, fmtMoney } from "@/lib/money";
import { monthsBetween, currentMonth } from "@/lib/dates";
import { generateId } from "@/lib/id";
import { Modal } from "@/components/ui/Modal";
import { FormField } from "@/components/ui/FormField";
import styles from "./AffirmForm.module.css";

type Props = {
  initial?: InstallmentPlan | null;
  onSave: (plan: InstallmentPlan) => void;
  onClose: () => void;
};

type FormState = {
  label: string;
  amountStr: string;
  start: string;
  end: string;
  dueDayStr: string;
};

const DEFAULT_FORM: FormState = {
  label: "",
  amountStr: "",
  start: currentMonth(),
  end: "",
  dueDayStr: "1",
};

export function AffirmForm({ initial = null, onSave, onClose }: Props) {
  const [form, setForm] = useState<FormState>(
    initial
      ? {
          label: initial.label,
          amountStr: (initial.mc / 100).toFixed(2),
          start: initial.start,
          end: initial.end,
          dueDayStr: String(initial.dueDay ?? 1),
        }
      : DEFAULT_FORM,
  );
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const previewMonths =
    form.start && form.end && form.end >= form.start
      ? monthsBetween(form.start, form.end)
      : null;

  const previewTotal =
    previewMonths !== null ? toCents(form.amountStr) * previewMonths : null;

  const validate = (): boolean => {
    const next: typeof errors = {};
    if (!form.label.trim()) next.label = "Label is required";
    if (!form.amountStr.trim()) next.amountStr = "Amount is required";
    if (!form.start) next.start = "Start month is required";
    if (!form.end) next.end = "Final month is required";
    if (!form.dueDayStr.trim()) next.dueDayStr = "Due day is required";
    if (form.end && form.start && form.end < form.start)
      next.end = "Final month must be after start month";
    if (form.dueDayStr && (Number(form.dueDayStr) < 1 || Number(form.dueDayStr) > 31))
      next.dueDayStr = "Due day must be 1 to 31";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSave = () => {
    if (!validate()) return;
    onSave({
      id: initial?.id ?? generateId(),
      label: form.label.trim(),
      mc: toCents(form.amountStr),
      start: form.start,
      end: form.end,
      dueDay: Number(form.dueDayStr),
    });
  };

  return (
    <Modal
      title={initial ? "Edit Installment Plan" : "Add Installment Plan"}
      onClose={onClose}
      footer={
        <>
          <button type="button" className={styles.btnGhost} onClick={onClose}>
            Cancel
          </button>
          <button type="button" className={styles.btnPrimary} onClick={handleSave}>
            {initial ? "Save Changes" : "Save Plan"}
          </button>
        </>
      }
    >
      <FormField id="affirm-label" label="Plan Label" error={errors.label}>
        <input
          id="affirm-label"
          className={styles.input}
          value={form.label}
          onChange={(e) => set("label", e.target.value)}
          placeholder="e.g. Affirm – Living Room TV"
        />
      </FormField>

      <FormField id="affirm-amount" label="Monthly Payment ($)" error={errors.amountStr}>
        <input
          id="affirm-amount"
          className={styles.input}
          value={form.amountStr}
          onChange={(e) => set("amountStr", e.target.value)}
          placeholder="0.00"
        />
      </FormField>

      <div className={styles.row2}>
        <FormField id="affirm-due-day" label="Due Day" error={errors.dueDayStr}>
          <input
            id="affirm-due-day"
            className={styles.input}
            type="number"
            min="1"
            max="31"
            value={form.dueDayStr}
            onChange={(e) => set("dueDayStr", e.target.value)}
          />
        </FormField>
        <FormField id="affirm-start" label="Start Month" error={errors.start}>
          <input
            id="affirm-start"
            className={styles.input}
            type="month"
            value={form.start}
            onChange={(e) => set("start", e.target.value)}
          />
        </FormField>
        <FormField id="affirm-end" label="Final Payment Month" error={errors.end}>
          <input
            id="affirm-end"
            className={styles.input}
            type="month"
            value={form.end}
            onChange={(e) => set("end", e.target.value)}
          />
        </FormField>
      </div>

      {previewMonths !== null && previewTotal !== null && (
        <div className={styles.preview}>
          <span>
            {previewMonths} month{previewMonths !== 1 ? "s" : ""}
          </span>
          <span>
            Total owed: <strong>{fmtMoney(previewTotal)}</strong>
          </span>
        </div>
      )}
    </Modal>
  );
}
