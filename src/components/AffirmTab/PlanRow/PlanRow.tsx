import React from "react";
import type { InstallmentPlan } from "@/types";
import { fmtMoney } from "@/lib/money";
import { isFinalMonth } from "@/lib/affirm";
import styles from "../AffirmTab.module.css";

type Props = {
  plan: InstallmentPlan;
  months: string[];
  totalOwed: number;
  onDelete: (id: string) => void;
};

/**
 * One row in the Affirm grid (pure presenter).
 * All derivation (totalOwed, active month ranges) happens in useAffirmTabState
 * and is passed in as props — this component only renders.
 */
export const PlanRow = React.memo(function PlanRow({
  plan,
  months,
  totalOwed,
  onDelete,
}: Props) {
  return (
    <tr className={styles.row}>
      {/* Plan label */}
      <td className={`${styles.td} ${styles.tdPlan}`}>
        <span className={styles.planLabel}>{plan.label}</span>
        <span className={styles.planRate}>{fmtMoney(plan.mc)}/mo</span>
      </td>

      {/* Monthly cells */}
      {months.map((m) => {
        const isActive = plan.start <= m && plan.end >= m;
        const isFinal = isFinalMonth(plan, m);

        if (!isActive) {
          return <td key={m} className={styles.tdInactive} />;
        }

        return (
          <td
            key={m}
            className={`${styles.tdActive} ${isFinal ? styles.tdFinal : ""}`}
          >
            <span className={styles.cellAmount}>{fmtMoney(plan.mc)}</span>
            {isFinal && (
              <span className={styles.finalBadge} title="Last scheduled payment">
                FINAL
              </span>
            )}
          </td>
        );
      })}

      {/* Total owed (pre-computed by hook, not derived here) */}
      <td className={`${styles.td} ${styles.tdTotalOwed}`}>
        {fmtMoney(totalOwed)}
      </td>

      {/* Delete */}
      <td className={`${styles.td} ${styles.tdDelete}`}>
        <button
          className={styles.btnDanger}
          onClick={() => onDelete(plan.id)}
          aria-label={`Delete ${plan.label}`}
        >
          Del
        </button>
      </td>
    </tr>
  );
});
