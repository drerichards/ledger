"use client";

import { useState } from "react";
import type { SavingsGoal, SavingsEntry } from "@/types";
import { fmtMoney, sumCents, toCents } from "@/lib/money";
import { currentMonth } from "@/lib/dates";
import { calcGoalMetrics } from "@/lib/goals";
import { generateId } from "@/lib/id";
import { Progress } from "@/components/ui/progress";
import { Slider } from "@/components/ui/slider";
import styles from "./GoalSetter.module.css";

type Props = {
  goals: SavingsGoal[];
  savingsLog: SavingsEntry[];
  onAdd: (goal: SavingsGoal) => void;
  onDelete: (id: string) => void;
};

// ── Individual goal card with local contribution slider ────────────────────

type GoalCardProps = {
  goal: SavingsGoal;
  currentSavedCents: number;
  onDelete: (id: string) => void;
};

function GoalCard({ goal, currentSavedCents, onDelete }: GoalCardProps) {
  const metrics = calcGoalMetrics(goal, currentSavedCents);
  const pct = Math.round(metrics.progressRatio * 100);

  // Local slider — projects ETA at a hypothetical monthly contribution.
  // Defaults to what the user actually needs; dragging explores scenarios.
  const defaultContrib = Math.max(5000, Math.round(metrics.monthlyContributionNeeded / 2500) * 2500);
  const [contrib, setContrib] = useState(defaultContrib);

  const remaining = Math.max(0, goal.targetCents - currentSavedCents);
  const projMonths = contrib > 0 ? Math.ceil(remaining / contrib) : null;

  const etaLabel = (() => {
    if (metrics.status === "achieved") return "Goal reached! 🎉";
    if (projMonths === null) return "Set a monthly amount to see ETA";
    const d = new Date();
    d.setMonth(d.getMonth() + projMonths);
    const mo = d.toLocaleString("default", { month: "short", year: "numeric" });
    return `At ${fmtMoney(contrib)}/mo → funded in ${projMonths} months (${mo})`;
  })();

  const statusClass =
    metrics.status === "achieved"
      ? styles.statusAchieved
      : metrics.status === "behind"
      ? styles.statusBehind
      : styles.statusOnTrack;

  const progressVariant: "olive" | "rust" =
    metrics.status === "behind" ? "rust" : "olive";

  return (
    <div className={styles.goalCard}>
      <div className={styles.goalCardHeader}>
        <div>
          <p className={styles.goalName}>{goal.label}</p>
          <p className={styles.goalTarget}>
            {fmtMoney(currentSavedCents)} saved · {fmtMoney(goal.targetCents)} target
          </p>
        </div>
        <div className={styles.goalCardRight}>
          <span className={`${styles.pctBadge} ${statusClass}`}>{pct}%</span>
          <button
            type="button"
            className={styles.deleteBtn}
            onClick={() => onDelete(goal.id)}
            aria-label={`Delete goal: ${goal.label}`}
          >
            ×
          </button>
        </div>
      </div>

      <Progress value={pct} variant={progressVariant} className={styles.progressBar} />

      <p className={styles.goalEta}>{etaLabel}</p>

      {metrics.status !== "achieved" && (
        <div className={styles.sliderSection}>
          <div className={styles.sliderHeader}>
            <span className={styles.sliderLabel}>Monthly contribution</span>
            <span className={styles.sliderVal}>{fmtMoney(contrib)}</span>
          </div>
          <Slider
            min={5000}
            max={60000}
            step={2500}
            value={[contrib]}
            onValueChange={([v]) => setContrib(v)}
          />
          <div className={styles.sliderTicks}>
            <span>$50/mo</span>
            <span>$600/mo</span>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main GoalSetter ────────────────────────────────────────────────────────

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

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h3 className={styles.title}>Savings Goals</h3>
        {!showForm && (
          <button type="button" className={styles.addBtn} onClick={() => setShowForm(true)}>
            + Add Goal
          </button>
        )}
      </div>

      {showForm && (
        <div className={styles.form}>
          <div className={styles.formRow}>
            <label className={styles.formLabel} htmlFor="goal-label">Goal name</label>
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
            <label className={styles.formLabel} htmlFor="goal-target">Target amount ($)</label>
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
            <label className={styles.formLabel} htmlFor="goal-date">Target month</label>
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
            <button type="button" className={styles.saveBtn} onClick={handleAdd}>
              Save Goal
            </button>
            <button
              type="button"
              className={styles.cancelBtn}
              onClick={() => {
                setLabelStr(""); setTargetStr(""); setTargetDate(""); setShowForm(false);
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {goals.length === 0 && !showForm ? (
        <p className={styles.empty}>No goals yet — add one to start tracking.</p>
      ) : (
        <div className={styles.goalList}>
          {goals.map((goal) => (
            <GoalCard
              key={goal.id}
              goal={goal}
              currentSavedCents={currentSaved}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}
