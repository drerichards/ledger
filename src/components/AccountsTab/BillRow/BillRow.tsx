"use client";

import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import type { Bill } from "@/types";
import { fmtMoney } from "@/lib/money";
import styles from "./BillRow.module.css";

type Props = {
  bill: Bill;
  onEdit: (bill: Bill) => void;
  onDelete: (id: string) => void;
  onTogglePaid: (id: string) => void;
};

/** Derives the METHOD pill label and color variant from bill data. */
function getMethodBadge(bill: Bill): { label: string; className: string } {
  if (bill.category === "Credit Cards") {
    return { label: "Credit", className: styles.methodRust };
  }
  if (bill.method === "autopay") {
    return { label: "Autopay", className: styles.methodOlive };
  }
  return { label: "Transfer", className: styles.methodNavy };
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
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number } | null>(null);
  const badge = getMethodBadge(bill);

  useEffect(() => {
    if (!menuOpen) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- clear position when menu closes
      setMenuPosition(null);
      return;
    }
    const updatePosition = () => {
      if (!menuButtonRef.current) return;
      const rect = menuButtonRef.current.getBoundingClientRect();
      setMenuPosition({
        top: rect.bottom + 8,
        left: rect.right,
      });
    };
    updatePosition();
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        menuRef.current &&
        !menuRef.current.contains(target) &&
        menuButtonRef.current &&
        !menuButtonRef.current.contains(target)
      ) {
        setMenuOpen(false);
      }
    };
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    document.addEventListener("mousedown", handler);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
      document.removeEventListener("mousedown", handler);
    };
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
        <div className={styles.menuWrap}>
          <button
            ref={menuButtonRef}
            className={styles.menuBtn}
            onClick={() => setMenuOpen((v) => !v)}
            aria-label={`Actions for ${bill.name}`}
            aria-expanded={menuOpen}
            aria-haspopup="menu"
          >
            ⋯
          </button>
        </div>
        {menuOpen && menuPosition && createPortal(
          <div
            ref={menuRef}
            className={styles.menuPortal}
            style={{ top: `${menuPosition.top}px`, left: `${menuPosition.left}px` }}
            role="menu"
          >
            <button
              className={styles.menuItem}
              role="menuitem"
              onClick={() => { onEdit(bill); setMenuOpen(false); }}
              aria-label={`Edit ${bill.name}`}
            >
              <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                <path d="M11.5 1.5a1.5 1.5 0 0 1 2.121 0l.879.879a1.5 1.5 0 0 1 0 2.121l-8 8a.5.5 0 0 1-.177.118l-3.5 1.5a.5.5 0 0 1-.638-.638l1.5-3.5a.5.5 0 0 1 .118-.177z"/>
              </svg>
              Edit
            </button>
            <button
              className={`${styles.menuItem} ${styles.menuItemDanger}`}
              role="menuitem"
              onClick={() => { onDelete(bill.id); setMenuOpen(false); }}
              aria-label={`Delete ${bill.name}`}
            >
              <svg width="12" height="13" viewBox="0 0 12 13" fill="currentColor" aria-hidden="true">
                <rect x="4" y="0" width="4" height="1.5" rx="0.75"/>
                <rect x="0.5" y="2" width="11" height="1.5" rx="0.75"/>
                <path d="M1.8 5h8.4l-.75 6.75A.75.75 0 0 1 9.7 12.5H2.3a.75.75 0 0 1-.75-.75L1.8 5z"/>
              </svg>
              Delete
            </button>
          </div>,
          document.body
        )}
      </td>
    </tr>
  );
}
