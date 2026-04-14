import { useState } from "react";
import type { InstallmentPlan, KiasCheckEntry, PaycheckWeek, SavingsEntry, SavingsGoal } from "@/types";
import { getAffirmTotalForMonth } from "@/lib/affirm";
import { fmtMoney } from "@/lib/money";
import {
  calcCheckBaseline,
  projectMonthlyKiasPay,
  getWeeklyBaseline,
  type ProjectionScenario,
} from "@/lib/projection";
import { currentMonth, advanceMonth, fmtMonthLabel } from "@/lib/dates";
import styles from "./SavingsProjection.module.css";

type Props = {
  plans: InstallmentPlan[];
  checkLog: KiasCheckEntry[];
  paycheck: PaycheckWeek[];
  goals?: SavingsGoal[];
  savingsLog?: SavingsEntry[];
};

export function SavingsProjection({ plans, checkLog, paycheck, goals = [], savingsLog = [] }: Props) {
  const [scenario, setScenario] = useState<ProjectionScenario>("conservative");
  const baseline = calcCheckBaseline(checkLog);
  if (!baseline) {
    return (
      <div className={styles.projectionEmpty}>
        Log at least one of Kia&apos;s checks to see a savings projection.
      </div>
    );
  }

  const months = Array.from({ length: 12 }, (_, i) =>
    advanceMonth(currentMonth(), i),
  );

  // First month within the 12-month window where Affirm burden reaches zero
  const affirmNow = getAffirmTotalForMonth(plans, months[0]);
  const clearanceMonth = affirmNow > 0
    ? (months.find((m) => getAffirmTotalForMonth(plans, m) === 0) ?? null)
    : null;

  // Goal-connect: after Affirm clears, how long to fund the nearest unfunded goal?
  const totalSaved = savingsLog.reduce((sum, e) => sum + e.amount, 0);
  const nearestGoal = goals.length > 0
    ? goals
        .filter((g) => g.targetCents > totalSaved)
        .sort((a, b) => {
          if (a.priority !== undefined && b.priority !== undefined) return a.priority - b.priority;
          return a.targetCents - b.targetCents; // fallback: smallest goal first
        })[0] ?? null
    : null;
  const goalConnectMonths = (nearestGoal && affirmNow > 0)
    ? Math.ceil((nearestGoal.targetCents - totalSaved) / affirmNow)
    : null;

  // Fixed recurring bill allocations per week — pulled from the most recently entered week
  const latestWeek = paycheck[paycheck.length - 1];
  const weeklyFixed = latestWeek
    ? latestWeek.storage +
      latestWeek.rent +
      latestWeek.jazmin +
      latestWeek.dre +
      latestWeek.paypalCC +
      latestWeek.deductions
    : 0;
  const monthlyFixed = weeklyFixed * 4;
  const affirmMonthlyTotal = affirmNow;

  return (
    <div className={styles.projection}>
      <h3 className={styles.panelTitle}>12-Month Savings Projection</h3>

      <div className={styles.scenarioToggle}>
        {(["conservative", "average", "optimistic"] as ProjectionScenario[]).map((s) => (
          <button
            key={s}
            className={`${styles.scenarioBtn} ${scenario === s ? styles.scenarioBtnActive : ""}`}
            onClick={() => setScenario(s)}
          >
            {s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>

      <p className={styles.projectionNote}>
        {scenario === "conservative" &&
          `Conservative: based on Kia's lowest check of ${fmtMoney(baseline.low)}/week.`}
        {scenario === "average" &&
          `Average: based on Kia's mean check of ${fmtMoney(baseline.average)}/week.`}
        {scenario === "optimistic" &&
          `Optimistic: based on Kia's highest check of ${fmtMoney(baseline.high)}/week.`}
      </p>

      {clearanceMonth && (
        <div className={styles.bottomLine}>
          <span className={styles.bottomLineLabel}>
            Affirm clears in <strong>{fmtMonthLabel(clearanceMonth)}</strong>
          </span>
          <span className={styles.bottomLineStat}>+{fmtMoney(affirmNow)}/mo freed</span>
        </div>
      )}

      {clearanceMonth && nearestGoal && goalConnectMonths !== null && (
        <div className={styles.goalConnect}>
          <span className={styles.goalConnectEmoji}>🎯</span>
          <span className={styles.goalConnectText}>
            Redirect that{" "}
            <span className={styles.goalConnectMono}>{fmtMoney(affirmNow)}/mo</span> to savings
            after clearance →{" "}
            <strong>{nearestGoal.label}</strong> funded in{" "}
            <strong>{goalConnectMonths} month{goalConnectMonths !== 1 ? "s" : ""}</strong>
          </span>
        </div>
      )}

      {scenario === "conservative" &&
        baseline.low < affirmMonthlyTotal + monthlyFixed && (
          <div className={styles.warning}>
            ⚠️ On a low week, Kia&apos;s check may not cover all allocations.
          </div>
        )}

      <div className={styles.ctaCallout}>
        <span className={styles.ctaCalloutIcon}>💡</span>
        <div className={styles.ctaCalloutBody}>
          <p className={styles.ctaCalloutTitle}>What this means for you</p>
          <p className={styles.ctaCalloutText}>
            <strong>Est. Remainder</strong> is money that&apos;s yours after the bills are paid. It won&apos;t go to savings on its own — you have to move it on purpose.
          </p>
          <p className={styles.ctaCalloutAction}>
            → The habit: move some of this money to a savings goal before spending it on anything else. Even $20 a month adds up.
            {clearanceMonth && ` Good news: once Affirm is paid off (${fmtMonthLabel(clearanceMonth)}), you&apos;ll have even more left over — start thinking now about what you want to do with it.`}
          </p>
        </div>
      </div>

      <div className={styles.projTableWrapper}>
        <table className={styles.projTable}>
          <thead>
            <tr>
              <th className={styles.th}>Month</th>
              <th className={styles.th}>Projected Income</th>
              <th className={styles.th}>Affirm</th>
              <th className={styles.th}>Fixed Bills</th>
              <th className={styles.th}>Est. Remainder</th>
            </tr>
          </thead>
          <tbody>
            {months.map((month) => {
              const weeklyBaseline = getWeeklyBaseline(baseline, scenario);
              const projIncome = projectMonthlyKiasPay(weeklyBaseline);
              const affirmTotal = getAffirmTotalForMonth(plans, month);
              const remainder = projIncome - affirmTotal - monthlyFixed;

              return (
                <tr key={month} className={styles.row}>
                  <td className={styles.td}>{fmtMonthLabel(month)}</td>
                  <td className={`${styles.td} ${styles.mono}`}>
                    {fmtMoney(projIncome)}
                  </td>
                  <td className={`${styles.td} ${styles.mono}`}>
                    {fmtMoney(affirmTotal)}
                  </td>
                  <td className={`${styles.td} ${styles.mono}`}>
                    {fmtMoney(monthlyFixed)}
                  </td>
                  <td
                    className={`${styles.td} ${styles.mono} ${remainder < 0 ? styles.negative : styles.positive}`}
                  >
                    {fmtMoney(remainder)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
