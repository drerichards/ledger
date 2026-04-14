"use client";

import { useState, useRef, useEffect } from "react";
import type { Bill } from "@/types";
import { fmtMoney } from "@/lib/money";
import styles from "./BillRow.module.css";

type Props = {
  bill: Bill;
  onEdit: (bill: Bill) => void;
  onDelete: (id: string) => void;
  onTogglePaid: (id: string) => void;
};

/** Derives the METHOD pill label and color variant from bill data.
 *  PaymentMethod is typed "autopay" | "transfer" — Affirm and Credit
 *  are not in the type system. Labels are derived from group/category instead.
 */
function getMethodBadge(bill: Bill): { label: string; className: string } {
  if (bill.group === "other_income") {
    return { label: "Affirm", className: styles.methodOlive };
  }
  if (bill.category === "Credit Cards") {
    return { label: "Credit", className: styles.methodRust };
  }
  return { label: "Transfer", className: styles.methodOlive };
}

/** Returns ordinal suffix for day-of-month display (1st, 2nd, 3rd, 4th…). */
function getDueSuffix(day: number): string {
  if (day >= 11 && day <= 13) return "th";
  switch (day % 10) {
    case 1: return "st";
    case 2: return "nd";
    case 3: return "rd";
    default: return "th";
  }
}

export function BillRow({ bill, onEdit, onDelete, onTogglePaid }: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const badge = getMethodBadge(bill);

  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [menuOpen]);

  return (
    <tr
      className={`${styles.row} ${bill.paid ? styles.rowPaid : ""} ${bill.flagged ? styles.rowFlagged : ""}`}
      title={bill.notes || undefined}
    >
      {/* Payee */}
      <td className={styles.td}>
        <span className={bill.paid ? styles.paidName : styles.name}>
          {bill.name}
        </span>
        {bill.entry === "recurring" && (
          <span className={styles.recurringBadge} title="Recurring">↻</span>
        )}
        {bill.flagged && (
          <span className={styles.flagBadge} title="Flagged">!</span>
        )}
      </td>

      {/* Due */}
      <td className={styles.td}>
        <span className={styles.mono}>
          {bill.due}{getDueSuffix(bill.due)}
        </span>
      </td>

      {/* Method */}
      <td className={styles.td}>
        <span className={badge.className}>{badge.label}</span>
      </td>

      {/* Amount */}
      <td className={`${styles.td} ${styles.tdRight}`}>
        <span className={`${styles.mono} ${bill.paid ? styles.paidText : ""}`}>
          {fmtMoney(bill.cents)}
        </span>
      </td>

      {/* Status pill — click to toggle paid */}
      <td className={`${styles.td} ${styles.tdCenter}`}>
        <button
          className={bill.paid ? styles.statusPaid : styles.statusUnpaid}
          onClick={() => onTogglePaid(bill.id)}
          aria-label={`Mark ${bill.name} as ${bill.paid ? "unpaid" : "paid"}`}
          aria-pressed={bill.paid}
        >
          {bill.paid ? "✓ Paid" : "Unpaid"}
        </button>
      </td>

      {/* Actions — ⋯ dropdown */}
      <td className={`${styles.td} ${styles.tdCenter}`}>
        <div className={styles.menuWrap} ref={menuRef}>
          <button
            className={styles.menuBtn}
            onClick={() => setMenuOpen((v) => !v)}
            aria-label={`Actions for ${bill.name}`}
            aria-expanded={menuOpen}
            aria-haspopup="menu"
          >
            ⋯
          </button>
          {menuOpen && (
            <div className={styles.menuDropdown} role="menu">
              <button
                className={styles.menuItem}
                role="menuitem"
                onClick={() => { onEdit(bill); setMenuOpen(false); }}
                aria-label={`Edit ${bill.name}`}
              >
                Edit
              </button>
              <button
                className={`${styles.menuItem} ${styles.menuItemDanger}`}
                role="menuitem"
                onClick={() => { onDelete(bill.id); setMenuOpen(false); }}
                aria-label={`Delete ${bill.name}`}
              >
                Delete
              </button>
            </div>
          )}
        </div>
      </td>
    </tr>
  );
}
