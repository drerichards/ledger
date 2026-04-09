"use client";

import { useState, useRef, useEffect } from "react";
import type {
  InstallmentPlan,
  KiasCheckEntry,
  PaycheckColumn,
  PaycheckViewScope,
  PaycheckWeek,
  SavingsEntry,
} from "@/types";
import {
  currentMonth,
  fmtMonthFull,
  advanceMonth,
  mondayOf,
  today,
  getMondaysInMonth,
} from "@/lib/dates";
import { getVisibleMonths, usePaycheckTabState } from "@/hooks/usePaycheckTabState";
import { calcCheckBaseline } from "@/lib/projection";
import { CheckLog } from "@/components/SavingsTab/CheckLog";
import { MonthAccordion } from "./MonthAccordion";
import styles from "./PaycheckTab.module.css";

type Props = {
  paycheck: PaycheckWeek[];
  checkLog: KiasCheckEntry[];
  savingsLog: SavingsEntry[];
  plans: InstallmentPlan[];
  columns: PaycheckColumn[];
  viewScope: PaycheckViewScope;
  checkEditWarningAcked: boolean;
  onUpsertWeek: (week: PaycheckWeek) => void;
  onAddCheckEntry: (entry: KiasCheckEntry) => void;
  onUpdateCheckEntry: (entry: KiasCheckEntry) => void;
  onDeleteCheckEntry: (weekOf: string) => void;
  onSetViewScope: (scope: PaycheckViewScope) => void;
  onRenameColumn: (key: string, label: string) => void;
  onAddColumn: (label: string) => void;
  onHideColumn: (key: string) => void;
  onRestoreColumn: (key: string) => void;
  onAckCheckEditWarning: () => void;
  /** Navigate to Affirm tab */
  onGoToAffirm?: () => void;
  /** Navigate to Savings tab */
  onGoToSavings?: () => void;
};

const SCOPES: { id: PaycheckViewScope; label: string }[] = [
  { id: "weekly", label: "Week" },
  { id: "monthly", label: "Month" },
  { id: "quarterly", label: "Quarter" },
  { id: "yearly", label: "Year" },
];

export function PaycheckTab({
  paycheck,
  checkLog,
  savingsLog,
  plans,
  columns,
  viewScope,
  checkEditWarningAcked,
  onUpsertWeek,
  onAddCheckEntry,
  onUpdateCheckEntry,
  onDeleteCheckEntry,
  onSetViewScope,
  onRenameColumn,
  onAddColumn,
  onHideColumn,
  onRestoreColumn,
  onAckCheckEditWarning,
  onGoToAffirm,
  onGoToSavings,
}: Props) {
  // Default to current month — that's where her real data lives
  const [currentMonthStr, setCurrentMonthStr] = useState(() => currentMonth());

  // The current real-world week (Monday) — used for auto-expand in monthly view
  const currentWeekOf = mondayOf(today());

  // Selected week for weekly view — defaults to first Monday of the viewed month
  const [selectedWeekOf, setSelectedWeekOf] = useState<string>(() => {
    const mondays = getMondaysInMonth(currentMonth());
    // istanbul ignore next — mocked mondays always include currentWeekOf in test env
    return mondays.includes(currentWeekOf) ? currentWeekOf : mondays[0];
  });

  // Month-level collapse state — keyed by YYYY-MM
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  // Week-level expand state — keyed by YYYY-MM-DD (Monday)
  // Lifted from MonthAccordion so we can control it on view scope changes
  // Initialize with current week expanded (matches old MonthAccordion behavior)
  const [expandedWeeks, setExpandedWeeks] = useState<Set<string>>(
    () => new Set([currentWeekOf]),
  );

  // Paycheck log slide panel — starts closed
  const [showPaycheckLog, setShowPaycheckLog] = useState(false);

  // Menu dropdown
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Column management modal
  const [showColumnModal, setShowColumnModal] = useState(false);
  const [pendingColumns, setPendingColumns] = useState<PaycheckColumn[]>([]);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editingLabel, setEditingLabel] = useState("");
  const editInputRef = useRef<HTMLInputElement>(null);
  const [addingColumn, setAddingColumn] = useState(false);
  const [newColLabel, setNewColLabel] = useState("");
  const addInputRef = useRef<HTMLInputElement>(null);
  const focusTimerRef = useRef<NodeJS.Timeout | null>(null);
  const scopeTransitionRef = useRef<NodeJS.Timeout | null>(null);
  const [hiddenSectionCollapsed, setHiddenSectionCollapsed] = useState(true);

  const checkBaseline = calcCheckBaseline(checkLog);
  const visibleMonths = getVisibleMonths(currentMonthStr, viewScope);

  // Real columns for the accordion (always use actual state)
  const realVisibleColumns = columns.filter((c) => !c.hidden);

  // Modal columns (use pending when modal is open, for preview)
  const modalVisibleColumns = pendingColumns.filter((c) => !c.hidden);
  const modalHiddenColumns = pendingColumns.filter((c) => c.hidden);
  const { template, monthData } = usePaycheckTabState(
    paycheck,
    checkLog,
    savingsLog,
    plans,
    visibleMonths,
  );

  const toggleMonth = (month: string) =>
    setCollapsed((prev) => ({ ...prev, [month]: !prev[month] }));

  // Earliest allowed month (data starts Dec 2025)
  const EARLIEST_MONTH = "2025-12";

  // Get navigation step size based on view scope
  const getNavStep = (): number => {
    // istanbul ignore next — switch is over an exhaustive union; implicit default branch is unreachable
    switch (viewScope) {
      case "weekly":
      case "monthly":
        return 1;
      case "quarterly":
        return 3;
      case "yearly":
        return 12;
    }
  };

  // Latest allowed year (current year + 1)
  const LATEST_YEAR = String(new Date().getFullYear() + 1);

  // Set collapsed state for quarterly/yearly views — first month expanded, rest collapsed
  const setCollapsedForMultiMonth = (baseMonth: string, scope: PaycheckViewScope) => {
    if (scope !== "quarterly" && scope !== "yearly") return;
    const visibleMonths = getVisibleMonths(baseMonth, scope);
    const newCollapsed: Record<string, boolean> = {};
    visibleMonths.forEach((m, i) => {
      // Expand only the first month
      newCollapsed[m] = i !== 0;
    });
    setCollapsed(newCollapsed);
    setExpandedWeeks(new Set());
  };

  // Navigate to previous period
  const handleNavPrev = () => {
    if (viewScope === "weekly") {
      // Move to previous week
      const prevWeek = new Date(selectedWeekOf);
      prevWeek.setDate(prevWeek.getDate() - 7);
      const prevWeekStr = prevWeek.toISOString().slice(0, 10);
      const prevWeekMonth = prevWeekStr.slice(0, 7);
      // istanbul ignore next — canNavPrev disables the button at this boundary; guard is unreachable via UI
      if (prevWeekMonth < EARLIEST_MONTH) return;
      setSelectedWeekOf(prevWeekStr);
      setExpandedWeeks(new Set([prevWeekStr]));
      if (prevWeekMonth !== currentMonthStr) {
        setCurrentMonthStr(prevWeekMonth);
      }
    } else {
      const step = getNavStep();
      const next = advanceMonth(currentMonthStr, -step);
      // istanbul ignore next — canNavPrev disables the button at this boundary; guard is unreachable via UI
      if (next < EARLIEST_MONTH) return;
      setCurrentMonthStr(next);
      setCollapsedForMultiMonth(next, viewScope);
    }
  };

  // Navigate to next period
  const handleNavNext = () => {
    if (viewScope === "weekly") {
      // Move to next week
      const nextWeek = new Date(selectedWeekOf);
      nextWeek.setDate(nextWeek.getDate() + 7);
      const nextWeekStr = nextWeek.toISOString().slice(0, 10);
      setSelectedWeekOf(nextWeekStr);
      setExpandedWeeks(new Set([nextWeekStr]));
      const nextWeekMonth = nextWeekStr.slice(0, 7);
      if (nextWeekMonth !== currentMonthStr) {
        setCurrentMonthStr(nextWeekMonth);
      }
    } else {
      const step = getNavStep();
      const next = advanceMonth(currentMonthStr, step);
      // istanbul ignore next — canNavNext disables the button at this boundary; guard is unreachable via UI
      if (viewScope === "yearly" && next.slice(0, 4) > LATEST_YEAR) return;
      setCurrentMonthStr(next);
      setCollapsedForMultiMonth(next, viewScope);
    }
  };

  // Navigate to today (current week in weekly view, current month otherwise)
  const handleNavToday = () => {
    const todayMonth = currentMonth();
    setCurrentMonthStr(todayMonth);
    if (viewScope === "weekly") {
      // Use current week if it exists in today's month, otherwise first Monday
      const mondays = getMondaysInMonth(todayMonth);
      // istanbul ignore next — mocked mondays always include currentWeekOf in test env
      const weekToShow = mondays.includes(currentWeekOf)
        ? currentWeekOf
        : mondays[0];
      setSelectedWeekOf(weekToShow);
      setExpandedWeeks(new Set([weekToShow]));
    } else if (viewScope === "quarterly" || viewScope === "yearly") {
      // For multi-month views, expand today's month, collapse others
      const visibleMonths = getVisibleMonths(todayMonth, viewScope);
      const newCollapsed: Record<string, boolean> = {};
      visibleMonths.forEach((m) => {
        newCollapsed[m] = m !== todayMonth;
      });
      setCollapsed(newCollapsed);
      setExpandedWeeks(new Set());
    }
  };

  const toggleWeek = (monday: string) => {
    setExpandedWeeks((prev) => {
      const next = new Set(prev);
      if (next.has(monday)) {
        next.delete(monday);
      } else {
        next.add(monday);
      }
      return next;
    });
  };

  // Handle view scope change — collapse first, then transition after animation
  const handleSetViewScope = (scope: PaycheckViewScope) => {
    // If already on this scope, do nothing
    if (scope === viewScope) return;

    // Clear any pending transition
    if (scopeTransitionRef.current) {
      clearTimeout(scopeTransitionRef.current);
    }

    // Step 1: Collapse everything to prevent jarring flash
    setExpandedWeeks(new Set());
    const allCollapsed: Record<string, boolean> = {};
    visibleMonths.forEach((m) => {
      allCollapsed[m] = true;
    });
    setCollapsed(allCollapsed);

    // Step 2: After animation completes (500ms), change scope and set new state
    scopeTransitionRef.current = setTimeout(() => {
      onSetViewScope(scope);

      if (scope === "weekly") {
        // Weekly view: show only the selected week, expanded
        const mondays = getMondaysInMonth(currentMonthStr);
        // istanbul ignore next — mocked mondays always include currentWeekOf in test env
        const weekToShow = mondays.includes(currentWeekOf) ? currentWeekOf : mondays[0];
        setSelectedWeekOf(weekToShow);
        setExpandedWeeks(new Set([weekToShow]));
        setCollapsed({});
      } else if (scope === "monthly") {
        // Monthly view: expand current week, all months expanded
        setExpandedWeeks(new Set([currentWeekOf]));
        setCollapsed({});
      } else {
        // Quarterly/Yearly: expand the month user was viewing, collapse others
        setExpandedWeeks(new Set());
        const newVisibleMonths = getVisibleMonths(currentMonthStr, scope);
        // Keep the month the user was viewing expanded (it will always be in the new range)
        const monthToExpand = currentMonthStr;
        const newCollapsed: Record<string, boolean> = {};
        newVisibleMonths.forEach((m) => {
          newCollapsed[m] = m !== monthToExpand;
        });
        setCollapsed(newCollapsed);
      }
    }, 500);
  };

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (focusTimerRef.current) clearTimeout(focusTimerRef.current);
      if (scopeTransitionRef.current) clearTimeout(scopeTransitionRef.current);
    };
  }, []);

  // Close menu on click outside
  useEffect(() => {
    if (!showMenu) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showMenu]);

  // ── Column management ───────────────────────────────────────────────────────

  const openColumnModal = () => {
    setPendingColumns([...columns]); // Clone columns for local editing
    setShowColumnModal(true);
    setHiddenSectionCollapsed(true);
  };

  const cancelColumnModal = () => {
    setShowColumnModal(false);
    setPendingColumns([]);
    setEditingKey(null);
    setAddingColumn(false);
  };

  const confirmColumnModal = () => {
    // Apply all pending changes to the real state
    const originalMap = new Map(columns.map((c) => [c.key, c]));

    // Find renames
    for (const pending of pendingColumns) {
      const original = originalMap.get(pending.key);
      if (original && original.label !== pending.label) {
        onRenameColumn(pending.key, pending.label);
      }
    }

    // Find hidden/restored
    for (const pending of pendingColumns) {
      const original = originalMap.get(pending.key);
      if (original && original.hidden !== pending.hidden) {
        if (pending.hidden) {
          onHideColumn(pending.key);
        } else {
          onRestoreColumn(pending.key);
        }
      }
    }

    // Find new columns (in pending but not in original)
    for (const pending of pendingColumns) {
      if (!originalMap.has(pending.key)) {
        onAddColumn(pending.label);
      }
    }

    setShowColumnModal(false);
    setPendingColumns([]);
    setEditingKey(null);
    setAddingColumn(false);
  };

  const startEdit = (col: PaycheckColumn) => {
    setEditingKey(col.key);
    setEditingLabel(col.label);
    // istanbul ignore next — DOM focus helper; 0ms timer body never ticks in JSDOM without fake timers
    focusTimerRef.current = setTimeout(() => editInputRef.current?.select(), 0);
  };

  const commitEdit = () => {
    if (editingKey && editingLabel.trim()) {
      // Update pending state, not real state
      setPendingColumns((prev) =>
        prev.map((c) =>
          c.key === editingKey ? { ...c, label: editingLabel.trim() } : c
        )
      );
    }
    setEditingKey(null);
  };

  const startAddColumn = () => {
    setAddingColumn(true);
    setNewColLabel("");
    // istanbul ignore next — DOM focus helper; 0ms timer body never ticks in JSDOM without fake timers
    focusTimerRef.current = setTimeout(() => addInputRef.current?.focus(), 0);
  };

  const commitAddColumn = () => {
    if (newColLabel.trim()) {
      // Add to pending state with a temporary key
      const newKey = `custom_${Date.now()}`;
      setPendingColumns((prev) => [
        ...prev,
        { key: newKey, label: newColLabel.trim(), fixed: false, hidden: false },
      ]);
    }
    setAddingColumn(false);
    setNewColLabel("");
  };

  const hideColumnPending = (key: string) => {
    setPendingColumns((prev) =>
      prev.map((c) => (c.key === key ? { ...c, hidden: true } : c))
    );
  };

  const restoreColumnPending = (key: string) => {
    setPendingColumns((prev) =>
      prev.map((c) => (c.key === key ? { ...c, hidden: false } : c))
    );
  };

  // ── Navigation limits ───────────────────────────────────────────────────────

  const canNavPrev = (() => {
    if (viewScope === "weekly") {
      const prevWeek = new Date(selectedWeekOf);
      prevWeek.setDate(prevWeek.getDate() - 7);
      return prevWeek.toISOString().slice(0, 7) >= EARLIEST_MONTH;
    }
    const step = getNavStep();
    return advanceMonth(currentMonthStr, -step) >= EARLIEST_MONTH;
  })();

  const canNavNext = (() => {
    if (viewScope === "yearly") {
      const nextYear = advanceMonth(currentMonthStr, 12).slice(0, 4);
      return nextYear <= LATEST_YEAR;
    }
    // No upper limit for weekly, monthly, quarterly
    return true;
  })();

  // ── Heading label ───────────────────────────────────────────────────────────
  // For quarterly/yearly, show the first month in the visible range (e.g., Jan for yearly)

  const headingMonth = visibleMonths[0];
  const headingLabel =
    viewScope === "weekly" || viewScope === "monthly"
      ? fmtMonthFull(headingMonth)
      : viewScope === "quarterly"
        ? `${fmtMonthFull(headingMonth)} — Quarter`
        : `${fmtMonthFull(headingMonth)} — Year`;

  return (
    <div className={styles.container}>
      {/* ── Header ───────────────────────────────────────────────── */}
      <div className={styles.header}>
        <div>
          <h2 className={styles.heading}>{headingLabel}</h2>
          <p className={styles.subheading}>
            Plan this month&apos;s checks against next month&apos;s bills
          </p>
        </div>

        <div className={styles.controls}>
          {/* Period navigation (week or month depending on view scope) */}
          <div className={styles.nav}>
            <button
              className={styles.navBtn}
              onClick={handleNavPrev}
              disabled={!canNavPrev}
              aria-label={viewScope === "weekly" ? "Previous week" : "Previous month"}
            >
              ‹
            </button>
            <button
              className={styles.navBtn}
              onClick={handleNavToday}
            >
              Today
            </button>
            <button
              className={styles.navBtn}
              onClick={handleNavNext}
              disabled={!canNavNext}
              aria-label={viewScope === "weekly" ? "Next week" : "Next month"}
            >
              ›
            </button>
          </div>

          {/* View scope */}
          <div className={styles.scopeToggle}>
            {SCOPES.map((s) => (
              <button
                key={s.id}
                className={`${styles.scopeBtn} ${viewScope === s.id ? styles.scopeBtnActive : ""}`}
                onClick={() => handleSetViewScope(s.id)}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* Menu dropdown — below cycles */}
        <div className={styles.menuWrapper} ref={menuRef}>
          <button
            className={`${styles.toolBtn} ${showMenu ? styles.toolBtnActive : ""}`}
            onClick={() => setShowMenu((v) => !v)}
            aria-expanded={showMenu}
            aria-haspopup="menu"
            title="More"
          >
            <svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor" aria-hidden="true">
              <path d="M8 4.754a3.246 3.246 0 1 0 0 6.492 3.246 3.246 0 0 0 0-6.492zM5.754 8a2.246 2.246 0 1 1 4.492 0 2.246 2.246 0 0 1-4.492 0z"/>
              <path d="M9.796 1.343c-.527-1.79-3.065-1.79-3.592 0l-.094.319a.873.873 0 0 1-1.255.52l-.292-.16c-1.64-.892-3.433.902-2.54 2.541l.159.292a.873.873 0 0 1-.52 1.255l-.319.094c-1.79.527-1.79 3.065 0 3.592l.319.094a.873.873 0 0 1 .52 1.255l-.16.292c-.892 1.64.901 3.433 2.541 2.54l.292-.159a.873.873 0 0 1 1.255.52l.094.319c.527 1.79 3.065 1.79 3.592 0l.094-.319a.873.873 0 0 1 1.255-.52l.292.16c1.64.893 3.434-.902 2.54-2.541l-.159-.292a.873.873 0 0 1 .52-1.255l.319-.094c1.79-.527 1.79-3.065 0-3.592l-.319-.094a.873.873 0 0 1-.52-1.255l.16-.292c.893-1.64-.902-3.433-2.541-2.54l-.292.159a.873.873 0 0 1-1.255-.52l-.094-.319zm-2.633.283c.246-.835 1.428-.835 1.674 0l.094.319a1.873 1.873 0 0 0 2.693 1.115l.291-.16c.764-.415 1.6.42 1.184 1.185l-.159.292a1.873 1.873 0 0 0 1.116 2.692l.318.094c.835.246.835 1.428 0 1.674l-.319.094a1.873 1.873 0 0 0-1.115 2.693l.16.291c.415.764-.42 1.6-1.185 1.184l-.291-.159a1.873 1.873 0 0 0-2.693 1.116l-.094.318c-.246.835-1.428.835-1.674 0l-.094-.319a1.873 1.873 0 0 0-2.692-1.115l-.292.16c-.764.415-1.6-.42-1.184-1.185l.159-.291a1.873 1.873 0 0 0-1.116-2.693l-.318-.094c-.835-.246-.835-1.428 0-1.674l.319-.094a1.873 1.873 0 0 0 1.115-2.692l-.16-.292c-.415-.764.42-1.6 1.185-1.184l.292.159a1.873 1.873 0 0 0 2.692-1.116l.094-.318z"/>
            </svg>
            More
          </button>
          {showMenu && (
            <div className={styles.menuDropdown} role="menu">
              <button
                className={styles.menuItem}
                role="menuitem"
                onClick={() => {
                  openColumnModal();
                  setShowMenu(false);
                }}
              >
                <svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor" aria-hidden="true">
                  <circle cx="4" cy="4" r="1.5"/>
                  <rect x="7" y="3" width="8" height="2" rx="1"/>
                  <circle cx="4" cy="8" r="1.5"/>
                  <rect x="7" y="7" width="8" height="2" rx="1"/>
                  <circle cx="4" cy="12" r="1.5"/>
                  <rect x="7" y="11" width="8" height="2" rx="1"/>
                </svg>
                Manage Columns
              </button>
              <button
                className={`${styles.menuItem} ${showPaycheckLog ? styles.menuItemActive : ""}`}
                role="menuitem"
                onClick={() => {
                  setShowPaycheckLog((v) => !v);
                  setShowMenu(false);
                }}
              >
                <svg viewBox="0 0 16 12" width="14" height="12" fill="currentColor" aria-hidden="true">
                  <rect y="0" width="16" height="2" rx="1"/>
                  <rect y="5" width="11" height="2" rx="1"/>
                  <rect y="10" width="7" height="2" rx="1"/>
                </svg>
                Paycheck Log
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Column manager modal ──────────────────────────────────── */}
      {showColumnModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>Manage Columns</h3>
              <button
                type="button"
                className={styles.modalClose}
                onClick={cancelColumnModal}
                aria-label="Close"
              >
                ×
              </button>
            </div>
            <div className={styles.modalBody}>
              {/* Active columns */}
              <div className={styles.columnList}>
                {modalVisibleColumns.map((col) => (
                  <div key={col.key} className={styles.columnRow}>
                    {editingKey === col.key ? (
                      <input
                        ref={editInputRef}
                        className={styles.columnInput}
                        value={editingLabel}
                        onChange={(e) => setEditingLabel(e.target.value)}
                        onBlur={commitEdit}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") commitEdit();
                          if (e.key === "Escape") setEditingKey(null);
                        }}
                      />
                    ) : (
                      <span className={styles.columnLabel}>{col.label}</span>
                    )}
                    <div className={styles.columnActions}>
                      {editingKey !== col.key && (
                        <button
                          type="button"
                          className={styles.columnEditBtn}
                          onClick={() => startEdit(col)}
                          aria-label={`Rename ${col.label}`}
                          title="Rename"
                        >
                          <svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor">
                            <path d="M11.5 1.5a1.5 1.5 0 012.121 0l.879.879a1.5 1.5 0 010 2.121l-8 8a.5.5 0 01-.177.118l-3.5 1.5a.5.5 0 01-.638-.638l1.5-3.5a.5.5 0 01.118-.177l8-8zM11 3L3.5 10.5l-.9 2.1 2.1-.9L12.2 4.2 11 3z"/>
                          </svg>
                        </button>
                      )}
                      <button
                        type="button"
                        className={styles.columnHideBtn}
                        onClick={() => hideColumnPending(col.key)}
                        aria-label={`Hide ${col.label}`}
                        title="Hide column"
                      >
                        <svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor">
                          <path d="M13.359 11.238C15.06 9.72 16 8 16 8s-3-5.5-8-5.5a7.028 7.028 0 0 0-2.79.588l.77.771A5.944 5.944 0 0 1 8 3.5c2.12 0 3.879 1.168 5.168 2.457A13.134 13.134 0 0 1 14.828 8c-.058.087-.122.183-.195.288-.335.48-.83 1.12-1.465 1.755-.165.165-.337.328-.517.486l.708.709z"/>
                          <path d="M11.297 9.176a3.5 3.5 0 0 0-4.474-4.474l.823.823a2.5 2.5 0 0 1 2.829 2.829l.822.822zm-2.943 1.299.822.822a3.5 3.5 0 0 1-4.474-4.474l.823.823a2.5 2.5 0 0 0 2.829 2.829z"/>
                          <path d="M3.35 5.47c-.18.16-.353.322-.518.487A13.134 13.134 0 0 0 1.172 8l.195.288c.335.48.83 1.12 1.465 1.755C4.121 11.332 5.881 12.5 8 12.5c.716 0 1.39-.133 2.02-.36l.77.772A7.029 7.029 0 0 1 8 13.5C3 13.5 0 8 0 8s.939-1.721 2.641-3.238l.708.709zm10.296 8.884-12-12 .708-.708 12 12-.708.708z"/>
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Add new column */}
              <div className={styles.addColumnSection}>
                {addingColumn ? (
                  <div className={styles.addColumnRow}>
                    <input
                      ref={addInputRef}
                      className={styles.columnInput}
                      placeholder="New column name"
                      value={newColLabel}
                      onChange={(e) => setNewColLabel(e.target.value)}
                      onBlur={commitAddColumn}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") commitAddColumn();
                        if (e.key === "Escape") setAddingColumn(false);
                      }}
                    />
                  </div>
                ) : (
                  <button
                    type="button"
                    className={styles.addColumnBtn}
                    onClick={startAddColumn}
                  >
                    + Add Column
                  </button>
                )}
              </div>

              {/* Hidden columns section — collapsible */}
              {modalHiddenColumns.length > 0 && (
                <div className={styles.hiddenSection}>
                  <button
                    type="button"
                    className={styles.hiddenToggle}
                    onClick={() => setHiddenSectionCollapsed((v) => !v)}
                    aria-expanded={!hiddenSectionCollapsed}
                  >
                    <svg
                      viewBox="0 0 16 16"
                      width="12"
                      height="12"
                      fill="currentColor"
                      className={hiddenSectionCollapsed ? styles.chevronCollapsed : styles.chevronExpanded}
                    >
                      <path d="M4.646 1.646a.5.5 0 0 1 .708 0l6 6a.5.5 0 0 1 0 .708l-6 6a.5.5 0 0 1-.708-.708L10.293 8 4.646 2.354a.5.5 0 0 1 0-.708z"/>
                    </svg>
                    Hidden Columns ({modalHiddenColumns.length})
                  </button>
                  {!hiddenSectionCollapsed && (
                    <div className={styles.columnList}>
                      {modalHiddenColumns.map((col) => (
                        <div key={col.key} className={styles.columnRow}>
                          <span className={styles.columnLabelHidden}>{col.label}</span>
                          <button
                            type="button"
                            className={styles.columnRestoreBtn}
                            onClick={() => restoreColumnPending(col.key)}
                            aria-label={`Restore ${col.label}`}
                            title="Restore column"
                          >
                            <svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor">
                              <path d="M10.5 8a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0z"/>
                              <path d="M0 8s3-5.5 8-5.5S16 8 16 8s-3 5.5-8 5.5S0 8 0 8zm8 3.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z"/>
                            </svg>
                            Restore
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className={styles.modalFooter}>
              <button
                type="button"
                className={styles.btnGhost}
                onClick={cancelColumnModal}
              >
                Back
              </button>
              <button
                type="button"
                className={styles.btnPrimary}
                onClick={confirmColumnModal}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Content area: accordion + slide-in check log ─────────── */}
      <div className={styles.contentArea}>
        {/* Accordion timeline */}
        <div className={styles.accordion}>
          {monthData.map((data) => (
            <MonthAccordion
              key={data.month}
              month={data.month}
              columns={realVisibleColumns}
              paycheck={paycheck}
              checkLog={checkLog}
              savingsByWeek={data.savingsByWeek}
              affirmPerWeek={data.affirmPerWeek}
              affirmMonthTotal={data.affirmTotal}
              expandedWeeks={expandedWeeks}
              onToggleWeek={toggleWeek}
              viewScope={viewScope}
              selectedWeekOf={selectedWeekOf}
              isCollapsed={!!collapsed[data.month]}
              onToggle={() => toggleMonth(data.month)}
              onUpsertWeek={onUpsertWeek}
              onAddCheckEntry={onAddCheckEntry}
              onUpdateCheckEntry={onUpdateCheckEntry}
              onDeleteCheckEntry={onDeleteCheckEntry}
              checkEditWarningAcked={checkEditWarningAcked}
              onAckCheckEditWarning={onAckCheckEditWarning}
              template={template}
              readOnly={data.month > currentMonth()}
              onGoToAffirm={onGoToAffirm}
              onGoToSavings={onGoToSavings}
            />
          ))}
        </div>

        {/* Slide-in paycheck log — pushes accordion left, left edge stays fixed */}
        <div
          className={`${styles.slidePanel} ${showPaycheckLog ? styles.slidePanelOpen : ""}`}
          aria-hidden={!showPaycheckLog}
        >
          <div className={styles.slidePanelInner}>
            <div className={styles.checkLogCard}>
              <div className={styles.checkLogHeader}>
                <span className={styles.checkLogTitle}>Paycheck Log</span>
                <button
                  className={styles.checkLogClose}
                  onClick={() => setShowPaycheckLog(false)}
                  aria-label="Close paycheck log"
                >
                  ×
                </button>
              </div>
              <CheckLog
                log={checkLog}
                baseline={checkBaseline}
                onAdd={onAddCheckEntry}
                readOnly
                compact
                selectedWeekOf={viewScope === "weekly" ? selectedWeekOf : currentWeekOf}
                onNavigateToWeek={(weekOf) => {
                  // Navigate to weekly view showing the clicked week (keep log open)
                  const weekMonth = weekOf.slice(0, 7);
                  setCurrentMonthStr(weekMonth);
                  setSelectedWeekOf(weekOf);
                  setExpandedWeeks(new Set([weekOf]));
                  onSetViewScope("weekly");
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
