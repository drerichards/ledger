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
}: Props) {
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

  const isGhost = variant === "ghost";

  if (editing) {
    return (
      <input
        className={[
          isGhost ? styles.ghostInput : styles.input,
          highlight ? styles.inputHighlight : "",
        ]
          .filter(Boolean)
          .join(" ")}
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
      className={[
        isGhost ? styles.ghostDisplay : styles.display,
        highlight ? styles.displayHighlight : "",
        styles.mono,
      ]
        .filter(Boolean)
        .join(" ")}
      onClick={handleFocus}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && handleFocus()}
    >
      {value > 0 ? fmtMoney(value) : <span className={styles.zero}>—</span>}
    </span>
  );
}
