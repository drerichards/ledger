"use client";

import type { InstallmentPlan } from "@/types";
import { fmtMoney } from "@/lib/money/money";
import { fmtMonthLabel, currentMonth, getMonthRange } from "@/lib/dates/dates";
import { getAffirmTotalForMonth } from "@/lib/affirm/affirm";
import { AffirmBurdenChart } from "./AffirmBurdenChart";
import { InsightCard } from "@/components/shared/InsightCard";
import { affirmPayoffInsights } from "@/lib/insights/debtInsights";
import styles from "./PayeeReductionPlanner.module.css";

type Props = {
  plans: InstallmentPlan[];
};

type MonthRow = {
  month: string;
  owed: number;
  relief: number; // positive = burden dropped vs prior month
  isFinal: boolean;
};

export function PayeeReductionPlanner({ plans }: Props) {
  const month = currentMonth();

  const activePlans = plans.filter((p) => p.end >= month);

  if (activePlans.length === 0) {
    return (
      <div className={styles.container}>
        <p className={styles.sectionLabel}>Affirm Payoff Timeline</p>
        <p className={styles.empty}>All Affirm plans are paid off.</p>
      </div>
    );
  }

  const currentBurden = getAffirmTotalForMonth(plans, month);
  const lastEnd = activePlans.reduce(
    (max, p) => (p.end > max ? p.end : max),
    activePlans[0].end,
  );
  const allMonths = getMonthRange(month, lastEnd);

  const rows: MonthRow[] = allMonths.map((m, i) => {
    const owed = getAffirmTotalForMonth(plans, m);
    const prevOwed =
      i === 0 ? owed : getAffirmTotalForMonth(plans, allMonths[i - 1]);
    const relief = Math.max(0, prevOwed - owed);
    return { month: m, owed, relief, isFinal: owed === 0 };
  });

  const chartData = rows.map((r) => ({
    month: r.month,
    owed: r.owed,
    isStep: r.relief > 0,
  }));

  const insights = affirmPayoffInsights(rows);

  // Only show milestone rows — months where burden drops or hits $0.
  // Flat months are already covered by the chart above.
  const milestoneRows = rows.filter((r) => r.relief > 0 || r.isFinal);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <span className={styles.sectionLabel}>Affirm Payoff Timeline</span>
        <span className={styles.burden}>{fmtMoney(currentBurden)}/mo now</span>
      </div>

      <AffirmBurdenChart data={chartData} />

      {milestoneRows.length > 0 && (
        <table className={styles.table}>
          <thead>
            <tr>
              <th className={styles.th}>When</th>
              <th className={`${styles.th} ${styles.thNum}`}>New burden</th>
              <th className={`${styles.th} ${styles.thNum}`}>Freed up</th>
            </tr>
          </thead>
          <tbody>
            {milestoneRows.map((row) => (
              <tr
                key={row.month}
                className={row.isFinal ? styles.rowFinal : styles.rowStep}
              >
                <td className={styles.td}>
                  <span className={row.isFinal ? styles.monthFinal : styles.monthStep}>
                    {fmtMonthLabel(row.month)}
                  </span>
                </td>
                <td className={`${styles.td} ${styles.tdNum}`}>
                  <span className={row.isFinal ? styles.zero : styles.mono}>
                    {row.isFinal ? "$0" : fmtMoney(row.owed)}
                  </span>
                </td>
                <td className={`${styles.td} ${styles.tdNum}`}>
                  {row.relief > 0 ? (
                    <span className={styles.freed}>↓ {fmtMoney(row.relief)}</span>
                  ) : (
                    <span className={styles.dim}>—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {insights.length > 0 && (
        <div className={styles.insights}>
          {insights.map((insight, i) => (
            <InsightCard key={i} {...insight} />
          ))}
        </div>
      )}
    </div>
  );
}
