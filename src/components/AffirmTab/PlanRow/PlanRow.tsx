import React, { useState } from "react";
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
  const [confirmDelete, setConfirmDelete] = useState(false);

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

      {/* Total owed */}
      <td className={`${styles.td} ${styles.tdTotalOwed}`}>
        <span className={styles.totalOwedAmount}>{fmtMoney(totalOwed)}</span>
        {confirmDelete ? (
          <span className={styles.deleteConfirm}>
            <button
              className={styles.btnConfirmDelete}
              onClick={() => { onDelete(plan.id); setConfirmDelete(false); }}
            >
              Delete
            </button>
            <button
              className={styles.btnCancelDelete}
              onClick={() => setConfirmDelete(false)}
            >
              Cancel
            </button>
          </span>
        ) : (
          <button
            className={styles.btnDelete}
            onClick={() => setConfirmDelete(true)}
            aria-label={`Delete ${plan.label}`}
            title="Delete plan"
          >
            <svg width="12" height="13" viewBox="0 0 12 13" fill="currentColor" aria-hidden="true">
              <rect x="4" y="0" width="4" height="1.5" rx="0.75"/>
              <rect x="0.5" y="2" width="11" height="1.5" rx="0.75"/>
              <path d="M1.8 5h8.4l-.75 6.75A.75.75 0 019.7 12.5H2.3a.75.75 0 01-.75-.75L1.8 5z"/>
            </svg>
          </button>
        )}
      </td>
    </tr>
  );
});
