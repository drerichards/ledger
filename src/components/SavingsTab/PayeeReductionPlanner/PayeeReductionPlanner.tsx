"use client";

import type { InstallmentPlan } from "@/types";
import { fmtMoney, sumCents } from "@/lib/money";
import { fmtMonthFull, currentMonth, monthsBetween } from "@/lib/dates";
import { getAffirmTotalForMonth } from "@/lib/affirm";
import styles from "./PayeeReductionPlanner.module.css";

type Props = {
  plans: InstallmentPlan[];
};

/**
 * Affirm Payee Reduction Planner.
 *
 * Shows only Affirm plans (from the InstallmentPlan list), sorted by end date
 * ascending so the next-to-go plan is most prominent. Displays:
 * - Remaining months until payoff
 * - End date
 * - Monthly amount freed when this plan ends
 * - Cumulative view: "By [Date], Affirm burden drops from $X → $Y"
 */
export function PayeeReductionPlanner({ plans }: Props) {
  const month = currentMonth();

  // Only plans still active (not yet ended)
  const activePlans = plans
    .filter((p) => p.end >= month)
    .sort((a, b) => a.end.localeCompare(b.end));

  const currentBurden = getAffirmTotalForMonth(plans, month);

  if (activePlans.length === 0) {
    return (
      <div className={styles.container}>
        <h3 className={styles.title}>Affirm Payoff Timeline</h3>
        <p className={styles.empty}>All Affirm plans are paid off.</p>
      </div>
    );
  }

  // Build cumulative burden milestones: as each plan ends, burden drops
  const milestones = buildMilestones(activePlans, currentBurden);

  return (
    <div className={styles.container}>
      <h3 className={styles.title}>Affirm Payoff Timeline</h3>
      <p className={styles.subtitle}>
        Current burden:{" "}
        <strong className={styles.amount}>{fmtMoney(currentBurden)}/mo</strong>
      </p>

      <div className={styles.planList}>
        {activePlans.map((plan) => {
          const monthsLeft = monthsBetween(month, plan.end);
          const isThisMonth = plan.end === month;

          return (
            <div
              key={plan.id}
              className={`${styles.planCard} ${isThisMonth ? styles.planCardFinal : ""}`}
            >
              <div className={styles.planHeader}>
                <span className={styles.planLabel}>{plan.label}</span>
                {isThisMonth && (
                  <span className={styles.finalBadge}>FINAL</span>
                )}
              </div>
              <div className={styles.planMeta}>
                <span className={styles.metaItem}>
                  <span className={styles.metaLabel}>Ends</span>
                  <span className={styles.metaValue}>
                    {fmtMonthFull(plan.end)}
                  </span>
                </span>
                <span className={styles.metaDivider} />
                <span className={styles.metaItem}>
                  <span className={styles.metaLabel}>Months left</span>
                  <span className={styles.metaValue}>
                    {isThisMonth ? "Last month" : monthsLeft}
                  </span>
                </span>
                <span className={styles.metaDivider} />
                <span className={styles.metaItem}>
                  <span className={styles.metaLabel}>Freed up</span>
                  <span className={`${styles.metaValue} ${styles.freed}`}>
                    {fmtMoney(plan.mc)}/mo
                  </span>
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Cumulative burden projection */}
      <div className={styles.projection}>
        <h4 className={styles.projectionTitle}>Cumulative Payoff</h4>
        <div className={styles.milestoneList}>
          {milestones.map((m) => (
            <div key={m.month} className={styles.milestone}>
              <span className={styles.milestoneDate}>
                {fmtMonthFull(m.month)}
              </span>
              <span className={styles.milestoneBurden}>
                <span className={styles.fromBurden}>
                  {fmtMoney(m.fromCents)}
                </span>
                <span className={styles.arrow}> → </span>
                <span
                  className={`${styles.toBurden} ${m.toCents === 0 ? styles.toBurdenZero : ""}`}
                >
                  {m.toCents === 0 ? "$0" : fmtMoney(m.toCents)}
                </span>
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

type BurdenMilestone = {
  month: string;
  fromCents: number;
  toCents: number;
};

function buildMilestones(
  sortedPlans: InstallmentPlan[],
  initialBurden: number,
): BurdenMilestone[] {
  const milestones: BurdenMilestone[] = [];
  let remaining = initialBurden;

  // Group plans ending in the same month
  const byMonth = new Map<string, InstallmentPlan[]>();
  for (const plan of sortedPlans) {
    const group = byMonth.get(plan.end) ?? [];
    group.push(plan);
    byMonth.set(plan.end, group);
  }

  for (const [month, plansEnding] of [...byMonth.entries()].sort()) {
    const freed = sumCents(plansEnding.map((p) => p.mc));
    milestones.push({
      month,
      fromCents: remaining,
      toCents: Math.max(0, remaining - freed),
    });
    remaining = Math.max(0, remaining - freed);
  }

  return milestones;
}
