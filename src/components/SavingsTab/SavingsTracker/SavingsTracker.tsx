"use client";

import { useState } from "react";
import type { SavingsEntry } from "@/types";
import { fmtMoney, sumCents, toCents } from "@/lib/money";
import { today } from "@/lib/dates";
import { generateId } from "@/lib/id";
import styles from "./SavingsTracker.module.css";

type Props = {
  log: SavingsEntry[];
  onAdd: (entry: SavingsEntry) => void;
  onUpdate: (entry: SavingsEntry) => void;
  onDelete: (id: string) => void;
};

export function SavingsTracker({ log, onAdd, onUpdate, onDelete }: Props) {
  const [amtStr, setAmtStr] = useState("");
  const [dateStr, setDateStr] = useState(() => today());

  // Editing state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editAmtStr, setEditAmtStr] = useState("");
  const [editDateStr, setEditDateStr] = useState("");

  const handleAdd = () => {
    const cents = toCents(amtStr);
    if (cents <= 0) return;
    onAdd({ id: generateId(), date: dateStr, amount: cents });
    setAmtStr("");
    setDateStr(today());
  };

  const startEdit = (entry: SavingsEntry) => {
    setEditingId(entry.id);
    setEditAmtStr((entry.amount / 100).toFixed(2));
    setEditDateStr(getEntryDate(entry));
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditAmtStr("");
    setEditDateStr("");
  };

  const commitEdit = () => {
    // istanbul ignore next — editingId is always set before commitEdit is callable via UI
    if (!editingId) return;
    const cents = toCents(editAmtStr);
    if (cents <= 0) {
      cancelEdit();
      return;
    }
    onUpdate({ id: editingId, date: editDateStr, amount: cents });
    cancelEdit();
  };

  const handleDelete = (id: string) => {
    onDelete(id);
    // istanbul ignore next — delete button is hidden while a row is in edit mode;
    // this guard is unreachable via UI interaction (defensive only)
    if (editingId === id) {
      cancelEdit();
    }
  };

  // Use `date` field, falling back to deprecated `weekOf` for migration
  // istanbul ignore next — entries always have `date` post-migration; `?? ""` is unreachable
  const getEntryDate = (e: SavingsEntry) => e.date ?? e.weekOf ?? "";

  const runningTotal = sumCents(log.map((e) => e.amount));
  // Sort by date descending, show most recent first
  const sorted = [...log].sort(
    (a, b) => getEntryDate(b).localeCompare(getEntryDate(a))
  );
  const recent = sorted.slice(0, 10);

  // Format date for display: "Apr 7"
  const fmtDate = (dateStr: string) => {
    const [y, m, d] = dateStr.split("-").map(Number);
    return new Date(y, m - 1, d).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div className={styles.panel}>
      <h3 className={styles.panelTitle}>Savings Balance</h3>

      <div className={styles.savingsTotal}>{fmtMoney(runningTotal)}</div>

      {/* Add new entry form */}
      <div className={styles.addForm}>
        <div className={styles.addRow}>
          <input
            className={styles.dateInput}
            type="date"
            value={dateStr}
            onChange={(e) => setDateStr(e.target.value)}
          />
          <input
            className={styles.amountInput}
            type="text"
            inputMode="decimal"
            value={amtStr}
            onChange={(e) => setAmtStr(e.target.value)}
            placeholder="Amount"
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          />
          <button className={styles.btnOlive} onClick={handleAdd}>
            + Save
          </button>
        </div>
      </div>

      {/* Entry list */}
      {recent.length > 0 && (
        <div className={styles.logList}>
          {recent.map((e) => {
            const isEditing = editingId === e.id;
            const entryDate = getEntryDate(e);

            if (isEditing) {
              return (
                <div key={e.id} className={styles.logRowEditing}>
                  <input
                    className={styles.editDateInput}
                    type="date"
                    value={editDateStr}
                    onChange={(ev) => setEditDateStr(ev.target.value)}
                  />
                  <input
                    className={styles.editAmountInput}
                    type="text"
                    inputMode="decimal"
                    value={editAmtStr}
                    onChange={(ev) => setEditAmtStr(ev.target.value)}
                    autoFocus
                    onKeyDown={(ev) => {
                      if (ev.key === "Enter") commitEdit();
                      if (ev.key === "Escape") cancelEdit();
                    }}
                  />
                  <button
                    className={styles.btnSmall}
                    onClick={commitEdit}
                    title="Save"
                  >
                    ✓
                  </button>
                  <button
                    className={styles.btnSmallGhost}
                    onClick={cancelEdit}
                    title="Cancel"
                  >
                    ✕
                  </button>
                </div>
              );
            }

            return (
              <div key={e.id} className={styles.logRow}>
                <span className={styles.logDate}>{fmtDate(entryDate)}</span>
                <span className={styles.logAmount}>+ {fmtMoney(e.amount)}</span>
                <div className={styles.logActions}>
                  <button
                    className={styles.btnIcon}
                    onClick={() => startEdit(e)}
                    title="Edit"
                  >
                    ✎
                  </button>
                  <button
                    className={styles.btnIconDanger}
                    onClick={() => handleDelete(e.id)}
                    title="Delete"
                  >
                    ×
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
