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
  onUpsertWeek: (week: PaycheckWeek) => void;
  onAddCheckEntry: (entry: KiasCheckEntry) => void;
  onDeleteCheckEntry: (weekOf: string) => void;
  onSetViewScope: (scope: PaycheckViewScope) => void;
  onRenameColumn: (key: string, label: string) => void;
  onAddColumn: (label: string) => void;
  onDeleteColumn: (key: string) => void;
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
  onUpsertWeek,
  onAddCheckEntry,
  onDeleteCheckEntry,
  onSetViewScope,
  onRenameColumn,
  onAddColumn,
  onDeleteColumn,
}: Props) {
  // Default to current month — that's where her real data lives
  const [currentMonthStr, setCurrentMonthStr] = useState(() => currentMonth());

  // Month-level collapse state — keyed by YYYY-MM
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  // Check log slide panel — starts closed
  const [showCheckLog, setShowCheckLog] = useState(false);

  // Column management panel
  const [showColumnMgr, setShowColumnMgr] = useState(false);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editingLabel, setEditingLabel] = useState("");
  const editInputRef = useRef<HTMLInputElement>(null);
  const [addingColumn, setAddingColumn] = useState(false);
  const [newColLabel, setNewColLabel] = useState("");
  const addInputRef = useRef<HTMLInputElement>(null);
  const focusTimerRef = useRef<NodeJS.Timeout | null>(null);

  // The current real-world week (Monday) — drives auto-expand in MonthAccordion
  const currentWeekOf = mondayOf(today());

  const checkBaseline = calcCheckBaseline(checkLog);
  const visibleMonths = getVisibleMonths(currentMonthStr, viewScope);
  const { template, monthData } = usePaycheckTabState(
    paycheck,
    checkLog,
    savingsLog,
    plans,
    visibleMonths,
  );

  const toggleMonth = (month: string) =>
    setCollapsed((prev) => ({ ...prev, [month]: !prev[month] }));

  // Cleanup focus timers on unmount
  useEffect(() => {
    return () => {
      if (focusTimerRef.current) clearTimeout(focusTimerRef.current);
    };
  }, []);

  // ── Column management ───────────────────────────────────────────────────────

  const startEdit = (col: PaycheckColumn) => {
    setEditingKey(col.key);
    setEditingLabel(col.label);
    focusTimerRef.current = setTimeout(() => editInputRef.current?.select(), 0);
  };

  const commitEdit = () => {
    if (editingKey && editingLabel.trim()) {
      onRenameColumn(editingKey, editingLabel.trim());
    }
    setEditingKey(null);
  };

  const startAddColumn = () => {
    setAddingColumn(true);
    setNewColLabel("");
    focusTimerRef.current = setTimeout(() => addInputRef.current?.focus(), 0);
  };

  const commitAddColumn = () => {
    if (newColLabel.trim()) onAddColumn(newColLabel.trim());
    setAddingColumn(false);
    setNewColLabel("");
  };

  // ── Heading label ───────────────────────────────────────────────────────────

  const headingLabel =
    viewScope === "weekly" || viewScope === "monthly"
      ? fmtMonthFull(currentMonthStr)
      : viewScope === "quarterly"
        ? `${fmtMonthFull(currentMonthStr)} — Quarter`
        : `${fmtMonthFull(currentMonthStr)} — Year`;

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
          {/* Month navigation */}
          <div className={styles.nav}>
            <button
              className={styles.navBtn}
              onClick={() => setCurrentMonthStr((m) => advanceMonth(m, -1))}
              aria-label="Previous month"
            >
              ‹
            </button>
            <button
              className={styles.navBtn}
              onClick={() => setCurrentMonthStr(currentMonth())}
            >
              Today
            </button>
            <button
              className={styles.navBtn}
              onClick={() => setCurrentMonthStr((m) => advanceMonth(m, 1))}
              aria-label="Next month"
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
                onClick={() => onSetViewScope(s.id)}
              >
                {s.label}
              </button>
            ))}
          </div>

          {/* Column manager toggle */}
          <button
            className={`${styles.toolBtn} ${showColumnMgr ? styles.toolBtnActive : ""}`}
            onClick={() => setShowColumnMgr((v) => !v)}
            aria-expanded={showColumnMgr}
            title="Manage columns"
          >
            <svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor" aria-hidden="true">
              <circle cx="4" cy="4" r="1.5"/>
              <rect x="7" y="3" width="8" height="2" rx="1"/>
              <circle cx="4" cy="8" r="1.5"/>
              <rect x="7" y="7" width="8" height="2" rx="1"/>
              <circle cx="4" cy="12" r="1.5"/>
              <rect x="7" y="11" width="8" height="2" rx="1"/>
            </svg>
            Columns
          </button>

          {/* Check log toggle */}
          <button
            className={`${styles.toolBtn} ${showCheckLog ? styles.toolBtnActive : ""}`}
            onClick={() => setShowCheckLog((v) => !v)}
            aria-expanded={showCheckLog}
            title="Kia's Check Log"
          >
            <svg viewBox="0 0 16 12" width="16" height="12" fill="currentColor" aria-hidden="true">
              <rect y="0" width="16" height="2" rx="1"/>
              <rect y="5" width="11" height="2" rx="1"/>
              <rect y="10" width="7" height="2" rx="1"/>
            </svg>
            Check Log
          </button>
        </div>
      </div>

      {/* ── Column manager panel ──────────────────────────────────── */}
      {showColumnMgr && (
        <div className={styles.colMgrPanel}>
          <span className={styles.colMgrHint}>
            Click a label to rename. × removes custom columns.
          </span>
          <div className={styles.colPills}>
            {columns.map((col) => (
              <div
                key={col.key}
                className={`${styles.colPill} ${!col.fixed ? styles.colPillCustom : ""}`}
              >
                {editingKey === col.key ? (
                  <input
                    ref={editInputRef}
                    className={styles.colPillInput}
                    value={editingLabel}
                    onChange={(e) => setEditingLabel(e.target.value)}
                    onBlur={commitEdit}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") commitEdit();
                      if (e.key === "Escape") setEditingKey(null);
                    }}
                  />
                ) : (
                  <span
                    className={styles.colPillLabel}
                    onClick={() => startEdit(col)}
                    title="Click to rename"
                  >
                    {col.label}
                  </span>
                )}
                {!col.fixed && editingKey !== col.key && (
                  <button
                    type="button"
                    className={styles.colPillDelete}
                    onClick={() => onDeleteColumn(col.key)}
                    aria-label={`Delete ${col.label} column`}
                  >
                    ×
                  </button>
                )}
              </div>
            ))}

            {addingColumn ? (
              <div className={styles.colPill}>
                <input
                  ref={addInputRef}
                  className={styles.colPillInput}
                  placeholder="Column name"
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
                className={styles.addColPillBtn}
                onClick={startAddColumn}
              >
                + Add column
              </button>
            )}
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
              columns={columns}
              paycheck={paycheck}
              checkLog={checkLog}
              savingsByWeek={data.savingsByWeek}
              affirmPerWeek={data.affirmPerWeek}
              affirmMonthTotal={data.affirmTotal}
              currentWeekOf={currentWeekOf}
              isCollapsed={!!collapsed[data.month]}
              onToggle={() => toggleMonth(data.month)}
              onUpsertWeek={onUpsertWeek}
              onAddCheckEntry={onAddCheckEntry}
              onDeleteCheckEntry={onDeleteCheckEntry}
              template={template}
            />
          ))}
        </div>

        {/* Slide-in check log — pushes accordion left, left edge stays fixed */}
        <div
          className={`${styles.slidePanel} ${showCheckLog ? styles.slidePanelOpen : ""}`}
          aria-hidden={!showCheckLog}
        >
          <div className={styles.slidePanelInner}>
            <div className={styles.checkLogCard}>
              <div className={styles.checkLogHeader}>
                <span className={styles.checkLogTitle}>Kia&apos;s Check Log</span>
                <button
                  className={styles.checkLogClose}
                  onClick={() => setShowCheckLog(false)}
                  aria-label="Close check log"
                >
                  ×
                </button>
              </div>
              <CheckLog
                log={checkLog}
                baseline={checkBaseline}
                upToMonth={currentMonthStr}
                onAdd={onAddCheckEntry}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
