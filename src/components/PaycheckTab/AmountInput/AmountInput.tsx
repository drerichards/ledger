"use client";

import { useState } from "react";
import { fmtMoney } from "@/lib/money";
import styles from "./AmountInput.module.css";

type Props = {
  value: number;
  onChange: (raw: string) => void;
  highlight?: boolean;
  /**
   * "default" — bordered input used in table cells (existing behaviour).
   * "ghost"   — borderless at rest, bottom border on hover, cream bg on focus.
   *             Used in the accordion body to signal editability without
   *             looking like a form field when idle.
   */
  variant?: "default" | "ghost";
  /** If true, displays value as static text — no editing. */
  disabled?: boolean;
};

/**
 * Click-to-edit monetary cell. Shows formatted value at rest,
 * switches to a raw text input on focus, commits on blur.
 */
export function AmountInput({
  value,
  onChange,
  highlight = false,
  variant = "default",
  disabled = false,
}: Props) {
  const [editing, setEditing] = useState(false);
  const [raw, setRaw] = useState("");

  const handleFocus = () => {
    if (disabled) return;
    setEditing(true);
    setRaw(value > 0 ? (value / 100).toFixed(2) : "");
  };

  const handleConfirm = () => {
    setEditing(false);
    onChange(raw);
  };

  const handleCancel = () => {
    setEditing(false);
    setRaw("");
  };

  const isGhost = variant === "ghost";

  if (editing && !disabled) {
    return (
      <div className={styles.editControls}>
        <input
          className={[
            isGhost ? styles.ghostInput : styles.input,
            highlight ? styles.inputHighlight : "",
          ]
            .filter(Boolean)
            .join(" ")}
          value={raw}
          onChange={(e) => setRaw(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleConfirm();
            if (e.key === "Escape") handleCancel();
          }}
          autoFocus
          placeholder="0.00"
        />
        <button
          type="button"
          className={styles.btnConfirm}
          onClick={handleConfirm}
          title="Save"
        >
          ✓
        </button>
        <button
          type="button"
          className={styles.btnCancel}
          onClick={handleCancel}
          title="Cancel"
        >
          ✕
        </button>
      </div>
    );
  }

  return (
    <span
      className={[
        isGhost ? styles.ghostDisplay : styles.display,
        highlight ? styles.displayHighlight : "",
        disabled ? styles.disabled : "",
        styles.mono,
      ]
        .filter(Boolean)
        .join(" ")}
      onClick={handleFocus}
      role={disabled ? undefined : "button"}
      tabIndex={disabled ? -1 : 0}
      onKeyDown={(e) => !disabled && e.key === "Enter" && handleFocus()}
    >
      {value > 0 ? fmtMoney(value) : <span className={styles.zero}>—</span>}
    </span>
  );
}
