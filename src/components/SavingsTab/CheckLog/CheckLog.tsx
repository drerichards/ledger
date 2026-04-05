"use client";

import { useState } from "react";
import type { KiasCheckEntry, CheckEditHistoryEntry } from "@/types";
import type { CheckBaseline } from "@/lib/projection";
import { fmtMoney, toCents } from "@/lib/money";
import { getMondaysUpToMonth, mondayOf, currentMonth } from "@/lib/dates";
import { Stat } from "@/components/ui/Stat/Stat";
import styles from "./CheckLog.module.css";

// TODO: Replace inline popover with shadcn popover component when added

// Earliest month to show in check log (data starts Dec 2025)
const EARLIEST_MONTH = "2025-12";

type Props = {
  log: KiasCheckEntry[];
  baseline: CheckBaseline | null;
  /** YYYY-MM — the operating month ceiling for which weeks to display. */
  upToMonth?: string;
  onAdd: (entry: KiasCheckEntry) => void;
  /** No longer used — kept in signature for backward compat. */
  onDelete?: (weekOf: string) => void;
  /** Read-only mode: no editing, clicking navigates instead */
  readOnly?: boolean;
  /** Compact mode: smaller fonts for tight spaces */
  compact?: boolean;
  /** Callback when a week row is clicked in readOnly mode */
  onNavigateToWeek?: (weekOf: string) => void;
  /** The currently selected/visible week in the accordion — highlights this row */
  selectedWeekOf?: string;
};

/** Determine if a week belongs to a closed (historical) month */
function isHistoricalWeek(weekDate: string): boolean {
  const weekMonth = weekDate.slice(0, 7);
  return weekMonth < currentMonth();
}

/** Group weeks by year for collapsible sections */
type YearGroup = {
  year: string;
  weeks: string[];
};

function groupByYear(mondays: string[]): YearGroup[] {
  const groups: YearGroup[] = [];
  let currentGroup: YearGroup | null = null;

  for (const date of mondays) {
    const year = date.slice(0, 4);
    if (!currentGroup || currentGroup.year !== year) {
      currentGroup = { year, weeks: [] };
      groups.push(currentGroup);
    }
    currentGroup.weeks.push(date);
  }

  return groups;
}

/**
 * Kia's Check Log — Monday-keyed edition.
 *
 * Pre-loads every Monday (week start) from EARLIEST_MONTH through `upToMonth`.
 * Weeks are grouped by year with collapsible sections.
 *
 * weekOf normalization: all stored entries are normalized to Monday via
 * mondayOf() at read time, so legacy Friday-keyed entries are matched
 * correctly. New entries are written as Monday keys (the row date itself).
 *
 * Data contract: ADD_CHECK_ENTRY is an upsert keyed by weekOf (Monday date).
 */
export function CheckLog({
  log,
  baseline,
  upToMonth,
  onAdd,
  readOnly = false,
  compact = false,
  onNavigateToWeek,
  selectedWeekOf,
}: Props) {
  const ceiling = upToMonth ?? currentMonth();

  // Pre-load all Mondays in the display range (from EARLIEST_MONTH), newest first.
  const allMondays = getMondaysUpToMonth(ceiling, EARLIEST_MONTH);

  // Group by year for collapsible sections
  const yearGroups = groupByYear(allMondays);

  // Build a lookup map: normalized Monday → stored entry (for amount + history).
  // mondayOf() handles both Monday-keyed (accordion) and Friday-keyed
  // (legacy) entries — both map to the same canonical Monday key.
  const entryByDate = new Map<string, KiasCheckEntry>(
    log.map((e) => [mondayOf(e.weekOf), e]),
  );

  // Track collapsed years (all start expanded except older years)
  const [collapsedYears, setCollapsedYears] = useState<Set<string>>(() => {
    // Current year expanded, older years collapsed by default
    const currentYear = ceiling.slice(0, 4);
    const collapsed = new Set<string>();
    for (const group of yearGroups) {
      if (group.year !== currentYear) {
        collapsed.add(group.year);
      }
    }
    return collapsed;
  });

  // Track which row is actively being edited + its draft string value
  const [editingDate, setEditingDate] = useState<string | null>(null);
  const [draftValue, setDraftValue] = useState("");

  // Track which entry's edit history popover is open
  const [showHistoryFor, setShowHistoryFor] = useState<string | null>(null);

  // Historical edit confirmation modal state
  const [confirmingEdit, setConfirmingEdit] = useState<{
    date: string;
    oldAmount: number;
    newAmount: number;
  } | null>(null);

  const toggleYear = (year: string) => {
    setCollapsedYears((prev) => {
      const next = new Set(prev);
      if (next.has(year)) {
        next.delete(year);
      } else {
        next.add(year);
      }
      return next;
    });
  };

  const startEdit = (date: string) => {
    const entry = entryByDate.get(date);
    setEditingDate(date);
    setDraftValue(entry ? (entry.amount / 100).toFixed(2) : "");
  };

  const commitEdit = (date: string) => {
    const cents = toCents(draftValue);
    const existingEntry = entryByDate.get(date);
    const oldAmount = existingEntry?.amount ?? 0;

    // If editing a historical week and amount changed, show confirmation modal
    if (isHistoricalWeek(date) && cents !== oldAmount && oldAmount > 0) {
      setConfirmingEdit({ date, oldAmount, newAmount: cents });
      return; // Don't commit yet — wait for confirmation
    }

    // Current month or new entry: commit immediately
    if (cents > 0) {
      onAdd({ weekOf: date, amount: cents });
    }
    setEditingDate(null);
    setDraftValue("");
  };

  const confirmHistoricalEdit = () => {
    if (!confirmingEdit) return;

    const { date, oldAmount, newAmount } = confirmingEdit;
    const existingEntry = entryByDate.get(date);

    // Build the new edit history entry
    const historyEntry: CheckEditHistoryEntry = {
      editedAt: new Date().toISOString(),
      oldAmount,
      newAmount,
    };

    // Append to existing history or create new array
    const editHistory = [
      ...(existingEntry?.editHistory ?? []),
      historyEntry,
    ];

    // Commit with history
    onAdd({ weekOf: date, amount: newAmount, editHistory });

    setConfirmingEdit(null);
    setEditingDate(null);
    setDraftValue("");
  };

  const cancelHistoricalEdit = () => {
    setConfirmingEdit(null);
    // Keep editing so user can adjust the value
  };

  const cancelEdit = () => {
    setEditingDate(null);
    setDraftValue("");
    setConfirmingEdit(null);
  };

  return (
    <div className={styles.panel}>
      {/* ── Baseline stats ─────────────────────────────────────────── */}
      {baseline && (
        <div className={styles.baselineRow}>
          <div className={styles.baselineLeft}>
            <Stat label="Average" value={fmtMoney(baseline.average)} compact={compact} />
            <Stat label="Low" value={fmtMoney(baseline.low)} compact={compact} />
            <Stat label="High" value={fmtMoney(baseline.high)} compact={compact} />
          </div>
          <div className={styles.baselineRight}>
            <Stat label="Samples" value={String(baseline.sampleSize)} compact={compact} />
          </div>
        </div>
      )}

      {/* ── Week rows grouped by year ────────────────────────────── */}
      <div className={styles.rowList}>
        {yearGroups.map((group) => {
          const isCollapsed = collapsedYears.has(group.year);

          return (
            <div key={group.year} className={styles.yearSection}>
              {/* Year header — clickable to collapse/expand */}
              <button
                type="button"
                className={styles.yearHeader}
                onClick={() => toggleYear(group.year)}
                aria-expanded={!isCollapsed}
              >
                <span
                  className={
                    isCollapsed ? styles.chevronCollapsed : styles.chevronExpanded
                  }
                >
                  ›
                </span>
                <span className={styles.yearLabel}>{group.year}</span>
                <span className={styles.weekCount}>
                  {group.weeks.length} week{group.weeks.length !== 1 ? "s" : ""}
                </span>
              </button>

              {/* Week rows — hidden when collapsed */}
              {!isCollapsed &&
                group.weeks.map((date) => {
                  const entry = entryByDate.get(date);
                  const storedCents = entry?.amount ?? 0;
                  const hasEditHistory = (entry?.editHistory?.length ?? 0) > 0;
                  const isEditing = editingDate === date;

                  // Format: "Week of Apr 7" — numeric Date constructor, no TZ drift
                  const [y, m, d] = date.split("-").map(Number);
                  const weekLabel = new Date(y, m - 1, d).toLocaleDateString(
                    "en-US",
                    { month: "short", day: "numeric" }
                  );

                  const handleRowClick = () => {
                    if (readOnly && onNavigateToWeek) {
                      onNavigateToWeek(date);
                    } else if (!readOnly && !isEditing) {
                      startEdit(date);
                    }
                  };

                  return (
                    <div
                      key={date}
                      className={`${styles.row} ${storedCents > 0 ? styles.rowFilled : ""} ${readOnly ? styles.rowReadOnly : ""} ${selectedWeekOf === date ? styles.rowSelected : ""}`}
                      onClick={handleRowClick}
                    >
                      <span className={styles.dateLabel}>
                        Week of {weekLabel}
                        {hasEditHistory && (
                          <button
                            type="button"
                            className={styles.editIndicator}
                            onClick={(e) => {
                              e.stopPropagation();
                              setShowHistoryFor(showHistoryFor === date ? null : date);
                            }}
                            title="View edit history"
                          >
                            •
                          </button>
                        )}
                        {/* TODO: Replace with shadcn popover */}
                        {showHistoryFor === date && entry?.editHistory && (
                          <>
                            <div
                              className={styles.popoverBackdrop}
                              onClick={(e) => {
                                e.stopPropagation();
                                setShowHistoryFor(null);
                              }}
                            />
                            <div className={styles.historyPopover}>
                              <div className={styles.historyHeader}>Last Edit</div>
                              {(() => {
                                const lastEdit = entry.editHistory[entry.editHistory.length - 1];
                                return (
                                  <div className={styles.historyEntry}>
                                    <div className={styles.historyDate}>
                                      {new Date(lastEdit.editedAt).toLocaleDateString("en-US", {
                                        month: "short",
                                        day: "numeric",
                                        year: "numeric",
                                        hour: "numeric",
                                        minute: "2-digit",
                                      })}
                                    </div>
                                    <div className={styles.historyChange}>
                                      {fmtMoney(lastEdit.oldAmount)} → {fmtMoney(lastEdit.newAmount)}
                                    </div>
                                  </div>
                                );
                              })()}
                              {entry.editHistory.length > 1 && (
                                <button
                                  type="button"
                                  className={styles.viewAllLink}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    // TODO: Navigate to Activity tab filtered to this week
                                    setShowHistoryFor(null);
                                  }}
                                >
                                  View all {entry.editHistory.length} edits in Activity →
                                </button>
                              )}
                            </div>
                          </>
                        )}
                      </span>

                      {!readOnly && isEditing ? (
                        <div className={styles.editControls}>
                          <input
                            className={styles.amountInput}
                            type="text"
                            inputMode="decimal"
                            value={draftValue}
                            placeholder="0.00"
                            autoFocus
                            onChange={(e) => setDraftValue(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") commitEdit(date);
                              if (e.key === "Escape") cancelEdit();
                            }}
                            onClick={(e) => e.stopPropagation()}
                          />
                          <button
                            type="button"
                            className={styles.btnConfirm}
                            onClick={(e) => {
                              e.stopPropagation();
                              commitEdit(date);
                            }}
                            title="Save"
                          >
                            ✓
                          </button>
                          <button
                            type="button"
                            className={styles.btnCancel}
                            onClick={(e) => {
                              e.stopPropagation();
                              cancelEdit();
                            }}
                            title="Cancel"
                          >
                            ✕
                          </button>
                        </div>
                      ) : (
                        <span
                          className={
                            storedCents > 0
                              ? styles.amountFilled
                              : styles.amountEmpty
                          }
                        >
                          {storedCents > 0 ? fmtMoney(storedCents) : "—"}
                        </span>
                      )}
                    </div>
                  );
                })}
            </div>
          );
        })}
      </div>

      {/* ── Historical edit confirmation modal ────────────────────── */}
      {confirmingEdit && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <h3 className={styles.modalTitle}>Edit Historical Entry?</h3>
            <p className={styles.modalBody}>
              This check is from a closed month. Editing it will create an audit
              trail showing the change.
            </p>
            <div className={styles.modalChange}>
              <span className={styles.modalChangeOld}>
                {fmtMoney(confirmingEdit.oldAmount)}
              </span>
              <span className={styles.modalChangeArrow}>→</span>
              <span className={styles.modalChangeNew}>
                {fmtMoney(confirmingEdit.newAmount)}
              </span>
            </div>
            <div className={styles.modalActions}>
              <button
                type="button"
                className={styles.btnGhost}
                onClick={cancelHistoricalEdit}
              >
                Cancel
              </button>
              <button
                type="button"
                className={styles.btnPrimary}
                onClick={confirmHistoricalEdit}
              >
                Confirm Edit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
