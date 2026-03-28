import type { InstallmentPlan, KiasCheckEntry, PaycheckWeek } from "@/types";
import { getAffirmTotalForMonth } from "@/lib/affirm";
import { fmtMoney, sumCents } from "@/lib/money";
import { calcCheckBaseline, projectMonthlyKiasPay } from "@/lib/projection";
import { currentMonth, advanceMonth, fmtMonthLabel } from "@/lib/dates";
import styles from "./PaycheckTab.module.css";

type Props = {
  plans: InstallmentPlan[];
  checkLog: KiasCheckEntry[];
  paycheck: PaycheckWeek[];
};

export function SavingsProjection({ plans, checkLog, paycheck }: Props) {
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

  return (
    <div className={styles.projection}>
      <h3 className={styles.panelTitle}>12-Month Savings Projection</h3>
      <p className={styles.projectionNote}>
        Based on Kia&apos;s average check of {fmtMoney(baseline.average)}/week
        (low: {fmtMoney(baseline.low)}).
      </p>

      <div className={styles.tableWrapper}>
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
              const projIncome = projectMonthlyKiasPay(baseline.average);
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
