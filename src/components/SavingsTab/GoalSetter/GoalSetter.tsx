"use client";

import { useState } from "react";
import type { SavingsGoal, SavingsEntry } from "@/types";
import { fmtMoney, sumCents, toCents } from "@/lib/money";
import { fmtMonthFull, currentMonth } from "@/lib/dates";
import { calcGoalMetrics } from "@/lib/goals";
import { generateId } from "@/lib/id";
import { ProgressRing } from "@/components/ui/ProgressRing";
import styles from "./GoalSetter.module.css";

type Props = {
  goals: SavingsGoal[];
  savingsLog: SavingsEntry[];
  onAdd: (goal: SavingsGoal) => void;
  onDelete: (id: string) => void;
};

export function GoalSetter({ goals, savingsLog, onAdd, onDelete }: Props) {
  const [showForm, setShowForm] = useState(false);
  const [labelStr, setLabelStr] = useState("");
  const [targetStr, setTargetStr] = useState("");
  const [targetDate, setTargetDate] = useState("");

  const currentSaved = sumCents(savingsLog.map((e) => e.amount));
  const month = currentMonth();

  const handleAdd = () => {
    const cents = toCents(targetStr);
    if (!labelStr.trim() || cents <= 0 || !targetDate) return;
    onAdd({
      id: generateId(),
      label: labelStr.trim(),
      targetCents: cents,
      targetDate,
      createdAt: new Date().toISOString(),
    });
    setLabelStr("");
    setTargetStr("");
    setTargetDate("");
    setShowForm(false);
  };

  const handleCancel = () => {
    setLabelStr("");
    setTargetStr("");
    setTargetDate("");
    setShowForm(false);
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h3 className={styles.title}>Savings Goals</h3>
        {!showForm && (
          <button
            type="button"
            className={styles.addBtn}
            onClick={() => setShowForm(true)}
          >
            + Add Goal
          </button>
        )}
      </div>

      <p className={styles.subtitle}>
        Current balance:{" "}
        <strong className={styles.balance}>{fmtMoney(currentSaved)}</strong>
      </p>

      {showForm && (
        <div className={styles.form}>
          <div className={styles.formRow}>
            <label className={styles.formLabel} htmlFor="goal-label">
              Goal name
            </label>
            <input
              id="goal-label"
              className={styles.input}
              type="text"
              placeholder="e.g. Emergency fund"
              value={labelStr}
              onChange={(e) => setLabelStr(e.target.value)}
            />
          </div>
          <div className={styles.formRow}>
            <label className={styles.formLabel} htmlFor="goal-target">
              Target amount ($)
            </label>
            <input
              id="goal-target"
              className={styles.input}
              type="number"
              min="0"
              step="0.01"
              placeholder="0.00"
              value={targetStr}
              onChange={(e) => setTargetStr(e.target.value)}
            />
          </div>
          <div className={styles.formRow}>
            <label className={styles.formLabel} htmlFor="goal-date">
              Target month
            </label>
            <input
              id="goal-date"
              className={styles.input}
              type="month"
              min={month}
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
            />
          </div>
          <div className={styles.formActions}>
            <button
              type="button"
              className={styles.saveBtn}
              onClick={handleAdd}
            >
              Save Goal
            </button>
            <button
              type="button"
              className={styles.cancelBtn}
              onClick={handleCancel}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {goals.length === 0 && !showForm && (
        <p className={styles.empty}>No goals set yet. Add one to track your progress.</p>
      )}

      <div className={styles.goalList}>
        {goals.map((goal) => {
          const metrics = calcGoalMetrics(goal, currentSaved);
          const ringColor =
            metrics.status === "achieved"
              ? "olive"
              : metrics.status === "behind"
              ? "rust"
              : "navy";

          return (
            <div key={goal.id} className={styles.goalCard}>
              <div className={styles.goalLeft}>
                <ProgressRing
                  ratio={metrics.progressRatio}
                  size={64}
                  strokeWidth={7}
                  color={ringColor}
                  label={`${Math.round(metrics.progressRatio * 100)}%`}
                />
              </div>
              <div className={styles.goalBody}>
                <div className={styles.goalTop}>
                  <span className={styles.goalLabel}>{goal.label}</span>
                  <span
                    className={`${styles.statusBadge} ${styles[`status_${metrics.status}`]}`}
                  >
                    {metrics.status === "achieved"
                      ? "Achieved"
                      : metrics.status === "behind"
                      ? "Behind"
                      : "On Track"}
                  </span>
                </div>
                <div className={styles.goalMeta}>
                  <span className={styles.metaItem}>
                    <span className={styles.metaLabel}>Target</span>
                    <span className={styles.metaValue}>
                      {fmtMoney(goal.targetCents)} by {fmtMonthFull(goal.targetDate)}
                    </span>
                  </span>
                  {metrics.status !== "achieved" && (
                    <span className={styles.metaItem}>
                      <span className={styles.metaLabel}>Need/mo</span>
                      <span className={styles.metaValue}>
                        {fmtMoney(metrics.monthlyContributionNeeded)}
                      </span>
                    </span>
                  )}
                  {metrics.status !== "achieved" && metrics.monthsRemaining > 0 && (
                    <span className={styles.metaItem}>
                      <span className={styles.metaLabel}>Months left</span>
                      <span className={styles.metaValue}>
                        {metrics.monthsRemaining}
                      </span>
                    </span>
                  )}
                </div>
              </div>
              <button
                type="button"
                className={styles.deleteBtn}
                onClick={() => onDelete(goal.id)}
                aria-label={`Delete goal: ${goal.label}`}
              >
                ×
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
