"use client";

import React, { useState, useMemo } from "react";
import type { KiasCheckEntry, PaycheckColumn, PaycheckWeek } from "@/types";
import { fmtMoney, toCents } from "@/lib/money";
import {
  getWeekColumnValue,
  setWeekColumnValue,
  sumWeekColumns,
} from "@/lib/paycheck";
import { currentMonth } from "@/lib/dates";
import { calcCheckBaseline } from "@/lib/projection";
import { AmountInput } from "../AmountInput";
import { Modal } from "@/components/ui/Modal";
import styles from "./WeekAccordion.module.css";

type Props = {
  week: PaycheckWeek;
  columns: PaycheckColumn[];
  /** YYYY-MM-DD — the Monday of this week (used as the canonical key). */
  displayDate: string;
  affirmPerWeek: number;
  savingsForWeek: number;
  isExpanded: boolean;
  onToggle: () => void;
  onUpsertWeek: (week: PaycheckWeek) => void;
  onAddCheckEntry: (entry: KiasCheckEntry) => void;
  onUpdateCheckEntry: (entry: KiasCheckEntry) => void;
  onDeleteCheckEntry: (weekOf: string) => void;
  /** Existing check entry for this week (if one exists in the log). */
  checkEntry?: KiasCheckEntry;
  /** Full check log to calculate baseline impact */
  checkLog: KiasCheckEntry[];
  /** True if user has acknowledged the warning about editing historical check entries. */
  checkEditWarningAcked: boolean;
  onAckCheckEditWarning: () => void;
  /** If true, disables editing (for future months). */
  readOnly?: boolean;
  /** Navigate to Affirm tab */
  onGoToAffirm?: () => void;
  /** Navigate to Savings tab */
  onGoToSavings?: () => void;
};

/**
 * One accordion row in the PaycheckTab timeline.
 *
 * Collapsed: date label + Kia's Pay (editable) + Remaining (derived).
 * Expanded: full payee field list with ghost inputs. Derived fields
 * (Affirm, Savings) are visually receded — read-only, italic label.
 */
export const WeekAccordion = React.memo(function WeekAccordion({
  week,
  columns,
  displayDate,
  affirmPerWeek,
  savingsForWeek,
  isExpanded,
  onToggle,
  onUpsertWeek,
  onAddCheckEntry,
  onUpdateCheckEntry,
  onDeleteCheckEntry,
  checkEntry,
  checkLog,
  checkEditWarningAcked,
  onAckCheckEditWarning,
  readOnly = false,
  onGoToAffirm,
  onGoToSavings,
}: Props) {
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [pendingEdit, setPendingEdit] = useState<{
    oldAmount: number;
    newAmount: number;
  } | null>(null);
  const [dontShowAgain, setDontShowAgain] = useState(false);
  const totalAllocated = sumWeekColumns(
    week,
    columns,
    affirmPerWeek,
    savingsForWeek,
  );
  const remaining = week.kiasPay - totalAllocated;

  // Calculate baseline impact when editing historical check
  const baselineImpact = useMemo(() => {
    // istanbul ignore next — pendingEdit is null before any edit; !checkEntry is a defensive guard
    if (!pendingEdit || !checkEntry) return null;

    const currentBaseline = calcCheckBaseline(checkLog);
    // istanbul ignore next — calcCheckBaseline returns null only with empty/single-entry logs; edge case
    if (!currentBaseline) return null;

    // Simulate the updated check log
    const updatedLog = checkLog.map((e) =>
      e.weekOf === week.weekOf ? { ...e, amount: pendingEdit.newAmount } : e,
    );
    const newBaseline = calcCheckBaseline(updatedLog);
    // istanbul ignore next — newBaseline null is an edge case; same data set makes it unreachable in practice
    if (!newBaseline) return null;

    return {
      currentAverage: currentBaseline.average,
      newAverage: newBaseline.average,
      currentLow: currentBaseline.low,
      newLow: newBaseline.low,
      currentHigh: currentBaseline.high,
      newHigh: newBaseline.high,
    };
  }, [pendingEdit, checkEntry, checkLog, week.weekOf]);

  // Label: "Apr 7" from YYYY-MM-DD (numeric Date constructor — no timezone drift)
  const [y, m, d] = displayDate.split("-").map(Number);
  const weekLabel = new Date(y, m - 1, d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });

  const updateColumn = (key: string, raw: string) => {
    onUpsertWeek(setWeekColumnValue(week, key, toCents(raw)));
  };

  const updateKiasPay = (raw: string) => {
    const cents = toCents(raw);
    const weekMonth = week.weekOf.slice(0, 7); // YYYY-MM
    const isHistoricalWeek = weekMonth < currentMonth();

    // If editing a historical week, show confirmation modal
    if (isHistoricalWeek && !checkEditWarningAcked) {
      const oldAmount = checkEntry?.amount ?? week.kiasPay;
      if (oldAmount !== cents) {
        setPendingEdit({ oldAmount, newAmount: cents });
        setShowConfirmModal(true);
        return;
      }
    }

    // Current month or no change — proceed normally
    onUpsertWeek({ ...week, kiasPay: cents });
    onDeleteCheckEntry(week.weekOf);
    if (cents > 0) {
      onAddCheckEntry({ weekOf: week.weekOf, amount: cents });
    }
  };

  const confirmEdit = () => {
    // istanbul ignore next — confirmEdit only callable when showConfirmModal && pendingEdit; guard is unreachable
    if (!pendingEdit) return;

    // Update or create check entry with edit history
    if (checkEntry) {
      // Existing entry - update with history
      const updatedEntry: KiasCheckEntry = {
        ...checkEntry,
        amount: pendingEdit.newAmount,
        editHistory: [
          ...(checkEntry.editHistory ?? []),
          {
            editedAt: new Date().toISOString(),
            oldAmount: pendingEdit.oldAmount,
            newAmount: pendingEdit.newAmount,
          },
        ],
      };
      onUpdateCheckEntry(updatedEntry);
    } else {
      // New entry - create with initial history
      const newEntry: KiasCheckEntry = {
        weekOf: week.weekOf,
        amount: pendingEdit.newAmount,
        editHistory: [
          {
            editedAt: new Date().toISOString(),
            oldAmount: pendingEdit.oldAmount,
            newAmount: pendingEdit.newAmount,
          },
        ],
      };
      onAddCheckEntry(newEntry);
    }

    onUpsertWeek({ ...week, kiasPay: pendingEdit.newAmount });

    if (dontShowAgain) {
      onAckCheckEditWarning();
    }

    setShowConfirmModal(false);
    setPendingEdit(null);
    setDontShowAgain(false);
  };

  const cancelEdit = () => {
    setShowConfirmModal(false);
    setPendingEdit(null);
    setDontShowAgain(false);
  };

  return (
    <div
      className={[styles.week, isExpanded ? styles.weekExpanded : ""]
        .filter(Boolean)
        .join(" ")}
    >
      {/* ── Header — always visible ─────────────────────────────────── */}
      <div
        className={styles.header}
        onClick={onToggle}
        role="button"
        tabIndex={0}
        aria-expanded={isExpanded}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onToggle();
          }
        }}
      >
        <div className={styles.headerLeft}>
          <span className={styles.chevron} aria-hidden="true">
            {isExpanded ? "▾" : "▸"}
          </span>
          <span className={styles.date}>Week of {weekLabel}</span>
        </div>

        <div className={styles.headerRight}>
          {/* Kia's Pay — editable inline. Stop propagation so click doesn't toggle. */}
          <div
            className={styles.headerField}
            onClick={(e) => e.stopPropagation()}
          >
            <span className={styles.headerFieldLabel}>Kia&apos;s Pay</span>
            <AmountInput
              value={week.kiasPay}
              onChange={updateKiasPay}
              variant="ghost"
              highlight
              disabled={readOnly}
            />
          </div>

          <span className={styles.fieldSep} aria-hidden="true" />

          {/* Remaining — derived, read-only */}
          <div className={styles.headerField}>
            <span className={styles.headerFieldLabel}>Remaining</span>
            <span
              className={[
                styles.remaining,
                styles.mono,
                remaining < 0
                  ? styles.negative
                  : remaining > 0
                    ? styles.positive
                    : styles.zero,
              ].join(" ")}
            >
              {fmtMoney(remaining)}
            </span>
          </div>
        </div>
      </div>

      {/* ── Body — visible when expanded ────────────────────────────── */}
      <div
        className={`${styles.bodyWrapper} ${isExpanded ? "" : styles.bodyCollapsed}`}
      >
        <div className={styles.body}>
          {/* Configurable columns: Storage, Rent, Jazmin, Dre, PayPal CC,
              Deductions — plus any user-added custom columns */}
          {columns.map((col) => (
            <div key={col.key} className={styles.field}>
              <span className={styles.fieldLabel}>{col.label}</span>
              <div className={styles.fieldRight}>
                <AmountInput
                  value={getWeekColumnValue(week, col.key)}
                  onChange={(raw) => updateColumn(col.key, raw)}
                  variant="ghost"
                  disabled={readOnly}
                />
              </div>
            </div>
          ))}

          {/* ── Derived group: Affirm + Savings ─────────────────────────── */}
          {/* Grouped together because they are read-only values pulled from other tabs */}
          <div className={styles.derivedGroup}>
            <div className={`${styles.field} ${styles.fieldDerived}`}>
              {onGoToAffirm ? (
                <button
                  type="button"
                  className={styles.fieldLabelLink}
                  onClick={onGoToAffirm}
                  title="Go to Affirm Plans tab"
                >
                  Affirm
                </button>
              ) : (
                <span className={styles.fieldLabel}>Affirm</span>
              )}
              <span className={`${styles.fieldValue} ${styles.mono}`}>
                {fmtMoney(affirmPerWeek)}
              </span>
            </div>

            <div className={`${styles.field} ${styles.fieldDerived}`}>
              {onGoToSavings ? (
                <button
                  type="button"
                  className={styles.fieldLabelLink}
                  onClick={onGoToSavings}
                  title="Go to Savings tab"
                >
                  Savings
                </button>
              ) : (
                <span className={styles.fieldLabel}>Savings</span>
              )}
              <span className={`${styles.fieldValue} ${styles.mono}`}>
                {savingsForWeek > 0 ? fmtMoney(savingsForWeek) : "—"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Audit Trail Confirmation Modal ──────────────────────────── */}
      {showConfirmModal && pendingEdit && (
        <Modal
          title="Edit Historical Check Amount"
          onClose={cancelEdit}
          footer={
            <>
              <button
                type="button"
                className={styles.btnGhost}
                onClick={cancelEdit}
              >
                Cancel
              </button>
              <button
                type="button"
                className={styles.btnPrimary}
                onClick={confirmEdit}
              >
                Confirm
              </button>
            </>
          }
        >
          <div className={styles.modalBody}>
            {!checkEditWarningAcked && (
              <div className={styles.warning}>
                <p>
                  <strong>Warning: </strong>
                  You&apos;re changing a check amount from a past month.
                </p>
                <p>
                  <strong>What will be saved:</strong>
                </p>
                <ul className={styles.auditList}>
                  <li>
                    The new check amount ({fmtMoney(pendingEdit.newAmount)})
                  </li>
                  <li>
                    The previous amount ({fmtMoney(pendingEdit.oldAmount)})
                  </li>
                  <li>The date and time you made this change</li>
                </ul>
                <p>
                  This history will appear as an olive dot (•) next to the week
                  in your check log.
                </p>
                <label className={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={dontShowAgain}
                    onChange={(e) => setDontShowAgain(e.target.checked)}
                  />
                  Don&apos;t show this warning again
                </label>
              </div>
            )}
            <div className={styles.changeDetails}>
              <p>
                <strong>Previous amount:</strong>{" "}
                {fmtMoney(pendingEdit.oldAmount)}
              </p>
              <p>
                <strong>New amount:</strong> {fmtMoney(pendingEdit.newAmount)}
              </p>
            </div>

            {/* Show baseline impact if there's a meaningful change */}
            {baselineImpact && (
              <div className={styles.impactSection}>
                <p className={styles.impactHeader}>
                  <strong>What else changes:</strong>
                </p>
                <div className={styles.impactGrid}>
                  <div className={styles.impactItem}>
                    <span className={styles.impactLabel}>
                      Average paycheck:
                    </span>
                    <span className={styles.impactValue}>
                      {fmtMoney(baselineImpact.currentAverage)}
                      {baselineImpact.currentAverage !==
                        baselineImpact.newAverage && (
                        <>
                          {" → "}
                          <span className={styles.impactNew}>
                            {fmtMoney(baselineImpact.newAverage)}
                          </span>
                        </>
                      )}
                    </span>
                  </div>
                  {baselineImpact.currentLow !== baselineImpact.newLow && (
                    <div className={styles.impactItem}>
                      <span className={styles.impactLabel}>Lowest week:</span>
                      <span className={styles.impactValue}>
                        {fmtMoney(baselineImpact.currentLow)}
                        {" → "}
                        <span className={styles.impactNew}>
                          {fmtMoney(baselineImpact.newLow)}
                        </span>
                      </span>
                    </div>
                  )}
                  {baselineImpact.currentHigh !== baselineImpact.newHigh && (
                    <div className={styles.impactItem}>
                      <span className={styles.impactLabel}>Highest week:</span>
                      <span className={styles.impactValue}>
                        {fmtMoney(baselineImpact.currentHigh)}
                        {" → "}
                        <span className={styles.impactNew}>
                          {fmtMoney(baselineImpact.newHigh)}
                        </span>
                      </span>
                    </div>
                  )}
                </div>
                <p className={styles.impactExplainer}>
                  Your average paycheck is used to calculate savings
                  projections.
                  {baselineImpact.currentAverage !==
                    baselineImpact.newAverage &&
                    " This change will update your 12-month savings forecast."}
                </p>
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
});
