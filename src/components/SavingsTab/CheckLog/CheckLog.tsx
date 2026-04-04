"use client";

import { useState } from "react";
import type { KiasCheckEntry } from "@/types";
import type { CheckBaseline } from "@/lib/projection";
import { fmtMoney, toCents } from "@/lib/money";
import { getMondaysUpToMonth, mondayOf, currentMonth } from "@/lib/dates";
import { Stat } from "@/components/ui/Stat/Stat";
import styles from "./CheckLog.module.css";

type Props = {
  log: KiasCheckEntry[];
  baseline: CheckBaseline | null;
  /** YYYY-MM — the operating month ceiling for which weeks to display. */
  upToMonth?: string;
  onAdd: (entry: KiasCheckEntry) => void;
  /** No longer used — kept in signature for backward compat. */
  onDelete?: (weekOf: string) => void;
};

/**
 * Kia's Check Log — Monday-keyed edition.
 *
 * Pre-loads every Monday (week start) from 6 months before `upToMonth`
 * through `upToMonth`. Each row is an inline-editable amount cell.
 *
 * weekOf normalization: all stored entries are normalized to Monday via
 * mondayOf() at read time, so legacy Friday-keyed entries are matched
 * correctly. New entries are written as Monday keys (the row date itself).
 *
 * Data contract: ADD_CHECK_ENTRY is an upsert keyed by weekOf (Monday date).
 */
export function CheckLog({ log, baseline, upToMonth, onAdd }: Props) {
  const ceiling = upToMonth ?? currentMonth();

  // Pre-load all Mondays in the display range, newest first.
  const mondays = getMondaysUpToMonth(ceiling);

  // Build a lookup map: normalized Monday → stored amount (cents).
  // mondayOf() handles both Monday-keyed (accordion) and Friday-keyed
  // (legacy) entries — both map to the same canonical Monday key.
  const amountByDate = new Map<string, number>(
    log.map((e) => [mondayOf(e.weekOf), e.amount]),
  );

  // Track which row is actively being edited + its draft string value
  const [editingDate, setEditingDate] = useState<string | null>(null);
  const [draftValue, setDraftValue] = useState("");

  const startEdit = (date: string) => {
    const stored = amountByDate.get(date);
    setEditingDate(date);
    setDraftValue(stored ? (stored / 100).toFixed(2) : "");
  };

  const commitEdit = (date: string) => {
    const cents = toCents(draftValue);
    if (cents > 0) {
      onAdd({ weekOf: date, amount: cents });
    }
    setEditingDate(null);
    setDraftValue("");
  };

  const cancelEdit = () => {
    setEditingDate(null);
    setDraftValue("");
  };

  return (
    <div className={styles.panel}>
      {/* ── Baseline stats ─────────────────────────────────────────── */}
      {baseline && (
        <div className={styles.baselineRow}>
          <div className={styles.baselineLeft}>
            <Stat label="Average" value={fmtMoney(baseline.average)} />
            <Stat label="Low" value={fmtMoney(baseline.low)} />
            <Stat label="High" value={fmtMoney(baseline.high)} />
          </div>
          <div className={styles.baselineRight}>
            <Stat label="Samples" value={String(baseline.sampleSize)} />
          </div>
        </div>
      )}

      {/* ── Week rows (Monday-anchored) ────────────────────────────── */}
      <div className={styles.rowList}>
        {mondays.map((date) => {
          const storedCents = amountByDate.get(date) ?? 0;
          const isEditing = editingDate === date;

          // Format: "Week of Apr 7" — numeric Date constructor, no TZ drift
          const [y, m, d] = date.split("-").map(Number);
          const weekLabel = new Date(y, m - 1, d).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
          });

          return (
            <div
              key={date}
              className={`${styles.row} ${storedCents > 0 ? styles.rowFilled : ""}`}
              onClick={() => !isEditing && startEdit(date)}
            >
              <span className={styles.dateLabel}>Week of {weekLabel}</span>

              {isEditing ? (
                <input
                  className={styles.amountInput}
                  type="text"
                  inputMode="decimal"
                  value={draftValue}
                  placeholder="0.00"
                  autoFocus
                  onChange={(e) => setDraftValue(e.target.value)}
                  onBlur={() => commitEdit(date)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") commitEdit(date);
                    if (e.key === "Escape") cancelEdit();
                  }}
                  onClick={(e) => e.stopPropagation()}
                />
              ) : (
                <span
                  className={
                    storedCents > 0 ? styles.amountFilled : styles.amountEmpty
                  }
                >
                  {storedCents > 0 ? fmtMoney(storedCents) : "—"}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
