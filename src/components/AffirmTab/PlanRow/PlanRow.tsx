import React, { useState } from "react";
import type { InstallmentPlan } from "@/types";
import { fmtMoney } from "@/lib/money";
import { isFinalMonth } from "@/lib/affirm";
import styles from "../AffirmTab.module.css";

type Props = {
  plan: InstallmentPlan;
  months: string[];
  totalOwed: number;
  onEdit: (plan: InstallmentPlan) => void;
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
  onEdit,
  onDelete,
}: Props) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const planLabel = plan.label.replace(/^Affirm\s+[—-]\s*/i, "");

  return (
    <tr className={styles.row}>
      {/* Plan label */}
      <td className={`${styles.td} ${styles.tdPlan}`}>
        <span className={styles.planLabel}>{planLabel}</span>
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
                LAST
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
          <span className={styles.deleteConfirm}>
            <button
              className={styles.btnEdit}
              onClick={() => onEdit(plan)}
              aria-label={`Edit ${planLabel}`}
              title="Edit plan"
            >
              <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                <path d="M11.5 1.5a1.5 1.5 0 0 1 2.121 0l.879.879a1.5 1.5 0 0 1 0 2.121l-8 8a.5.5 0 0 1-.177.118l-3.5 1.5a.5.5 0 0 1-.638-.638l1.5-3.5a.5.5 0 0 1 .118-.177z"/>
              </svg>
            </button>
            <button
              className={styles.btnDelete}
              onClick={() => setConfirmDelete(true)}
              aria-label={`Delete ${planLabel}`}
              title="Delete plan"
            >
              <svg width="12" height="13" viewBox="0 0 12 13" fill="currentColor" aria-hidden="true">
                <rect x="4" y="0" width="4" height="1.5" rx="0.75"/>
                <rect x="0.5" y="2" width="11" height="1.5" rx="0.75"/>
                <path d="M1.8 5h8.4l-.75 6.75A.75.75 0 019.7 12.5H2.3a.75.75 0 01-.75-.75L1.8 5z"/>
              </svg>
            </button>
          </span>
        )}
      </td>
    </tr>
  );
});
