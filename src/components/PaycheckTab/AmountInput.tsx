"use client";

import { useState } from "react";
import { fmtMoney } from "@/lib/money";
import styles from "./AmountInput.module.css";

type Props = {
  value: number;
  onChange: (raw: string) => void;
  highlight?: boolean;
};

/**
 * Click-to-edit monetary cell. Shows formatted value at rest,
 * switches to a raw text input on focus, commits on blur.
 */
export function AmountInput({ value, onChange, highlight = false }: Props) {
  const [editing, setEditing] = useState(false);
  const [raw, setRaw] = useState("");

  const handleFocus = () => {
    setEditing(true);
    setRaw(value > 0 ? (value / 100).toFixed(2) : "");
  };

  const handleBlur = () => {
    setEditing(false);
    onChange(raw);
  };

  if (editing) {
    return (
      <input
        className={`${styles.input} ${highlight ? styles.inputHighlight : ""}`}
        value={raw}
        onChange={(e) => setRaw(e.target.value)}
        onBlur={handleBlur}
        autoFocus
        placeholder="0.00"
      />
    );
  }

  return (
    <span
      className={`${styles.display} ${highlight ? styles.displayHighlight : ""} ${styles.mono}`}
      onClick={handleFocus}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && handleFocus()}
    >
      {value > 0 ? fmtMoney(value) : <span className={styles.zero}>—</span>}
    </span>
  );
}
