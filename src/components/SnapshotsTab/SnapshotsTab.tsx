"use client";

import type { MonthSnapshot } from "@/types";
import { fmtMoney } from "@/lib/money";
import { fmtMonthFull } from "@/lib/dates";
import styles from "./SnapshotsTab.module.css";

type Props = {
  snapshots: MonthSnapshot[];
};

const _CARD_COLORS = ["olive", "navy", "rust", "gold"] as const;
type CardColor = typeof _CARD_COLORS[number];

function computeTrend(snapshots: MonthSnapshot[]) {
  if (snapshots.length === 0) return null;

  const chronological = [...snapshots].sort((a, b) => a.month.localeCompare(b.month));

  let streak = 0;
  for (let i = chronological.length - 1; i >= 0; i--) {
    if (chronological[i].shortfall <= 0) streak++;
    else break;
  }

  const bestSnap = chronological.reduce((best, s) => s.shortfall < best.shortfall ? s : best);
  const bestIsSurplus = bestSnap.shortfall <= 0;
  const totalSaved = chronological.reduce((sum, s) => sum + s.savingsMoved, 0);
  const avgSurplus = Math.round(
    chronological.reduce((sum, s) => sum - s.shortfall, 0) / chronological.length
  );

  return { streak, bestSnap, bestIsSurplus, totalSaved, avgSurplus };
}

function getCardColor(snap: MonthSnapshot, bestMonth: string | undefined, index: number): CardColor {
  if (bestMonth && snap.month === bestMonth) return "olive";
  if (snap.shortfall > 0) return "rust";
  // Reserve olive+rust for semantic states. Neutral surplus months alternate navy/gold.
  return index % 2 === 0 ? "navy" : "gold";
}

export function SnapshotsTab({ snapshots }: Props) {
  const sorted = [...snapshots].sort((a, b) => b.month.localeCompare(a.month));
  const trend = computeTrend(snapshots);

  return (
    <div className={styles.container}>
      {snapshots.length === 0 ? (
        <p className={styles.empty}>
          No monthly summaries yet. Use &apos;Month Summary&apos; in the Bills tab after closing out a month.
        </p>
      ) : (
        <>
          {trend && (
            <div className={styles.trendBar}>
              {trend.streak >= 2 && (
                <div className={styles.trendStat}>
                  <span className={styles.trendEmoji}>📈</span>
                  <span className={styles.trendLabel}>
                    <strong>{trend.streak}</strong>-month surplus streak
                  </span>
                  <span className={styles.trendTooltip}>
                    You&apos;ve stayed under budget for {trend.streak} months in a row — income exceeded bills every month.
                  </span>
                </div>
              )}
              {trend.streak === 1 && (
                <div className={styles.trendStat}>
                  <span className={styles.trendEmoji}>✅</span>
                  <span className={styles.trendLabel}>Surplus last month — keep it going</span>
                  <span className={styles.trendTooltip}>
                    Last month ended with more income than bills. One more and you start a streak!
                  </span>
                </div>
              )}
              {trend.bestIsSurplus && (
                <div className={styles.trendStat}>
                  <span className={styles.trendEmoji}>🏆</span>
                  <span className={styles.trendLabel}>
                    Best month: <strong>{fmtMonthFull(trend.bestSnap.month)}</strong>{" "}
                    <span className={styles.trendMono}>+{fmtMoney(Math.abs(trend.bestSnap.shortfall))}</span>
                  </span>
                  <span className={styles.trendTooltip}>
                    {fmtMonthFull(trend.bestSnap.month)} is your highest-surplus month on record with +{fmtMoney(Math.abs(trend.bestSnap.shortfall))} left over after all bills.
                  </span>
                </div>
              )}
              <div className={styles.trendStat}>
                <span className={styles.trendEmoji}>💰</span>
                <span className={styles.trendLabel}>
                  Total to savings:{" "}
                  <span className={styles.trendMono}>{fmtMoney(trend.totalSaved)}</span>
                </span>
                <span className={styles.trendTooltip}>
                  Sum of all savings entries you&apos;ve logged across every recorded month.
                </span>
              </div>
              <div className={styles.trendStat}>
                <span className={styles.trendEmoji}>📊</span>
                <span className={styles.trendLabel}>
                  Avg surplus:{" "}
                  <span className={styles.trendMono}>
                    {trend.avgSurplus >= 0 ? "+" : "−"}{fmtMoney(Math.abs(trend.avgSurplus))}/mo
                  </span>
                </span>
                <span className={styles.trendTooltip}>
                  Average monthly difference between income and total bills across all {snapshots.length} recorded {snapshots.length === 1 ? "month" : "months"}.
                  {trend.avgSurplus < 0 ? " You're spending more than you earn on average — worth investigating." : ""}
                </span>
              </div>
            </div>
          )}

          <div className={styles.snapshotGrid}>
            {sorted.map((snap, i) => {
              const isBest = trend?.bestSnap.month === snap.month && trend.bestIsSurplus;
              const isSurplus = snap.shortfall <= 0;
              const color = getCardColor(snap, trend?.bestIsSurplus ? trend.bestSnap.month : undefined, i);
              const paidPct = snap.totalBilled > 0
                ? Math.round((snap.totalPaid / snap.totalBilled) * 100)
                : 0;

              return (
                <div key={snap.month} className={styles.snapshotCard}>
                  <div className={`${styles.snapshotHdr} ${styles[`snapshotHdr_${color}`]}`}>
                    <div className={styles.snapshotMonth}>{fmtMonthFull(snap.month)}</div>
                    <div className={styles.snapshotLabel}>
                      {isBest ? "Best Month 🏆" : isSurplus ? "Surplus ✓" : "Shortfall"}
                    </div>
                  </div>
                  <div className={styles.snapshotBody}>
                    <div className={styles.snapshotRow}>
                      <span>Income</span>
                      <span className={styles.snapshotMono}>{fmtMoney(snap.kiasPayActual)}</span>
                    </div>
                    <div className={styles.snapshotRow}>
                      <span>Bills</span>
                      <span className={`${styles.snapshotMono} ${styles.snapshotOchre}`}>{fmtMoney(snap.totalBilled)}</span>
                    </div>
                    <div className={styles.snapshotRow}>
                      <span>Savings</span>
                      <span className={`${styles.snapshotMono} ${styles.snapshotOlive}`}>{fmtMoney(snap.savingsMoved)}</span>
                    </div>
                    <div className={styles.snapshotRow}>
                      <span>Net</span>
                      <span>
                        <span className={`${styles.snapshotPill} ${isSurplus ? styles.snapshotPillSurplus : styles.snapshotPillShortfall}`}>
                          {isSurplus ? "+" : "−"}{fmtMoney(Math.abs(snap.shortfall))}
                        </span>
                      </span>
                    </div>
                    <div className={styles.snapshotPaidBar}>
                      <div
                        className={styles.snapshotPaidFill}
                        style={{ width: `${Math.min(paidPct, 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
