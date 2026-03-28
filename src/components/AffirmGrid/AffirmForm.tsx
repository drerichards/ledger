"use client";

import { useState } from "react";
import type { InstallmentPlan } from "@/types";
import { toCents, fmtMoney } from "@/lib/money";
import { monthsBetween, currentMonth } from "@/lib/dates";
import { generateId } from "@/lib/id";
import styles from "./AffirmForm.module.css";

type Props = {
  onSave: (plan: InstallmentPlan) => void;
  onClose: () => void;
};

type FormState = {
  label: string;
  amountStr: string;
  start: string;
  end: string;
};

const DEFAULT_FORM: FormState = {
  label: "",
  amountStr: "",
  start: currentMonth(),
  end: "",
};

export function AffirmForm({ onSave, onClose }: Props) {
  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const [errors, setErrors] = useState<
    Partial<Record<keyof FormState, string>>
  >({});

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  // Live preview — only shown when both dates are valid
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
    if (form.end && form.start && form.end < form.start) {
      next.end = "Final month must be after start month";
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSave = () => {
    if (!validate()) return;
    onSave({
      id: generateId(),
      label: form.label.trim(),
      mc: toCents(form.amountStr),
      start: form.start,
      end: form.end,
    });
  };

  return (
    <div className={styles.backdrop} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h3 className={styles.modalTitle}>Add Installment Plan</h3>
          <button
            className={styles.closeBtn}
            onClick={onClose}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div className={styles.modalBody}>
          {/* Label */}
          <div className={styles.field}>
            <label className={styles.label} htmlFor="affirm-label">
              Plan Label
            </label>
            <input
              id="affirm-label"
              className={styles.input}
              value={form.label}
              onChange={(e) => set("label", e.target.value)}
              placeholder="e.g. Affirm – Living Room TV"
            />
            {errors.label && (
              <span className={styles.error}>{errors.label}</span>
            )}
          </div>

          {/* Monthly amount */}
          <div className={styles.field}>
            <label className={styles.label} htmlFor="affirm-amount">
              Monthly Payment ($)
            </label>
            <input
              id="affirm-amount"
              className={styles.input}
              value={form.amountStr}
              onChange={(e) => set("amountStr", e.target.value)}
              placeholder="0.00"
            />
            {errors.amountStr && (
              <span className={styles.error}>{errors.amountStr}</span>
            )}
          </div>

          {/* Start + End months */}
          <div className={styles.row2}>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="affirm-start">
                Start Month
              </label>
              <input
                id="affirm-start"
                className={styles.input}
                type="month"
                value={form.start}
                onChange={(e) => set("start", e.target.value)}
              />
              {errors.start && (
                <span className={styles.error}>{errors.start}</span>
              )}
            </div>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="affirm-end">
                Final Payment Month
              </label>
              <input
                id="affirm-end"
                className={styles.input}
                type="month"
                value={form.end}
                onChange={(e) => set("end", e.target.value)}
              />
              {errors.end && <span className={styles.error}>{errors.end}</span>}
            </div>
          </div>

          {/* Live preview */}
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
        </div>

        <div className={styles.modalFooter}>
          <button className={styles.btnGhost} onClick={onClose}>
            Cancel
          </button>
          <button className={styles.btnPrimary} onClick={handleSave}>
            Save Plan
          </button>
        </div>
      </div>
    </div>
  );
}
